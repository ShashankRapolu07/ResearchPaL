import os
import re
import csv
import json
import httpx
import py7zr
import base64
import shutil
import asyncio
import zipfile
import tempfile
import aiofiles
import pandas as pd
from dotenv import load_dotenv
from pydantic import SecretStr
from typing import Dict, Any, Union, List, Optional, Tuple
from tenacity import AsyncRetrying, wait_exponential_jitter, stop_after_attempt, retry_if_exception_type
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from adobe.pdfservices.operation.auth.service_principal_credentials import ServicePrincipalCredentials
from adobe.pdfservices.operation.pdf_services import PDFServices
from adobe.pdfservices.operation.pdf_services_media_type import PDFServicesMediaType
from adobe.pdfservices.operation.pdfjobs.params.extract_pdf.extract_pdf_params import ExtractPDFParams
from adobe.pdfservices.operation.pdfjobs.params.extract_pdf.extract_element_type import ExtractElementType
from adobe.pdfservices.operation.pdfjobs.params.extract_pdf.extract_renditions_element_type import ExtractRenditionsElementType
from adobe.pdfservices.operation.pdfjobs.jobs.extract_pdf_job import ExtractPDFJob
from adobe.pdfservices.operation.pdfjobs.result.extract_pdf_result import ExtractPDFResult
from adobe.pdfservices.operation.io.cloud_asset import CloudAsset
from adobe.pdfservices.operation.io.stream_asset import StreamAsset
from adobe.pdfservices.operation.exception.exceptions import ServiceApiException, ServiceUsageException, SdkException
from adobe.pdfservices.operation.pdfjobs.params.extract_pdf.table_structure_type import TableStructureType

from services import gcs_service

load_dotenv()

PARAGRAPH_LENGTH_MIN = 100
REFERENCE_LENGTH_MIN = 10
IMAGE_SIZE_THRESOLD = 5 * 1024 # 1KB
MAX_FILE_READING_CONCURRENCY = 20
MAX_PDF_SIZE = 50 * 1024 * 1024 # 50MB

router = APIRouter()

semaphore = asyncio.Semaphore(MAX_FILE_READING_CONCURRENCY)

def _remove_file(path: str):
    try:
        os.remove(path)
    except Exception:
        pass

async def _write_temp_file(content: bytes, suffix=".pdf") -> str:
    def _write_file():
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_file.write(content)
            return tmp_file.name
    return await run_in_threadpool(_write_file)

async def _read_pdf_async(pdf_file_path: str) -> bytes:
    async with aiofiles.open(pdf_file_path, "rb") as f:
        return await f.read()

async def _write_temp_file_async(data: bytes) -> str:
    loop = asyncio.get_running_loop()
    fd, temp_path = await loop.run_in_executor(None, tempfile.mkstemp, ".zip")
    os.close(fd)
    async with aiofiles.open(temp_path, "wb") as f:
        await f.write(data)
    return temp_path

async def _create_7z_async(temp_folder: str, sevenz_file_path: str):
    def _create_7z(temp_folder: str, sevenz_file_path: str):
        with py7zr.SevenZipFile(sevenz_file_path, 'w') as archive:
            archive.writeall(temp_folder, arcname='.')
    await run_in_threadpool(_create_7z, temp_folder, sevenz_file_path)

async def _extract_zip_async(zip_path: str) -> str:
    loop = asyncio.get_running_loop()
    temp_extracted_dir = await loop.run_in_executor(None, tempfile.mkdtemp)
    def _extract():
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_extracted_dir)
    await loop.run_in_executor(None, _extract)
    return temp_extracted_dir

def _is_image_size_valid(image_path: str, base_path: str) -> bool:
    file_size = os.path.getsize(os.path.join(base_path, image_path))
    return file_size > IMAGE_SIZE_THRESOLD

async def _convert_image_to_base64(image_path: str) -> str:
    async with aiofiles.open(image_path, 'rb') as image_file:
        image_data = await image_file.read()
        encoded_string = base64.b64encode(image_data).decode('utf-8')
    return encoded_string

async def _read_table_data_async(table_path: str) -> str:
    async with aiofiles.open(table_path, 'r') as table_file:
        content = await table_file.read()
    lines = content.splitlines()
    reader = csv.reader(lines)
    table_data = '\n'.join([','.join(map(str, row)) for row in reader])
    return table_data

def _sanitize_gcs_object_name(pdf_url: str) -> str:
    encoded = base64.urlsafe_b64encode(pdf_url.encode('utf-8')).decode('utf-8')
    return f"{encoded}.7z"

def _upload_and_cleanup_in_background(
    file_path: str,
    blob_name: str,
    temp_extracted_path: str,
    client_folder_path: str
):
    try:
        gcs_service.upload_file_to_bucket(file_path, blob_name)
        print(f"Uploaded {file_path} to GCS blob {blob_name}.")

        if os.path.exists(file_path):
            os.remove(file_path)

        if os.path.exists(client_folder_path):
            shutil.rmtree(client_folder_path, ignore_errors=True)
        if os.path.exists(temp_extracted_path):
            shutil.rmtree(temp_extracted_path, ignore_errors=True)

    except Exception as e:
        print(f"Error uploading/cleaning up background: {e}")

async def get_advanced_data_from_7z(sevenz_file_path: str) -> Dict[str, Any]:
    extraction_dir = tempfile.mkdtemp()

    def extract_archive():
        with py7zr.SevenZipFile(sevenz_file_path, mode='r') as archive:
            archive.extractall(path=extraction_dir)
    await run_in_threadpool(extract_archive)

    advancedData = {
        "chunks": [],
        "headings": [],
        "labels": [],
        "references": [],
        "images": [],
        "tables": [],
        "paper_details": None
    }

    possible_json_files = {
        "chunks.json": "chunks",
        "headings.json": "headings",
        "labels.json": "labels",
        "references.json": "references",
        "paper_details.json": "paper_details"
    }

    for filename, key in possible_json_files.items():
        file_path = os.path.join(extraction_dir, filename)
        if os.path.exists(file_path):
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
            try:
                loaded = json.loads(content)
            except:
                loaded = {}

            if filename == "paper_details.json":
                advancedData["paper_details"] = loaded
            else:
                if key in loaded:
                    advancedData[key] = loaded[key]

    images_dir = os.path.join(extraction_dir, "images")
    if os.path.exists(images_dir):
        for file in os.listdir(images_dir):
            if file not in [".", ".."]:
                file_path = os.path.join(images_dir, file)
                if os.path.isfile(file_path):
                    async with aiofiles.open(file_path, 'rb') as f:
                        data = await f.read()
                        encoded = base64.b64encode(data).decode('utf-8')
                        advancedData["images"].append({
                            "name": file,
                            "data": encoded
                        })
    
    tables_dir = os.path.join(extraction_dir, "tables")
    if os.path.exists(tables_dir):
        for file in os.listdir(tables_dir):
            if file not in [".", ".."]:
                file_path = os.path.join(tables_dir, file)
                if os.path.isfile(file_path):
                    async with aiofiles.open(file_path, 'r', encoding='utf-8-sig') as f:
                        data = await f.read()
                        advancedData["tables"].append({
                            "name": file,
                            "data": data
                        })
    
    await run_in_threadpool(shutil.rmtree, extraction_dir, ignore_errors=True)
    return advancedData

async def summarize_paper_images(image_paths: List[str], base_path: str, google_api_key: Union[SecretStr, None] = None):
    async def process_image(image_path: str) -> Optional[str]:
        async with semaphore:
            try:
                full_path = os.path.join(base_path, image_path)
                return await _convert_image_to_base64(full_path)
            except Exception:
                return None

    images_data = await asyncio.gather(*[process_image(image_path) for image_path in image_paths])

    system_message_text = """# About You
You are a world-class expert at analyzing figures from academic papers, extracting critical information to enhance RAG system context retrieval. You are also an expert at STRICTLY adhering to the "Non-Negotiable Rules" and obeying "Instructions" at all costs.

---

# Non-Negotiable Rules
1. **Precise yet Impactful:** Provide a precise and impactful summary of the attached academic image, emphasizing its most critical and relevant details.
2. **Single Paragraph:** Craft a single concise paragraph that captures the essence of the image, focusing on brevity without sacrificing clarity.
3. **Rich Information:** Ensure every essential element from the academic image is included, strategically enhancing its relevance for optimal context retrieval.
4. **Keywords Inclusion:** Include all the keywords present in the academic image in the generated summary.
5. **Token Efficiency:** Generate tokens ONLY for the summary of the image. DO NOT generate tokens other than for this purpose! No exceptions!

---

# Instructions
Generate a concise single paragraph summary for the below attached image from an academic paper while strictly obeying the aforementioned non-negotiable rules.

---

# Few Shot Examples
### Example 1:
Image: (*attached)
Summary:
The graph shows enzyme activity increases with temperature up to 37°C, then decreases sharply above 45°C, indicating enzyme denaturation. This supports the study's focus on enzyme kinetics and the optimal temperature for enzyme activity. Key data points: maximum activity at 37°C and decline post-45°C.

### Example 2:
Image: (*attached)
Summary:
The chart illustrates that younger age groups tend to have higher academic performance, with significant declines in performance as age increases, especially in students above 50. This trend aligns with the study’s examination of age-related cognitive factors influencing learning outcomes. Key data points: highest performance in the 18-25 age group and notable drop in performance after 50 years old.
"""
    human_message_text = """Image: (*attached)
Summary:"""

    image_summarization_prompts_batch = [
        [
            SystemMessage(content=system_message_text),
            HumanMessage(
                content=[
                    { "type": "text", "text": human_message_text },
                    {
                        "type": "image_url",
                        "image_url":  { "url": f"data:image/png;base64,{image_data}" }
                    }
                ]
            )
        ] for image_data in images_data if image_data is not None
    ]

    image_summarizer_agent = ChatGoogleGenerativeAI(model="gemini-1.5-flash-8b", google_api_key=google_api_key, temperature=0)

    image_summarization_chain = image_summarizer_agent | StrOutputParser()

    try:
        batch_results = await image_summarization_chain.abatch(image_summarization_prompts_batch)

        batch_results_error_adjusted = []
        curr_idx = 0
        for image_data in images_data:
            if image_data:
                batch_results_error_adjusted.append(batch_results[curr_idx])
                curr_idx += 1
            else:
                batch_results_error_adjusted.append(None)

        return batch_results_error_adjusted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while invoking image summarizer agent: {str(e)}")

async def summarize_paper_tables(table_paths: List[str], base_path: str, google_api_key: Union[SecretStr, None] = None):
    async def process_table(table_path: str) -> Optional[str]:
        async with semaphore:
            try:
                full_path = os.path.join(base_path, table_path)
                return await _read_table_data_async(full_path)
            except Exception:
                return None

    tables_data = await asyncio.gather(*[process_table(table_path) for table_path in table_paths])

    system_message_text = """# About You:
You are a world-class expert at reading tables from academic papers, extracting critical information to enhance RAG system context retrieval. You are also an expert at STRICTLY adhering to the "Non-Negotiable Rules" and obeying "Instructions" at all costs.

---

# Non-Negotiable Rules:
1. **Precise yet Impactful:** Provide a precise and impactful summary of the attached academic table, emphasizing its most critical and relevant details.
2. **Single Paragraph:** Craft a single concise paragraph that captures the essence of the table, focusing on brevity without sacrificing clarity.
3. **Rich Information:** Ensure every essential element from the academic table is included, strategically enhancing its relevance for optimal context retrieval.
4. **Keywords Inclusion:** Include all the essential keywords present in the academic table in the generated summary. 
5. **Token Efficiency:** Generate tokens ONLY for the summary of the table. DO NOT generate tokens other than for this purpose! No exceptions!

---

# Instructions:
Generate a concise summary of the attached table while obeying the aforementioned non-negotiable rules. Generate tokens ONLY for the summary of the table. DO NOT generate tokens other than for this purpose! No exceptions!

---

# Few-Shot Examples
### Example 1:
Table: (*attached)
Response:
The table illustrates how exercise intensity correlates with heart rate across various age groups. Younger participants (18-25 years) showed a higher increase in heart rate compared to older groups, particularly at high-intensity levels. Moderate exercise resulted in a mild increase in heart rate across all age groups, with elderly participants (65+) showing the least increase. Keywords: exercise intensity, heart rate, age groups, moderate exercise, high-intensity levels.

### Example 2:
Table: (*attached)
Response:
The table presents data on the impact of various fertilizers on plant height over a six-week period. The organic fertilizer produced the greatest growth in plants, reaching an average height of 15 cm. In contrast, plants with synthetic fertilizer exhibited moderate growth, with an average height of 10 cm. No fertilizer resulted in the smallest growth at 4 cm. Keywords: fertilizers, plant height, organic fertilizer, synthetic fertilizer, six-week period.
"""
    human_message_text= """Table:
{table_data}

Response:"""

    table_summarization_prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_message_text),
        ("human", human_message_text)
    ])

    table_summarizer_agent = ChatGoogleGenerativeAI(model="gemini-1.5-flash-8b", google_api_key=google_api_key, temperature=0)

    table_summarization_chain = table_summarization_prompt_template | table_summarizer_agent | StrOutputParser()

    batch_inputs = [{"table_data": table_data} for table_data in tables_data if table_data is not None]

    try:
        batch_results = await table_summarization_chain.abatch(batch_inputs)

        batch_results_error_adjusted = []
        curr_idx = 0
        for table_data in tables_data:
            if table_data:
                batch_results_error_adjusted.append(batch_results[curr_idx])
                curr_idx += 1
            else:
                batch_results_error_adjusted.append(None)

        return batch_results_error_adjusted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while invoking table summarizer agent: {str(e)}")

async def create_client_7z_file(
    base_path: str,
    chunks: Dict[str, List],
    headings: Dict[str, List],
    labels: Dict[str, List],
    references: Dict[str, List],
    figures_file_paths_to_names: Dict[str, str],
    tables_file_paths_to_names: Dict[str, str],
    paper_details: Dict[str, Dict[str, Any]] = None
) -> Tuple[str, str]:
    temp_folder = tempfile.mkdtemp(dir=base_path)

    chunks_json_path = os.path.join(temp_folder, "chunks.json")
    headings_json_path = os.path.join(temp_folder, "headings.json")
    labels_json_path = os.path.join(temp_folder, "labels.json")
    references_json_path = os.path.join(temp_folder, "references.json")
    if paper_details:
        paper_details_json_path = os.path.join(temp_folder, "paper_details.json")

    async with aiofiles.open(chunks_json_path, 'w') as f:
        await f.write(json.dumps(chunks, indent=4))
    async with aiofiles.open(headings_json_path, 'w') as f:
        await f.write(json.dumps(headings, indent=4))
    async with aiofiles.open(labels_json_path, 'w') as f:
        await f.write(json.dumps(labels, indent=4))
    async with aiofiles.open(references_json_path, 'w') as f:
        await f.write(json.dumps(references, indent=4))
    if paper_details:
        async with aiofiles.open(paper_details_json_path, 'w') as f:
            await f.write(json.dumps(paper_details, indent=4))

    images_folder = os.path.join(temp_folder, "images")
    tables_folder = os.path.join(temp_folder, "tables")
    os.makedirs(images_folder, exist_ok=True)
    os.makedirs(tables_folder, exist_ok=True)

    for image_path, image_name in figures_file_paths_to_names.items():
        image_source_path = os.path.join(base_path, image_path)
        if os.path.exists(image_source_path):
            image_dest_path = os.path.join(images_folder, image_name)
            await run_in_threadpool(shutil.copy2, image_source_path, image_dest_path)

    for table_path, table_name in tables_file_paths_to_names.items():
        table_source_path = os.path.join(base_path, table_path)
        if os.path.exists(table_source_path):
            table_dest_path = os.path.join(tables_folder, table_name)
            await run_in_threadpool(shutil.copy2, table_source_path, table_dest_path)

    sevenz_file_path = os.path.join(base_path, "client_data.7z")
    await _create_7z_async(temp_folder, sevenz_file_path)

    return sevenz_file_path, temp_folder

async def parse_json_file(base_path: str, paper_details: Dict[str, Dict[str, Any]] = None, google_api_key: Union[SecretStr, None] = None) -> Tuple[str, str]:
    global PARAGRAPH_LENGTH_MIN, REFERENCE_LENGTH_MIN

    json_file_path = os.path.join(base_path, "structuredData.json")
    async with aiofiles.open(json_file_path, 'r') as f:
        contents = await f.read()
    data = json.loads(contents)

    elements = data['elements']

    chunks = { "chunks": [] }
    figure_chunks = { "chunks": [] }
    table_chunks = { "chunks": [] }
    headings = { "headings": [] }
    labels = { "labels": [] }
    references = { "references": [] }

    num_chunks = 0
    num_headings = 0
    num_labels = 0
    num_references = 0

    paragraph_regex_patterns = [r"P(\[\d+\])?$", r"ParagraphSpan(\[\d+\])?$", r"LBody(\[\d+\])?$"]
    heading_regex_pattern = r"H\d*(\[\d+\])?$"
    figure_regex_pattern = r"Figure(\[\d+\])?$"
    table_regex_pattern = r"Table(\[\d+\])?$"

    elements_without_references = []
    figures_file_paths = []
    tables_file_paths = []

    latest_heading_is_references = False
    reference_headings = {
        "references": True,
        "reference list": True,
        "references list": True,
        "works cited": True,
        "cited works": True,
        "work citations": True,
        "bibliography": True,
        "literature cited": True,
        "citations": True,
        "notes and references": True,
        "references and notes": True,
        "selected references": True,
        "selected citations": True,
        "chosen references": True,
        "chosen citations": True,
        "further reading": True
    }

    for ele in elements:
        if not ele.get('Path'):
            continue

        split_path = ele['Path'].split('/')[-1]
        if re.match(heading_regex_pattern, split_path):
            if reference_headings.get(ele.get('Text').strip().lower(), False):
                latest_heading_is_references = True
            else:
                latest_heading_is_references = False

        if latest_heading_is_references:
            if not ele.get('Text') or len(ele['Text'].strip()) < REFERENCE_LENGTH_MIN:
                continue
            references['references'].append({
                "id": f"reference_{num_references}",
                "page": ele['Page'] + 1 if (ele.get('Page') and isinstance(ele['Page'], int)) else None,
                "bounds": ele.get('Bounds'),
                "content": ele['Text'].strip()
            })
            num_references += 1
        else:
            elements_without_references.append(ele)

    for ele in elements_without_references:
        split_path = ele['Path'].split('/')[-1]
        if (re.match(paragraph_regex_patterns[0], split_path) or
            re.match(paragraph_regex_patterns[1], split_path) or
            re.match(paragraph_regex_patterns[2], split_path)):
            if not ele.get('Text'):
                continue

            if ele['Text'].strip().lower().startswith('figure') or ele['Text'].strip().lower().startswith('fig'):
                labels['labels'].append({
                    "id": f"label_{num_labels}",
                    "type": "figure",
                    "page": ele['Page'] + 1 if (ele.get('Page') and isinstance(ele['Page'], int)) else None,
                    "bounds": ele.get('Bounds'),
                    "content": ele['Text'].strip()
                })
                num_labels += 1
            elif ele['Text'].strip().lower().startswith('table') or ele['Text'].strip().lower().startswith('tab') or ele['Text'].strip().lower().startswith('tbl'):
                labels['labels'].append({
                    "id": f"label_{num_labels}",
                    "type": "table",
                    "page": ele['Page'] + 1 if (ele.get('Page') and isinstance(ele['Page'], int)) else None,
                    "bounds": ele.get('Bounds'),
                    "content": ele['Text'].strip()
                })
                num_labels += 1
            
            if len(ele['Text'].strip()) < PARAGRAPH_LENGTH_MIN:
                continue

            chunks['chunks'].append({
                "id": f"chunk_{num_chunks}",
                "type": "text",
                "page": ele['Page'] + 1 if (ele.get('Page') and isinstance(ele['Page'], int)) else None,
                "bounds": ele.get('Bounds'),
                "content": ele['Text'].strip()
            })
            num_chunks += 1
        elif re.match(heading_regex_pattern, split_path):
            if not ele.get('Text'):
                continue

            headings['headings'].append({
                "id": f"heading_{num_headings}",
                "type": f"H{ele['Path'].split('H')[-1].split('[')[0]}",
                "page": ele['Page'] + 1 if (ele.get('Page') and isinstance(ele['Page'], int)) else None,
                "bounds": ele.get("Bounds"),
                "content": ele['Text'].strip()
            })
            num_headings += 1
        elif re.match(figure_regex_pattern, split_path):
            if not ele.get('filePaths') or len(ele['filePaths']) == 0:
                continue

            if _is_image_size_valid(ele['filePaths'][0], base_path):
                figures_file_paths.append(ele['filePaths'][0])
                figure_chunks['chunks'].append({
                    "type": "image",
                    "page": ele['Page'] + 1 if (ele.get('Page') and isinstance(ele['Page'], int)) else None,
                    "bounds": ele.get('attributes', {}).get('BBox') or ele.get('Bounds')
                })
        elif re.match(table_regex_pattern, split_path):
            if not ele.get('filePaths', False) or len(ele['filePaths']) == 0:
                continue

            if ele['filePaths'][0].endswith('.csv') or (len(ele['filePaths']) > 1 and ele['filePaths'][1].endswith('.csv')):
                tables_file_paths.append(ele['filePaths'][0] if ele['filePaths'][0].endswith('.csv') else ele['filePaths'][1])
                table_chunks['chunks'].append({
                    "type": "table",
                    "page": ele['Page'] + 1 if (ele.get('Page') and isinstance(ele['Page'], int)) else None,
                    "bounds": ele.get('attributes', {}).get('BBox') or ele.get('Bounds')
                })

    figures_summaries, tables_summaries = await asyncio.gather(
        summarize_paper_images(figures_file_paths, base_path, google_api_key),
        summarize_paper_tables(tables_file_paths, base_path, google_api_key)
    )

    figures_file_paths_to_names = {}
    num_chunks = len(chunks['chunks'])
    for figure_summary, figure_chunk, figure_path in zip(figures_summaries, figure_chunks['chunks'], figures_file_paths):
        if figure_summary:
            chunks['chunks'].append({
                "id": f"chunk_{num_chunks}",
                "type": "image",
                "page": figure_chunk.get('page'),
                "bounds": figure_chunk.get("bounds"),
                "content": figure_summary
            })
            figures_file_paths_to_names[figure_path] = f"chunk_{num_chunks}.png"
            num_chunks += 1

    tables_file_paths_to_names = {}
    num_chunks = len(chunks['chunks'])
    for table_summary, table_chunk, table_path in zip(tables_summaries, table_chunks['chunks'], tables_file_paths):
        if table_summary:
            chunks['chunks'].append({
                "id": f"chunk_{num_chunks}",
                "type": "table",
                "page": table_chunk.get('page'),
                "bounds": table_chunk.get('bounds'),
                "content": table_summary
            })
            tables_file_paths_to_names[table_path] = f"chunk_{num_chunks}.csv"
            num_chunks += 1

    client_7z_file_path, client_folder_path = await create_client_7z_file(
        base_path, chunks, headings, labels, references,
        figures_file_paths_to_names, tables_file_paths_to_names,
        paper_details
    )

    return client_7z_file_path, client_folder_path


async def extract_advanced_contents_from_pdf(
    pdf_file_path: str,
    adobe_client_id: SecretStr,
    adobe_client_secret: SecretStr
) -> str:
    retrying = AsyncRetrying(
        wait=wait_exponential_jitter(initial=1, max=30),
        stop=stop_after_attempt(6),
        retry=retry_if_exception_type((ServiceApiException, ServiceUsageException, SdkException))
    )

    async for attempt in retrying:
        with attempt:
            try:
                input_stream = await _read_pdf_async(pdf_file_path)

                credentials = ServicePrincipalCredentials(
                    client_id=adobe_client_id.get_secret_value(),
                    client_secret=adobe_client_secret.get_secret_value()
                )

                pdf_services = PDFServices(credentials)

                input_asset = await run_in_threadpool(
                    pdf_services.upload, input_stream=input_stream, mime_type=PDFServicesMediaType.PDF
                )
                print("PDF File uploaded to Adobe cloud.")

                extract_pdf_params = ExtractPDFParams(
                    elements_to_extract=[ExtractElementType.TEXT, ExtractElementType.TABLES],
                    elements_to_extract_renditions=[ExtractRenditionsElementType.TABLES, ExtractRenditionsElementType.FIGURES],
                    table_structure_type=TableStructureType.CSV
                )

                extract_pdf_job = ExtractPDFJob(input_asset=input_asset, extract_pdf_params=extract_pdf_params)

                location = await run_in_threadpool(pdf_services.submit, extract_pdf_job)
                pdf_services_response = await run_in_threadpool(pdf_services.get_job_result, location, ExtractPDFResult)

                result_asset: CloudAsset = pdf_services_response.get_result().get_resource()
                stream_asset: StreamAsset = pdf_services.get_content(result_asset)
                print("Fetched parsed .zip file from Adobe cloud.")

                temp_file_path = await _write_temp_file_async(stream_asset.get_input_stream())

                return temp_file_path
            
            except (ServiceApiException, ServiceUsageException, SdkException) as e:
                if "TimeoutError" in str(e):
                    raise HTTPException(status_code=429, detail="Adobe API rate limit exceeded for the moment. Please try again later.")
                raise HTTPException(status_code=500, detail=f"Adobe Services error occurred: {str(e)}")
            
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    raise HTTPException(status_code=429, detail="Adobe API rate limit reached. Please wait before retrying.")
                raise HTTPException(status_code=e.response.status_code, detail=f"Adobe API error: {str(e)}")
            
            except httpx.ConnectTimeout:
                raise HTTPException(status_code=504, detail="Connection to Adobe API timed out. Please try again later.")

            except httpx.ReadTimeout:
                raise HTTPException(status_code=504, detail="Adobe API is taking too long to respond. Please try again later.")

            except httpx.RequestError as e:
                raise HTTPException(status_code=503, detail=f"Unable to reach Adobe API: {str(e)}")
    
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Some unexpected error occurred: {str(e)}")


@router.post("/advanced_parse")
async def advanced_parse(
    background_tasks: BackgroundTasks,
    paper_details_str: str = Form(None),
    pdf_url: str = Form(None),
    pdf_file: UploadFile = File(None),
    adobe_credentials_str: str = Form(None),
    google_api_key: SecretStr = Form(None)
):
    if paper_details_str:
        paper_details: Dict[str, Dict[str, Any]] = json.loads(paper_details_str)
    else:
        paper_details = None
    if adobe_credentials_str:
        adobe_credentials: Dict[str, SecretStr] = json.loads(adobe_credentials_str)
        adobe_credentials['client_id'] = SecretStr(adobe_credentials['client_id'])
        adobe_credentials['client_secret'] = SecretStr(adobe_credentials['client_secret'])
    else:
        adobe_credentials = None

    gcs_pdf_url = None
    if paper_details and 'paper' in paper_details and 'url_pdf' in paper_details['paper']:
        gcs_pdf_url = paper_details['paper']['url_pdf']

    if gcs_pdf_url:
        object_name = _sanitize_gcs_object_name(gcs_pdf_url)
        if gcs_service.file_exists_in_bucket(object_name):
            temp_download_path = tempfile.NamedTemporaryFile(delete=False, suffix=".7z").name
            gcs_service.download_file_from_bucket(object_name, temp_download_path)
            advancedData = await get_advanced_data_from_7z(temp_download_path)
            background_tasks.add_task(_remove_file, temp_download_path)
            return JSONResponse(content=advancedData)

    temp_pdf_path = None
    if pdf_file is not None:
        if pdf_file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are accepted.")
        try:
            content = await pdf_file.read()
            if len(content) > MAX_PDF_SIZE:
                raise HTTPException(status_code=400, detail="File size exceeds 50MB limit.")
            temp_pdf_path = await _write_temp_file(content, suffix=".pdf")
        except Exception:
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred while uploading PDF file from client.")
    elif pdf_url is not None:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(pdf_url, headers=headers)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch PDF")
            if len(response.content) > MAX_PDF_SIZE:
                raise HTTPException(status_code=400, detail="File size exceeds 50MB limit.")
            temp_pdf_path = await _write_temp_file(response.content)
        except Exception:
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred while downloading PDF file from provided URL.")
    else:
        raise HTTPException(status_code=400, detail=f"Provide either pdf url or pdf file.")
        
    if not temp_pdf_path:
        raise HTTPException(status_code=500, detail=f"Failed to create temporary file to store PDF file.")

    background_tasks.add_task(_remove_file, temp_pdf_path)
    
    try:
        if adobe_credentials and adobe_credentials.get('client_id') and adobe_credentials.get('client_secret'):
            temp_zip_path = await extract_advanced_contents_from_pdf(temp_pdf_path, adobe_credentials['client_id'], adobe_credentials['client_secret'])
        else:
            temp_zip_path = await extract_advanced_contents_from_pdf(temp_pdf_path, SecretStr(os.getenv("PDF_SERVICES_CLIENT_ID")), SecretStr(os.getenv("PDF_SERVICES_CLIENT_SECRET")))
        background_tasks.add_task(_remove_file, temp_zip_path)

        temp_extracted_path = await _extract_zip_async(temp_zip_path)

        client_7z_file_path, client_folder_path = await parse_json_file(temp_extracted_path, paper_details, google_api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while parsing: {str(e)}")

    if gcs_pdf_url:
        object_name = _sanitize_gcs_object_name(gcs_pdf_url)
        background_tasks.add_task(
            _upload_and_cleanup_in_background,
            client_7z_file_path,
            object_name,
            temp_extracted_path,
            client_folder_path
        )
    else:
        def _cleanup_local(file_path: str, folder_a: str, folder_b: str):
            if os.path.exists(file_path):
                os.remove(file_path)
            if os.path.exists(folder_a):
                shutil.rmtree(folder_a, ignore_errors=True)
            if os.path.exists(folder_b):
                shutil.rmtree(folder_b, ignore_errors=True)
        background_tasks.add_task(_cleanup_local, client_7z_file_path, temp_extracted_path, client_folder_path)

    advancedData = await get_advanced_data_from_7z(client_7z_file_path)
    return JSONResponse(content=advancedData)