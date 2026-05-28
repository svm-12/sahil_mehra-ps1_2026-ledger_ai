from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class LineItem(BaseModel):
    description: str = Field(..., description="Description or name of the purchased item.")
    quantity: Optional[float] = Field(None, description="Quantity of the item purchased. Use None if not found.")
    unit_price: Optional[float] = Field(None, description="Unit price of the item. Use None if not found.")
    total_price: Optional[float] = Field(None, description="Total price for this line item (quantity * unit_price). Use None if not found.")

class InvoiceExtraction(BaseModel):
    vendor_name: Optional[str] = Field(None, description="Name of the vendor or merchant issuing the receipt or invoice. Use None if not found.")
    subtotal_amount: Optional[float] = Field(None, description="Subtotal amount before taxes and tips. Use None if not found.")
    tax_amount: Optional[float] = Field(None, description="Total tax or VAT amount. Use None if not found.")
    tip_amount: Optional[float] = Field(None, description="Total tip or gratuity amount. Use None if not found.")
    total_amount: Optional[float] = Field(None, description="Total amount due or paid, as a floating point number. Use None if not found.")
    line_items: List[LineItem] = Field(default_factory=list, description="List of individual items purchased.")
    invoice_date: Optional[str] = Field(None, description="Date of the invoice or receipt in YYYY-MM-DD format (or matching original text if not standard). Use None if not found.")
    confidence_score: int = Field(..., description="An integer confidence score from 0 to 100 representing how reliable the extracted details are.")
    confidence_rationale: str = Field(..., description="A short, professional sentence explaining the assigned confidence score (e.g. 'Highly readable text with explicit total and vendor', 'Amount is handwritten and hard to read').")

class DocumentExtractRequest(BaseModel):
    raw_text: Optional[str] = Field(None, description="Messy, unstructured raw text from the invoice or receipt.")
    image_base64: Optional[str] = Field(None, description="Base64 encoded string of the receipt or invoice image/pdf.")
    mime_type: Optional[str] = Field("image/jpeg", description="MIME type of the uploaded file (e.g., image/jpeg, image/png, application/pdf).")
    sandbox: Optional[bool] = Field(False, description="Whether to run in high-fidelity sandbox mode to simulate AI extraction without key.")

class DocumentCreate(BaseModel):
    raw_text: str
    vendor_name: Optional[str] = None
    total_amount: Optional[float] = None
    subtotal_amount: Optional[float] = None
    tax_amount: Optional[float] = None
    tip_amount: Optional[float] = None
    line_items: Optional[List[dict]] = None
    invoice_date: Optional[str] = None
    confidence_score: Optional[int] = None
    confidence_rationale: Optional[str] = None
    status: str = "Pending Review"

class DocumentUpdate(BaseModel):
    vendor_name: Optional[str] = None
    total_amount: Optional[float] = None
    subtotal_amount: Optional[float] = None
    tax_amount: Optional[float] = None
    tip_amount: Optional[float] = None
    line_items: Optional[List[dict]] = None
    invoice_date: Optional[str] = None
    confidence_score: Optional[int] = None
    confidence_rationale: Optional[str] = None
    status: Optional[str] = Field(None, description="Current status of the document. If not provided, main.py automatically transitions it to 'Audited' upon verification.")

class DocumentResponse(BaseModel):
    id: int
    raw_text: str
    vendor_name: Optional[str] = None
    total_amount: Optional[float] = None
    subtotal_amount: Optional[float] = None
    tax_amount: Optional[float] = None
    tip_amount: Optional[float] = None
    line_items: Optional[List[dict]] = None
    invoice_date: Optional[str] = None
    confidence_score: Optional[int] = None
    confidence_rationale: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True  # Supports Pydantic v1 / v2 compatibility
