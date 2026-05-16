from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_type = Column(String, nullable=False) # ingest | answer | generate_paper
    status = Column(String, default="queued") # queued | running | done | failed
    ref_id = Column(UUID(as_uuid=True), nullable=True) # Points to question_id or paper_id
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="jobs")
