from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from datetime import datetime
from database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    raw_text = Column(Text, nullable=False)
    vendor_name = Column(String, nullable=True)
    total_amount = Column(Float, nullable=True)
    subtotal_amount = Column(Float, nullable=True)
    tax_amount = Column(Float, nullable=True)
    tip_amount = Column(Float, nullable=True)
    line_items = Column(JSON, nullable=True)
    invoice_date = Column(String, nullable=True)
    confidence_score = Column(Integer, nullable=True)
    confidence_rationale = Column(Text, nullable=True)
    status = Column(String, default="Pending Review", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
