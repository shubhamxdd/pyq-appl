from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class ChatSessionBase(BaseModel):
    title: str = "New Chat"

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    selected_resource_ids: Optional[List[UUID]] = None

class ChatSessionOut(ChatSessionBase):
    id: UUID
    user_id: UUID
    selected_resource_ids: Optional[List[UUID]] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
