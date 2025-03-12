import os
import io
import json
import base64
import asyncio
import tempfile
import functools
import pandas as pd
from typing import Literal, List
from fastapi import APIRouter, UploadFile, File, Form, Query, Body, BackgroundTasks, HTTPException

from services import pdf_parser, gcs_service
from utils import chunking_utils

router = APIRouter()

def _sync_write_temp_file(content: bytes, suffix: str) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        return tmp.name

async def write_temp_file(content: bytes, suffix: str = ".pdf") -> str:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _sync_write_temp_file, content, suffix)

async def delete_temp_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass

def _get_sanitized_name(identifier: str) -> str:
    encoded = base64.urlsafe_b64encode(identifier.encode("utf-8")).decode("utf-8")
    return encoded

@router.post("/parse_and_split_pdf")
async def parse_and_split_pdf(
    file: UploadFile = File(...),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are accepted.")
    
    if chunk_size <= 0 or chunk_overlap < 0:
        raise HTTPException(status_code=400, detail="Invalid chunk parameters.")
    
    if chunk_overlap >= chunk_size:
        raise HTTPException(status_code=400, detail="Overlap must be smaller than chunk size.")

    tmp_path = None
    try:
        content = await file.read()

        tmp_path = await write_temp_file(content, suffix=".pdf")

        loop = asyncio.get_running_loop()

        text = await loop.run_in_executor(None, pdf_parser.parse_pdf, tmp_path)

        chunks = await loop.run_in_executor(None, chunking_utils.chunk_text, text, chunk_size, chunk_overlap)

        return { "chunks": chunks }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred.")

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as e:
                pass

@router.get("/get_key")
def get_key(type: str):
    if type == "Google":
        key_name = "GOOGLE_API_KEY"
    elif type == "Groq":
        key_name = "GROQ_API_KEY"
    else:
        raise HTTPException(
            status_code=400, 
            detail="Invalid API key type requested. Must be either 'Google' or 'Groq'."
        )

    key = os.environ.get(key_name)
    if not key:
        raise HTTPException(
            status_code=404, 
            detail=f"Requested key '{key_name}' not found."
        )

    return { "key": key }

@router.post("/store_embeddings")
async def store_embeddings(
    background_tasks: BackgroundTasks,
    pdf_url: str = Body(...),
    embeddings: List[List[float]] = Body(...),
    parse_mode: Literal["Default", "Advanced"] = Body("Default")
):
    loop = asyncio.get_running_loop()
    temp_file_path = None

    try:
        df = pd.DataFrame(embeddings)

        def _create_temp_file():
            with tempfile.NamedTemporaryFile(delete=False, suffix=".parquet") as tmp:
                return tmp.name
        temp_file_path = await loop.run_in_executor(None, _create_temp_file)

        if not temp_file_path:
            raise HTTPException(status_code=500, detail="Failed to create a temporary file for storing embeddings.")
        
        partial_to_parquet = functools.partial(df.to_parquet, path=temp_file_path, compression="brotli")

        await loop.run_in_executor(None, partial_to_parquet)

        name_to_sanitize = pdf_url.split('/')[-1]
        sanitized_name = _get_sanitized_name(name_to_sanitize)
        destination_blob_name = f"embeddings/{parse_mode}/{sanitized_name}.parquet"

        await loop.run_in_executor(None, gcs_service.upload_file_to_bucket, temp_file_path, destination_blob_name)

        background_tasks.add_task(delete_temp_file, temp_file_path)

        return { "message": "Embeddings stored successfully." }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error storing embeddings: {str(e)}")
    
@router.post("/store_suggestions")
async def store_suggestions(
    background_tasks: BackgroundTasks,
    pdf_url: str = Query(...),
    parse_mode: Literal["Default", "Advanced"] = Query("Default"),
    suggestions_str: str = Form(...)
):
    try:
        suggestions = json.loads(suggestions_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid format of suggestions string: {str(e)}")
    
    loop = asyncio.get_running_loop()
    temp_file_path = None

    try:
        def _create_temp_json_file(suggestions):
            with tempfile.NamedTemporaryFile(delete=False, suffix=".json", mode="w", encoding="utf-8") as tmp:
                json.dump(suggestions, tmp)
                return tmp.name
        
        temp_file_path = await loop.run_in_executor(None, _create_temp_json_file, suggestions)
        if not temp_file_path:
            raise HTTPException(status_code=500, detail="Failed to create a temporary file for storing suggestions.")
        
        name_to_sanitize = pdf_url.split('/')[-1]
        sanitized_name = _get_sanitized_name(name_to_sanitize)
        destination_blob_name = f"suggestions/{parse_mode}/{sanitized_name}.json"
        
        await loop.run_in_executor(None, gcs_service.upload_file_to_bucket, temp_file_path, destination_blob_name)
        
        background_tasks.add_task(delete_temp_file, temp_file_path)
        
        return {"message": "Suggestions stored successfully."}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error storing suggestions: {str(e)}")
    
@router.get("/get_embeddings")
async def get_embeddings(
    pdf_url: str = Query(...),
    parse_mode: Literal["Default", "Advanced"] = Query("Default")
):
    name_to_sanitize = pdf_url.split('/')[-1]
    sanitized_name = _get_sanitized_name(name_to_sanitize)
    destination_blob_name = f"embeddings/{parse_mode}/{sanitized_name}.parquet"
    loop = asyncio.get_running_loop()
    
    try:
        file_content = await loop.run_in_executor(None, gcs_service.download_file_from_bucket_as_bytes, destination_blob_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Embeddings not found in storage.")
    
    try:
        df = pd.read_parquet(io.BytesIO(file_content))
        embeddings = df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing embeddings file: {str(e)}")
    
    return {"embeddings": embeddings}

@router.get("/get_suggestions")
async def get_suggestions(
    pdf_url: str = Query(...),
    parse_mode: Literal["Default", "Advanced"] = Query("Default")
):
    name_to_sanitize = pdf_url.split('/')[-1]
    sanitized_name = _get_sanitized_name(name_to_sanitize)
    destination_blob_name = f"suggestions/{parse_mode}/{sanitized_name}.json"
    loop = asyncio.get_running_loop()
    
    try:
        file_content = await loop.run_in_executor(None, gcs_service.download_file_from_bucket_as_bytes, destination_blob_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Suggestions not found in storage.")
    
    try:
        suggestions = json.loads(file_content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing suggestions file: {str(e)}")
    
    return {"suggestions": suggestions}