from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import json
from ..database import get_db, SessionLocal
from ..models.user import User
from ..models.resource import Resource
from ..models.question import Question
from ..models.answer import Answer
from ..schemas.question import QuestionCreate
from ..routers.auth import get_current_user
from ..llm.client import open_router_client
from ..llm.prompts import SOLVER_SYSTEM, SOLVER_USER_TEMPLATE

router = APIRouter(prefix="/solver", tags=["solver"])

@router.post("/ask")
async def ask_question(
    data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Quota Check
    if current_user.plan == "free" and current_user.questions_used >= 10:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Monthly question quota exceeded for free tier."
        )

    # 2. Fetch Resources and combine text
    result = await db.execute(
        select(Resource).where(Resource.id.in_(data.resource_ids), Resource.user_id == current_user.id)
    )
    resources = result.scalars().all()
    
    if not resources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid resources selected."
        )

    combined_context = ""
    for res in resources:
        if res.extracted_text:
            combined_context += f"--- Source: {res.filename} ---\n{res.extracted_text}\n\n"

    if not combined_context:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected resources have no extracted text. Please wait for processing to finish."
        )

    # 3. Create Question and Answer records
    new_question = Question(
        user_id=current_user.id,
        content=data.content,
        delivery_mode="stream"
    )
    db.add(new_question)
    await db.flush() # Get question ID

    # Create empty answer record
    new_answer = Answer(
        question_id=new_question.id,
        content="",
        status="generating"
    )
    db.add(new_answer)
    
    # Update quota
    current_user.questions_used += 1
    await db.commit()

    # 4. Prepare LLM Call
    messages = [
        {"role": "system", "content": SOLVER_SYSTEM},
        {"role": "user", "content": SOLVER_USER_TEMPLATE.format(context=combined_context, question=data.content)}
    ]

    async def event_generator():
        full_response = ""
        try:
            async for chunk in open_router_client.stream_chat(messages):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            # Finalize Answer in DB
            async with SessionLocal() as async_db:
                result = await async_db.execute(select(Answer).where(Answer.question_id == new_question.id))
                answer_rec = result.scalar_one_or_none()
                if answer_rec:
                    answer_rec.content = full_response
                    answer_rec.status = "done"
                    await async_db.commit()
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            async with SessionLocal() as async_db:
                result = await async_db.execute(select(Answer).where(Answer.question_id == new_question.id))
                answer_rec = result.scalar_one_or_none()
                if answer_rec:
                    answer_rec.status = "failed"
                    await async_db.commit()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
