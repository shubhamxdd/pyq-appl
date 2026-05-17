import boto3
from botocore.exceptions import ClientError
from ..config import settings
import logging

class StorageService:
    def __init__(self):
        self.session = boto3.session.Session()
        self.client = self.session.client(
            's3',
            region_name=settings.SPACES_REGION,
            endpoint_url=settings.SPACES_ENDPOINT,
            aws_access_key_id=settings.SPACES_KEY,
            aws_secret_access_key=settings.SPACES_SECRET
        )

    def upload_file(self, file_content: bytes, object_name: str, content_type: str = 'application/pdf'):
        try:
            self.client.put_object(
                Bucket=settings.SPACES_BUCKET,
                Key=object_name,
                Body=file_content,
                ACL='public-read',
                ContentType=content_type
            )
            return f"{settings.SPACES_PUBLIC_URL}/{object_name}"
        except ClientError as e:
            logging.error(f"Error uploading file to DigitalOcean Spaces: {e}")
            return None

    def delete_file(self, object_name: str):
        try:
            self.client.delete_object(
                Bucket=settings.SPACES_BUCKET,
                Key=object_name
            )
            return True
        except ClientError as e:
            logging.error(f"Error deleting file from DigitalOcean Spaces: {e}")
            return False

storage_service = StorageService()
