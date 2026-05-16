from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base

# Association table for Question-Resource (many-to-many)
question_resources = Table(
    "question_resources",
    Base.metadata,
    Column("question_id", UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True),
    Column("resource_id", UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True),
)

class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    delivery_mode = Column(String, nullable=False) # stream | background
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="questions")
    resources = relationship("Resource", secondary=question_resources)
    answer = relationship("Answer", back_populates="question", uselist=False, cascade="all, delete-orphan")
