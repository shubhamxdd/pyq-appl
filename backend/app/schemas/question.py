from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class QuestionCreate(BaseModel):
    content: str
    resource_ids: List[UUID]
    session_id: Optional[UUID] = None
    delivery_mode: str = "stream" # stream | background

class QuestionOut(BaseModel):
    id: UUID
    user_id: UUID
    session_id: Optional[UUID] = None
    content: str
    delivery_mode: str
    created_at: datetime

    class Config:
        from_attributes = True
