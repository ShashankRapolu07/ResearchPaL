import os
import httpx
import hashlib
import pymupdf
import tempfile
import threading
from PIL import Image
from dotenv import load_dotenv
from ask_ai_agent import perform_rag
from pdf2image import convert_from_path
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from routers import session_router, advanced_parse_router
from fastapi.responses import FileResponse, StreamingResponse
from langchain.text_splitter import RecursiveCharacterTextSplitter
from fastapi import FastAPI, HTTPException, Query, Body, BackgroundTasks

from services import pinecone_service, embeddings_service, gcs_service

load_dotenv()

app = FastAPI(title="ResearchPaL Backend")

origins = [os.getenv("FRONTEND_URL")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(session_router.router, tags=["session"])
app.include_router(advanced_parse_router.router, tags=["advanced parse"])

pdf_lock = threading.Lock()
thumbnail_lock = threading.Lock()

splitter = RecursiveCharacterTextSplitter(chunk_size=2500, chunk_overlap=100)

def remove_file(path: str):
    try:
        os.remove(path)
    except Exception:
        pass

async def write_temp_file(content: bytes, suffix=".pdf") -> str:
    def _write_file():
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_file.write(content)
            return tmp_file.name
    return await run_in_threadpool(_write_file)

def _generate_thumbnail(pdf_path: str, out_path: str):
    images = convert_from_path(pdf_path, first_page=1, last_page=1, fmt='png', dpi=72)
    if not images:
        raise ValueError("Failed to convert PDF to image (no pages found).")
    thumbnail_size = (250, 250)
    image = images[0]
    image.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)
    image.save(out_path, "JPEG", optimize=True, quality=30)

async def get_trending_papers(page: int, items: int = 10):
    PWC_URL = os.getenv("PWC_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{PWC_URL}/trending_papers", params={"page": page, "items": items})
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trending papers: {str(e)}")
    
async def get_relevant_papers(query: str, page: int, items: int = 10):
    PWC_URL = os.getenv("PWC_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{PWC_URL}/search_papers", params={"query": query, "page": page, "items": items})
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching search papers: {str(e)}")

@app.get("/")
async def home(items: int = Query(10, description="No. of items to fetch"), page: int = Query(..., description="page number to fetch")):
    try:
        response = await get_trending_papers(page=page, items=items)
        paperrepos, next_page = response['results'], response['next_page']
        return {"paperrepos": paperrepos, "next_page": next_page}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.get("/search")
async def search_papers(query: str = Query(..., description="Search query"), page: int = Query(..., description="Page number to retrieve"), items: int = Query(10, description="No. of items to retrieve")):
    try:
        response = await get_relevant_papers(query=query, page=page, items=items)
        paperrepos, next_page = response['results'], response['next_page']
        return {"paperrepos": paperrepos, "next_page": next_page}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@app.post("/ask_ai_agent")
async def ask_ai_agent(
    query: str = Body(..., description="User Query"),
    url: str = Body(..., description="URL to identify paper"),
    title: str = Body(None, description="Title of the paper"),
    published: str = Body(None, description="Published date of the paper"),
    authors: list[str] = Body(None, description="Authors of the paper"),
    code_url: str = Body(None, description="URL if code available"),
    framework: str = Body(None, description="Code framework used if available"),
    stars: str = Body(None, description="Github stars if mentioned"),
    time_of_asking: str = Body(None, description="Time details when function is called"),
):
    async def stream_chunks():
        try:
            async for chunk in perform_rag(
                query=query,
                paper_url=url,
                paper_title=title,
                published=published,
                authors=authors,
                code_url=code_url,
                framework=framework,
                stars=stars,
                time_of_asking=time_of_asking,
            ):
                yield chunk
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Streaming terminated due to error: {str(e)}")

    return StreamingResponse(stream_chunks(), media_type="text/plain")

@app.get("/paper_pdf")
async def get_paper_pdf(url: str = Query(..., description="The PDF URL to fetch"), background_tasks: BackgroundTasks = None):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    temp_pdf_path = None

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch PDF")

        temp_pdf_path = await write_temp_file(response.content)

        if background_tasks is None:
            background_tasks = BackgroundTasks()
        background_tasks.add_task(remove_file, temp_pdf_path)

        return FileResponse(temp_pdf_path, media_type="application/pdf")

    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Error fetching PDF: {str(e)}")

@app.get('/paper_thumbnail')
async def get_paper_thumbnail(url: str = Query(..., description="The PDF URL to fetch"), background_tasks: BackgroundTasks = None):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    cache_key = hashlib.md5(url.encode()).hexdigest()
    gcs_object_name = f"image_cache/{cache_key}.jpg"

    if gcs_service.file_exists_in_bucket(gcs_object_name):
        local_temp_thumbnail = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg").name

        try:
            gcs_service.download_file_from_bucket(gcs_object_name, local_temp_thumbnail)
        except Exception as e:
            remove_file(local_temp_thumbnail)
            raise HTTPException(status_code=500, detail=f"Error downloading thumbnail from GCS: {str(e)}")

        if background_tasks is None:
            background_tasks = BackgroundTasks()
        background_tasks.add_task(remove_file, local_temp_thumbnail)

        return FileResponse(local_temp_thumbnail, media_type="image/jpeg")
    
    temp_pdf_path = None
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch PDF")
        
        temp_pdf_path = await write_temp_file(response.content)

        if background_tasks is None:
            background_tasks = BackgroundTasks()
        background_tasks.add_task(remove_file, temp_pdf_path)

        with thumbnail_lock:
            if gcs_service.file_exists_in_bucket(gcs_object_name):
                local_temp_thumbnail = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg").name
                try:
                    gcs_service.download_file_from_bucket(gcs_object_name, local_temp_thumbnail)
                except Exception as e:
                    remove_file(local_temp_thumbnail)
                    raise HTTPException(status_code=500, detail=f"Error downloading thumbnail from GCS: {str(e)}")
                
                background_tasks.add_task(remove_file, local_temp_thumbnail)
                return FileResponse(local_temp_thumbnail, media_type="image/jpeg")
            
            local_temp_thumbnail = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg").name
            try:
                _generate_thumbnail(temp_pdf_path, local_temp_thumbnail)
            except Exception as e:
                remove_file(local_temp_thumbnail)
                raise HTTPException(status_code=500, detail=f"Error converting PDF to image: {str(e)}")
            
            try:
                gcs_service.upload_file_to_bucket(local_temp_thumbnail, gcs_object_name)
            except Exception as e:
                remove_file(local_temp_thumbnail)
                raise HTTPException(status_code=500, detail=f"Error uploading thumbnail to GCS: {str(e)}")
            
            background_tasks.add_task(remove_file, local_temp_thumbnail)
            return FileResponse(local_temp_thumbnail, media_type="image/jpeg")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching PDF: {str(e)}")
    
@app.get('/prepare_paper_for_rag')
async def prepare_paper_for_rag(url: str = Query(..., description="Paper URL")):
    temp_pdf_path = None

    try:
        existing_docs = await pinecone_service.check_paper_vectors(url)
        if existing_docs:
            return {"message": "Embeddings are ready for retrieval."}

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(url, headers=headers)

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch PDF")
            
            temp_pdf_path = await write_temp_file(response.content)

        except HTTPException as http_e:
            raise http_e
        except Exception as e_download:
            raise HTTPException(status_code=500, detail=f"Error downloading PDF: {str(e_download)}")
        
        try:
            with pymupdf.open(temp_pdf_path) as doc:
                text = "".join(page.get_text() for page in doc)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")
        
        chunks = splitter.split_text(text)
        if not chunks:
            raise HTTPException(status_code=400, detail="PDF text extraction failed or returned empty content.")
        
        embeddings = await embeddings_service.get_multiple_embeddings(chunks, task_type="retrieval_document")
        embeddings_dict_list = [{
            "id": f"{url}#{i}",
            "values": embeddings[i],
            "metadata": {"paper_url": url, "content": chunks[i]}
        } for i in range(len(chunks))]
        await pinecone_service.upsert_embeddings(embeddings_dict_list)

        return {"message": "Embeddings are ready for retrieval."}
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Paper PDF data doesn't exist.")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Unexpected data structure from vector store: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing paper data for RAG: {str(e)}")
    
    finally:
        if temp_pdf_path:
            try:
                os.remove(temp_pdf_path)
            except Exception as e:
                pass