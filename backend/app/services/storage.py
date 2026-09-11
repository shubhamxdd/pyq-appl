import logging
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError

from ..config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """S3-compatible object storage (AWS S3, Cloudflare R2, DO Spaces, MinIO...)."""

    def __init__(self):
        self.session = boto3.session.Session()
        # For AWS S3, set SPACES_ENDPOINT to https://s3.<region>.amazonaws.com
        # (or leave it as the regional endpoint). Passing endpoint_url works for
        # any S3-compatible provider.
        self.client = self.session.client(
            "s3",
            region_name=settings.SPACES_REGION,
            endpoint_url=settings.SPACES_ENDPOINT or None,
            aws_access_key_id=settings.SPACES_KEY,
            aws_secret_access_key=settings.SPACES_SECRET,
        )
        self.bucket = settings.SPACES_BUCKET
        self.public_url = settings.SPACES_PUBLIC_URL.rstrip("/")

    def public_url_for(self, object_name: str) -> str:
        """Build the public URL for an object key."""
        return f"{self.public_url}/{object_name.lstrip('/')}"

    def key_from_url(self, file_url: str) -> str:
        """Derive the object key from a stored public URL.

        Handles the configured public base, CDN hostnames, and any provider
        URL shape by falling back to the URL path.
        """
        if not file_url:
            return ""
        prefix = f"{self.public_url}/"
        if file_url.startswith(prefix):
            return file_url[len(prefix):]
        return urlparse(file_url).path.lstrip("/")

    def upload_file(
        self,
        file_content: bytes,
        object_name: str,
        content_type: str = "application/pdf",
    ):
        """Upload bytes to the bucket and return the public URL.

        NOTE: We intentionally do NOT send an ``ACL`` header. Modern AWS S3
        buckets have ACLs disabled ("bucket owner enforced") and reject
        ``ACL=public-read`` with ``AccessControlListNotSupported``. Public read
        access is granted via a bucket policy instead (see DEPLOY.md).
        """
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=object_name,
                Body=file_content,
                ContentType=content_type,
                CacheControl="public, max-age=31536000",
            )
            return self.public_url_for(object_name)
        except ClientError as e:
            logger.error("Error uploading file to storage: %s", e)
            return None

    def download_file(self, object_name: str):
        """Download an object and return its bytes (credentials-based, so it
        does not depend on the object being publicly readable)."""
        if not object_name:
            return None
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=object_name)
            return response["Body"].read()
        except ClientError as e:
            logger.error("Error downloading file from storage: %s", e)
            return None

    def delete_file(self, object_name: str) -> bool:
        if not object_name:
            return False
        try:
            self.client.delete_object(Bucket=self.bucket, Key=object_name)
            return True
        except ClientError as e:
            logger.error("Error deleting file from storage: %s", e)
            return False


storage_service = StorageService()
