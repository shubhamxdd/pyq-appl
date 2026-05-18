from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import json

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
            continue
        
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
    
    # 4. Enqueue background task
    redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await redis.enqueue_job("generate_paper_task", str(new_paper.id))
    
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
