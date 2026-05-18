from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import uuid
import json
import logging

from ..database import get_db
from ..models.user import User
from ..models.resource import Resource
from ..models.paper import Paper, paper_resources
from ..models.paper_output import PaperOutput
from ..schemas.paper import (
    PaperCreate, PaperOut, PaperUpdate, 
    PaperOutputOut, PaperOutputToggle, 
    FormatDetectionRequest
)
from .auth import get_current_user
from ..llm.client import open_router_client
from ..llm.prompts import DETECT_FORMAT_PROMPT
from ..config import settings
from arq import create_pool
from arq.connections import RedisSettings
from ..services.pdf import generate_paper_pdf
from ..services.storage import storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/papers", tags=["papers"])

@router.post("/detect-format")
async def detect_format(
    data: FormatDetectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch the resource
    result = await db.execute(
        select(Resource).where(Resource.id == data.resource_id, Resource.user_id == current_user.id)
    )
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    if not resource.extracted_text:
        raise HTTPException(status_code=400, detail="Resource has no extracted text. Please wait for processing.")

    # Call LLM for format detection
    messages = [
        {"role": "system", "content": "You are a document analyzer."},
        {"role": "user", "content": f"{DETECT_FORMAT_PROMPT}\n\nPaper Content:\n{resource.extracted_text[:10000]}"}
    ]

    try:
        # Collect stream into full response
        full_response = ""
        async for chunk in open_router_client.stream_chat(messages):
            full_response += chunk
        
        # Parse JSON from response
        # LLM might return markdown code blocks, strip them if present
        clean_json = full_response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        
        format_config = json.loads(clean_json)
        return format_config
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect format: {str(e)}")

@router.post("", response_model=PaperOut)
async def create_paper(
    data: PaperCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not data.resources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one resource must be selected."
        )

    # 1. Quota Check
    if current_user.plan == "free":
        from datetime import datetime, date
        
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1)
        
        count_result = await db.execute(
            select(func.count(Paper.id))
            .where(Paper.user_id == current_user.id)
            .where(Paper.created_at >= start_of_month)
        )
        paper_count = count_result.scalar_one()
        if paper_count >= settings.PAPERS_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free plan limit reached ({settings.PAPERS_LIMIT} papers per month). Please upgrade to generate more."
            )

    # 2. Create Paper record
    new_paper = Paper(
        user_id=current_user.id,
        title=data.title,
        format_config=data.format_config or {},
        delivery_mode=data.delivery_mode,
        status="pending"
    )
    db.add(new_paper)
    await db.flush()

    # 3. Link Resources
    for res_link in data.resources:
        # Verify resource exists and belongs to user
        res_result = await db.execute(
            select(Resource).where(Resource.id == res_link.resource_id, Resource.user_id == current_user.id)
        )
        if not res_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Resource {res_link.resource_id} not found or unauthorized."
            )
        
        # Insert into association table
        await db.execute(
            paper_resources.insert().values(
                paper_id=new_paper.id,
                resource_id=res_link.resource_id,
                resource_role=res_link.role
            )
        )

    await db.commit()
    await db.refresh(new_paper)
    
    from ..models.job import Job
    new_job = Job(
        user_id=current_user.id,
        job_type="generate_paper",
        status="queued",
        ref_id=new_paper.id
    )
    db.add(new_job)
    await db.flush()
    
    # 4. Enqueue background task
    redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    try:
        job = await redis.enqueue_job("generate_paper_task", str(new_paper.id), str(new_job.id))
        if job is None:
            raise RuntimeError("Failed to enqueue generate_paper_task")
        await db.commit()
    except Exception as e:
        logger.error(f"Redis enqueue error: {e}")
        new_paper.status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Paper generation queued failed, please retry."
        )
    finally:
        await redis.close()
    
    return new_paper

@router.get("", response_model=List[PaperOut])
async def list_papers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Paper).where(Paper.user_id == current_user.id).order_by(Paper.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{paper_id}", response_model=PaperOut)
async def get_paper(
    paper_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Paper).where(Paper.id == paper_id, Paper.user_id == current_user.id)
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper

@router.patch("/{paper_id}", response_model=PaperOut)
async def update_paper(
    paper_id: uuid.UUID,
    data: PaperUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Paper).where(Paper.id == paper_id, Paper.user_id == current_user.id)
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
        
    if data.title:
        paper.title = data.title
        
    await db.commit()
    await db.refresh(paper)
    return paper

@router.delete("/{paper_id}")
async def delete_paper(
    paper_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Paper).where(Paper.id == paper_id, Paper.user_id == current_user.id)
    )
    paper = result.scalar_one_or_none()
    
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
        
    # Check if there are outputs with PDFs to clean up storage
    output_result = await db.execute(
        select(PaperOutput).where(PaperOutput.paper_id == paper_id)
    )
    output = output_result.scalar_one_or_none()
    
    if output:
        if output.pdf_url:
            object_name = output.pdf_url.replace(f"{settings.SPACES_PUBLIC_URL}/", "")
            storage_service.delete_file(object_name)
        if output.question_pdf_url:
            object_name = output.question_pdf_url.replace(f"{settings.SPACES_PUBLIC_URL}/", "")
            storage_service.delete_file(object_name)
            
    # Deleting the paper will cascade and delete PaperOutput and paper_resources automatically
    await db.delete(paper)
    await db.commit()
    
    return {"message": "Paper deleted successfully"}

@router.get("/{paper_id}/output", response_model=PaperOutputOut)
async def get_paper_output(
    paper_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify paper ownership
    result = await db.execute(
        select(Paper).where(Paper.id == paper_id, Paper.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Paper not found")

    output_result = await db.execute(
        select(PaperOutput).where(PaperOutput.paper_id == paper_id)
    )
    output = output_result.scalar_one_or_none()
    if not output:
        raise HTTPException(status_code=404, detail="Paper output not yet generated")
    
    return output

@router.patch("/{paper_id}/output", response_model=PaperOutputOut)
async def toggle_output_settings(
    paper_id: uuid.UUID,
    data: PaperOutputToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify paper ownership
    result = await db.execute(
        select(Paper).where(Paper.id == paper_id, Paper.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Paper not found")

    output_result = await db.execute(
        select(PaperOutput).where(PaperOutput.paper_id == paper_id)
    )
    output = output_result.scalar_one_or_none()
    if not output:
        raise HTTPException(status_code=404, detail="Paper output not found")
    
    if data.include_answers is not None:
        output.include_answers = data.include_answers
    if data.include_explanations is not None:
        output.include_explanations = data.include_explanations
        
    await db.commit()
    await db.refresh(output)
    return output

@router.get("/{paper_id}/pdf")
async def get_paper_pdf_url(
    paper_id: uuid.UUID,
    mode: str = "full", # full | questions_only
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch paper and output
    result = await db.execute(
        select(Paper).where(Paper.id == paper_id, Paper.user_id == current_user.id)
    )
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    output_result = await db.execute(
        select(PaperOutput).where(PaperOutput.paper_id == paper_id)
    )
    output = output_result.scalar_one_or_none()
    if not output:
        raise HTTPException(status_code=404, detail="Paper output not yet generated")

    # 2. Check if specific PDF already exists
    if mode == "questions_only" and output.question_pdf_url:
        return {"url": output.question_pdf_url}
    elif mode == "full" and output.pdf_url:
        return {"url": output.pdf_url}

    # 3. Determine PDF settings based on mode
    include_answers = False
    include_explanations = False
    
    if mode == "full":
        include_answers = output.include_answers
        include_explanations = output.include_explanations

    # 4. Generate PDF
    try:
        pdf_file = await generate_paper_pdf(
            title=paper.title + (" (Questions Only)" if mode == "questions_only" else ""),
            questions=output.questions,
            format_config=paper.format_config,
            include_answers=include_answers,
            include_explanations=include_explanations
        )
    except Exception as e:
        logger.error(f"PDF Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

    # 5. Upload to Spaces
    suffix = "questions" if mode == "questions_only" else "full"
    object_name = f"papers/{paper_id}_{suffix}_{uuid.uuid4().hex[:8]}.pdf"
    pdf_url = storage_service.upload_file(pdf_file.getvalue(), object_name)
    
    if not pdf_url:
        raise HTTPException(status_code=500, detail="Failed to upload PDF to storage")

    # 6. Save URL to DB
    if mode == "questions_only":
        output.question_pdf_url = pdf_url
    else:
        output.pdf_url = pdf_url
        
    await db.commit()

    return {"url": pdf_url}
