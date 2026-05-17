from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import pypdfium2 as pdfium
from ..database import get_db
from ..models.user import User
from ..models.resource import Resource
from ..schemas.resource import ResourceOut, ResourceUpdate
from ..routers.auth import get_current_user
from ..services.storage import storage_service
from arq import create_pool
from ..config import settings
from arq.connections import RedisSettings

router = APIRouter(prefix="/resources", tags=["resources"])

@router.post("/", response_model=ResourceOut)
async def upload_resource(
    type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if file.content_type not in ["application/pdf", "text/plain"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and Text files are supported"
        )
    
    # Chunked read with size enforcement (CodeRabbit fix)
    MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    CHUNK_SIZE = 1024 * 1024 # 1MB chunks
    content = bytearray()
    total_size = 0
    
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size allowed is {settings.MAX_FILE_SIZE_MB}MB"
            )
        content.extend(chunk)
    
    # Page count check for PDFs (User Request)
    if file.content_type == "application/pdf":
        try:
            pdf = pdfium.PdfDocument(bytes(content))
            num_pages = len(pdf)
            if num_pages > settings.MAX_OCR_PAGES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File has {num_pages} pages. Maximum {settings.MAX_OCR_PAGES} pages allowed for processing."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or corrupted PDF file: {str(e)}"
            )

    # Generate unique filename for storage
    ext = file.filename.split('.')[-1]
    object_name = f"user_{current_user.id}/{uuid.uuid4()}.{ext}"
    
    # Upload to DigitalOcean Spaces
    file_url = storage_service.upload_file(content, object_name, file.content_type)
    if not file_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file to storage"
        )
    
    # Create DB record (not committed yet)
    new_resource = Resource(
        user_id=current_user.id,
        filename=file.filename,
        file_url=file_url,
        type=type,
        status="processing"
    )
    db.add(new_resource)
    await db.flush() # Flush to get the ID but don't commit
    
    # Enqueue background extraction task before committing DB
    try:
        redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        await redis.enqueue_job('extraction_task', str(new_resource.id))
        
        # Only commit if enqueue was successful
        await db.commit()
        await db.refresh(new_resource)
    except Exception as e:
        await db.rollback()
        # Should also ideally delete the file from Spaces here if we were strict
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue background task: {str(e)}"
        )
    
    return new_resource

@router.get("/", response_model=List[ResourceOut])
async def list_resources(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Resource).where(Resource.user_id == current_user.id).order_by(Resource.created_at.desc())
    )
    return result.scalars().all()

@router.delete("/{resource_id}")
async def delete_resource(
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Resource).where(Resource.id == resource_id, Resource.user_id == current_user.id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    # Delete from Spaces
    object_name = resource.file_url.replace(f"{settings.SPACES_PUBLIC_URL}/", "")
    success = storage_service.delete_file(object_name)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file from cloud storage. Database record preserved."
        )
    
    # Delete from DB only after storage is confirmed deleted
    await db.delete(resource)
    await db.commit()
    
    return {"message": "Resource deleted successfully"}

@router.patch("/{resource_id}", response_model=ResourceOut)
async def update_resource(
    resource_id: uuid.UUID,
    data: ResourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Resource).where(Resource.id == resource_id, Resource.user_id == current_user.id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    if data.filename:
        resource.filename = data.filename
        
    await db.commit()
    await db.refresh(resource)
    return resource

@router.post("/{resource_id}/retry", response_model=ResourceOut)
async def retry_extraction(
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Resource).where(Resource.id == resource_id, Resource.user_id == current_user.id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    # Update status to processing (don't commit yet)
    resource.status = "processing"
    
    # Re-enqueue background extraction task before committing DB
    try:
        redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        await redis.enqueue_job('extraction_task', str(resource.id))
        
        # Only commit if enqueue was successful
        await db.commit()
        await db.refresh(resource)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue background task: {str(e)}"
        )
    
    return resource

@router.post("/{resource_id}/stop", response_model=ResourceOut)
async def stop_processing(
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Resource).where(Resource.id == resource_id, Resource.user_id == current_user.id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    
    # Mark as failed ONLY if it is still processing.
    # If it is already 'ready', we don't want to overwrite it.
    if resource.status == "processing":
        resource.status = "failed"
        await db.commit()
        await db.refresh(resource)
    
    return resource
