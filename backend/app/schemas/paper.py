from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class PaperResourceLink(BaseModel):
    resource_id: UUID
    role: str # syllabus | past_paper | notes

class PaperCreate(BaseModel):
    title: str
    resources: List[PaperResourceLink]
    format_config: Optional[Dict[str, Any]] = None
    delivery_mode: str = "background"

class PaperUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None

class PaperOutputToggle(BaseModel):
    include_answers: Optional[bool] = None
    include_explanations: Optional[bool] = None

class PaperOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    format_config: Dict[str, Any]
    status: str
    delivery_mode: str
    created_at: datetime

    class Config:
        from_attributes = True

class PaperQuestion(BaseModel):
    type: str # mcq | short | long
    marks: int
    topic: str
    question_text: str
    options: Optional[List[str]] = None
    answer: str
    explanation: str

class PaperOutputOut(BaseModel):
    id: UUID
    paper_id: UUID
    questions: List[Dict[str, Any]]
    include_answers: bool
    include_explanations: bool
    pdf_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FormatDetectionRequest(BaseModel):
    resource_id: UUID
