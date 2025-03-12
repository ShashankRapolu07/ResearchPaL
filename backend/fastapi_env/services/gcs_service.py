import os
from dotenv import load_dotenv
from google.cloud import storage

load_dotenv()

URL_EXPIRATION_MINUTES = 120
CONCURRENCY_LIMIT_PER_USER = 5

storage_client = storage.Client()
# storage_client = storage.Client(project=os.getenv("GCP_PROJECT_ID"))

def create_bucket(bucket_name: str, storage_class: str = 'STANDARD', location='asia-south1'):
    bucket = storage_client.bucket(bucket_name)
    bucket.storage_class = storage_class
    new_bucket = storage_client.create_bucket(bucket, location=location)
    return f"Created bucket {new_bucket.name} in {new_bucket.location} with storage class {new_bucket.storage_class}."

def upload_file_to_bucket(local_file_path: str, destination_blob_name: str) -> str:
    bucket = storage_client.bucket(os.getenv("GCS_BUCKET_NAME"))
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_filename(local_file_path)
    return "Successfully uploaded to GCS."

def download_file_from_bucket(blob_name: str, local_path: str) -> str:
    bucket = storage_client.bucket(os.getenv("GCS_BUCKET_NAME"))
    blob = bucket.blob(blob_name)
    blob.download_to_filename(local_path)
    return "Successfully downloaded file from GCS."

def download_file_from_bucket_as_bytes(blob_name: str) -> bytes:
    bucket = storage_client.bucket(os.getenv("GCS_BUCKET_NAME"))
    blob = bucket.blob(blob_name)
    return blob.download_as_bytes()

def file_exists_in_bucket(blob_name: str) -> bool:
    bucket = storage_client.bucket(os.getenv("GCS_BUCKET_NAME"))
    blob = bucket.blob(blob_name)
    return blob.exists()

if __name__ == "__main__":
    res = create_bucket(bucket_name=os.getenv("GCS_BUCKET_NAME"))
    print(res)