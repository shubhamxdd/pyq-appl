from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class QuestionCreate(BaseModel):
    content: str
    resource_ids: List[UUID]
    delivery_mode: str = "stream" # stream | background

class QuestionOut(BaseModel):
    id: UUID
    user_id: UUID
    content: str
    delivery_mode: str
    created_at: datetime

    class Config:
        from_attributes = True
