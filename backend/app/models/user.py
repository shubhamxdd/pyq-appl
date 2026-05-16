from sqlalchemy import Column, String, Integer, DateTime, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    google_id = Column(String, nullable=True)
    plan = Column(String, default="free") # free | paid
    questions_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    resources = relationship("Resource", back_populates="user", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="user", cascade="all, delete-orphan")
    papers = relationship("Paper", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
