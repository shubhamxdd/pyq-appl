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
from ..models.chat_session import ChatSession
from ..schemas.question import QuestionCreate
from ..schemas.chat_session import ChatSessionOut, ChatSessionCreate, ChatSessionUpdate
from ..routers.auth import get_current_user
from ..llm.client import open_router_client
from ..llm.prompts import SOLVER_SYSTEM, SOLVER_USER_TEMPLATE

router = APIRouter(prefix="/solver", tags=["solver"])

# --- SESSION ENDPOINTS ---

@router.post("/sessions", response_model=ChatSessionOut)
async def create_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_session = ChatSession(user_id=current_user.id)
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session

@router.get("/sessions", response_model=List[ChatSessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == current_user.id).order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()

@router.get("/sessions/{session_id}/history")
async def get_session_history(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ownership
    sess_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    if not sess_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch Questions and Answers
    result = await db.execute(
        select(Question).where(Question.session_id == session_id).order_by(Question.created_at.asc())
    )
    questions = result.scalars().all()
    
    history = []
    for q in questions:
        # Load associated answer
        ans_result = await db.execute(select(Answer).where(Answer.question_id == q.id))
        ans = ans_result.scalar_one_or_none()
        history.append({
            "role": "user",
            "content": q.content,
            "created_at": q.created_at
        })
        if ans:
            history.append({
                "role": "assistant",
                "content": ans.content,
                "status": ans.status,
                "created_at": ans.created_at
            })
            
    return history

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted"}

@router.patch("/sessions/{session_id}", response_model=ChatSessionOut)
async def update_session(
    session_id: uuid.UUID,
    data: ChatSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if data.title:
        session.title = data.title
        
    await db.commit()
    await db.refresh(session)
    return session

# --- QUESTION ENDPOINTS ---

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

    # 3. Handle Session
    session_id = data.session_id
    if not session_id:
        # Auto-create session if none provided
        new_sess = ChatSession(user_id=current_user.id, title=data.content[:30] + "...")
        db.add(new_sess)
        await db.flush()
        session_id = new_sess.id

    # 4. Create Question and Answer records
    new_question = Question(
        user_id=current_user.id,
        session_id=session_id,
        content=data.content,
        delivery_mode="stream"
    )
    db.add(new_question)
    await db.flush()

    new_answer = Answer(
        question_id=new_question.id,
        content="",
        status="generating"
    )
    db.add(new_answer)
    
    # Update quota
    current_user.questions_used += 1
    await db.commit()

    # 5. Prepare LLM Call
    messages = [
        {"role": "system", "content": SOLVER_SYSTEM},
        {"role": "user", "content": SOLVER_USER_TEMPLATE.format(context=combined_context, question=data.content)}
    ]

    async def event_generator():
        full_response = ""
        try:
            async for chunk in open_router_client.stream_chat(messages):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk, 'session_id': str(session_id)})}\n\n"
            
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
