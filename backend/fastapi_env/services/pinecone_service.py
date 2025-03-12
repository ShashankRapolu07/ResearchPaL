import os
import time
import asyncio
from dotenv import load_dotenv
from typing import List, Optional
from fastapi import HTTPException
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

EMBEDDING_DIMENSION = 768
INDEX_CREATION_TIMEOUT = 600 # in seconds
UPSERT_BATCH_SIZE = 600
NUM_FETCH_VECTORS = 3

api_key = os.getenv("PINECONE_API_KEY", "x")
host = os.getenv("PINECONE_INDEX_HOST", "default_index_host")
index_name = os.getenv("PINECONE_INDEX_NAME", "my_index")
pc = Pinecone(api_key=api_key)

if not pc.has_index(index_name):
    pc.create_index(
        name=index_name,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        ),
        deletion_protection="disabled"
    )

    start_time = time.time()
    timeout = INDEX_CREATION_TIMEOUT
    while True:
        try:
            status = pc.describe_index(index_name).status
            if status['ready']:
                break
            if time.time() - start_time > timeout:
                raise RuntimeError(f"Pinecone index creation timed out after {timeout} seconds")
            time.sleep(1)
        except Exception as e:
            if time.time() - start_time > timeout:
                raise RuntimeError(f"Pinecone index creation failed: {str(e)}")
            time.sleep(5)

index = pc.Index(host=host)

async def check_paper_vectors(paper_url: str) -> bool:
    try:
        gen = await asyncio.to_thread(index.list, prefix=f"{paper_url}#", limit=3)
        if len(list(gen)) == 0:
            return False
        return True
    except Exception as e:
        return False

async def upsert_embeddings(embeddings: List[dict], batch_size: Optional[int] = UPSERT_BATCH_SIZE):
    # embeddings struct: [{"id": unique identifier prefixed with paper_url, "values": embedding ..., "metadata": {"paper_url": paper_url, "content": content}]
    try:
        for i in range(0, len(embeddings), batch_size):
            batch = embeddings[i:i + batch_size]
            await asyncio.to_thread(index.upsert, vectors=batch)
        return "Upsertion Successful!"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upsertion failuer: {str(e)}")

async def similarity_search(
    query_embedding: List[float],
    paper_url: str,
    top_k: Optional[int] = NUM_FETCH_VECTORS
):
    results = await asyncio.to_thread(
        index.query,
        vector=query_embedding,
        top_k=top_k,
        include_values=False,
        include_metadata=True,
        filter={"paper_url": paper_url}
    )
    return results

def delete_paper_vectors(paper_url: str):
    # Note: vector ids must be prefixed by their paper_url
    paper_doc_ids = list(index.list(prefix=f"{paper_url}#"))
    index.delete(ids=paper_doc_ids)
    return "Successfully deleted!"