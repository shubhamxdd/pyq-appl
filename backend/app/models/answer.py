from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base

class Answer(Base):
    __tablename__ = "answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), unique=True, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String, default="pending") # pending | generating | done | failed
    pdf_url = Column(String, nullable=True)
    citations = Column(JSON, nullable=True) # Array of {resource_id, filename}
    created_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="answer")
