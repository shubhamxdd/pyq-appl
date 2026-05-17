from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class ResourceBase(BaseModel):
    filename: str
    type: str # notes | syllabus | past_paper | other

class ResourceOut(ResourceBase):
    id: UUID
    user_id: UUID
    file_url: str
    status: str # pending | processing | ready | failed
    processing_progress: Optional[int] = 0
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ResourceUpdate(BaseModel):
    filename: Optional[str] = None

class ResourceList(BaseModel):
    resources: List[ResourceOut]
