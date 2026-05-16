from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, JSON, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base

# Association table for Paper-Resource (many-to-many)
paper_resources = Table(
    "paper_resources",
    Base.metadata,
    Column("paper_id", UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True),
    Column("resource_id", UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True),
    Column("resource_role", String, nullable=False), # syllabus | past_paper | notes
)

class Paper(Base):
    __tablename__ = "papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    format_config = Column(JSON, nullable=False) # {mcq: 15, short: 4, long: 2, ...}
    status = Column(String, default="pending") # pending | generating | done | failed
    delivery_mode = Column(String, default="background") # background
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="papers")
    resources = relationship("Resource", secondary=paper_resources)
    output = relationship("PaperOutput", back_populates="paper", uselist=False, cascade="all, delete-orphan")
