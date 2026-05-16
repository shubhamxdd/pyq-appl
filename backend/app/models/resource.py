from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base

class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    type = Column(String, nullable=False) # notes | syllabus | past_paper | other
    status = Column(String, default="pending") # pending | processing | ready | failed
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="resources")
