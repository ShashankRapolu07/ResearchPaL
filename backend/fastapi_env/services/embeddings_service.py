import asyncio
from dotenv import load_dotenv
from typing import Optional, List
from pydantic import SecretStr
from fastapi import HTTPException
from langchain_google_genai import GoogleGenerativeAIEmbeddings

EMBEDDING_BATCH_SIZE = 768

load_dotenv()

async def get_single_embedding(text: str, task_type: Optional[str] = "retrieval_query", google_api_key: Optional[SecretStr] = None) -> List[float]:
    try:
        if task_type == "retrieval_query":
            if not google_api_key:
                query_embed_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001", task_type="retrieval_query")
            else: query_embed_model = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001", task_type="retrieval_query", google_api_key=google_api_key.get_secret_value()
                )
            return await asyncio.to_thread(query_embed_model.embed_query, text)
        elif task_type == "retrieval_document":
            if not google_api_key:
                doc_embed_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001", task_type="retrieval_document")
            else:
                doc_embed_model = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001", task_type="retrieval_document", google_api_key=google_api_key.get_secret_value()
                )
            return await asyncio.to_thread(doc_embed_model.embed_documents, [text])[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while generating embedding: {str(e)}")

async def get_multiple_embeddings(
    texts: List[str],
    task_type: Optional[str] = "retrieval_document",
    batch_size: Optional[int] = EMBEDDING_BATCH_SIZE,
    google_api_key: Optional[SecretStr] = None
) -> List[List[float]]:
    try:
        if task_type == "retrieval_query":
            if not google_api_key:
                query_embed_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001", task_type="retrieval_query")
            else:
                query_embed_model = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001", task_type="retrieval_query", google_api_key=google_api_key.get_secret_value()
                )
            return await asyncio.to_thread(query_embed_model.embed_documents, texts=texts, batch_size=batch_size)
        elif task_type == "retrieval_document":
            if not google_api_key:
                doc_embed_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001", task_type="retrieval_document")
            else:
                doc_embed_model = GoogleGenerativeAIEmbeddings(
                    model="models/embedding-001", task_type="retrieval_document", google_api_key=google_api_key.get_secret_value()
                )
            return await asyncio.to_thread(doc_embed_model.embed_documents, texts=texts, batch_size=batch_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while generating embeddings: {str(e)}")