from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base

class PaperOutput(Base):
    __tablename__ = "paper_outputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_id = Column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), unique=True, nullable=False)
    questions = Column(JSON, nullable=False) # Array of question objects
    include_answers = Column(Boolean, default=True)
    include_explanations = Column(Boolean, default=True)
    pdf_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    paper = relationship("Paper", back_populates="output")
