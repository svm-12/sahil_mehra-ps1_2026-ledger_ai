from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from database import engine, Base, get_db, SessionLocal
import models
import schemas
from gemini_service import gemini_service

from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    # Run a simple schema migration to add the new columns if they are missing
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN subtotal_amount FLOAT"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN tax_amount FLOAT"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN tip_amount FLOAT"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN discount_amount FLOAT"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN misc_fees FLOAT"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN has_math_mismatch INTEGER"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN extracted_total_amount FLOAT"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN line_items JSON"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        pass # Database is ready
    except Exception:
        pass
    finally:
        db.close()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Invoice Auditor Backend is running!"}

@app.get("/status")
def get_status():
    return {"gemini_api_key_configured": gemini_service.is_configured()}

@app.get("/documents")
def get_documents(db: Session = Depends(get_db)):
    return db.query(models.Document).order_by(models.Document.id.desc()).all()

@app.post("/documents/extract")
def extract_document(req: schemas.DocumentExtractRequest, db: Session = Depends(get_db)):
    try:
        if req.sandbox:
            extracted = gemini_service.simulate_extraction(req.raw_text, req.image_base64, req.mime_type)
        else:
            extracted = gemini_service.extract_invoice(req.raw_text, req.image_base64, req.mime_type)
            
        # Mathematical auto-correction
        line_items = extracted.line_items or []
        subtotal = sum(item.total_price or 0.0 for item in line_items) if line_items else (extracted.subtotal_amount or 0.0)
        tax = extracted.tax_amount or 0.0
        tip = extracted.tip_amount or 0.0
        misc_fees = extracted.misc_fees or 0.0
        discount = extracted.discount_amount or 0.0
        total_exclusive = subtotal + tax + tip + misc_fees - discount
        total_inclusive = subtotal + tip + misc_fees - discount
        extracted_total = extracted.total_amount or 0.0
        
        if abs(extracted_total - total_exclusive) <= 0.05:
            total = total_exclusive
            has_mismatch = 0
        elif abs(extracted_total - total_inclusive) <= 0.05:
            total = total_inclusive
            has_mismatch = 0
        else:
            total = total_exclusive
            has_mismatch = 1

        doc = models.Document(
            raw_text=req.raw_text or "Image/PDF uploaded",
            vendor_name=extracted.vendor_name,
            total_amount=total,
            subtotal_amount=subtotal,
            tax_amount=tax,
            tip_amount=tip,
            misc_fees=misc_fees,
            discount_amount=discount,
            extracted_total_amount=extracted_total,
            has_math_mismatch=has_mismatch,
            line_items=[item.model_dump() for item in extracted.line_items] if extracted.line_items else [],
            invoice_date=extracted.invoice_date,
            confidence_score=extracted.confidence_score,
            confidence_rationale=extracted.confidence_rationale,
            status="Pending Review"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/documents/{doc_id}")
def update_document(doc_id: int, req: schemas.DocumentUpdate, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Mathematical auto-correction
    line_items = req.line_items if req.line_items is not None else doc.line_items
    subtotal = sum(float(item.get("total_price") or 0.0) for item in line_items) if line_items else (req.subtotal_amount or doc.subtotal_amount or 0.0)
    tax = req.tax_amount if req.tax_amount is not None else (doc.tax_amount or 0.0)
    tip = req.tip_amount if req.tip_amount is not None else (doc.tip_amount or 0.0)
    misc_fees = req.misc_fees if req.misc_fees is not None else (doc.misc_fees or 0.0)
    discount = req.discount_amount if req.discount_amount is not None else (doc.discount_amount or 0.0)
    total_exclusive = subtotal + tax + tip + misc_fees - discount
    total_inclusive = subtotal + tip + misc_fees - discount
    extracted_total = doc.extracted_total_amount or 0.0
    
    if abs(extracted_total - total_exclusive) <= 0.05:
        total = total_exclusive
        has_mismatch = 0
    elif abs(extracted_total - total_inclusive) <= 0.05:
        total = total_inclusive
        has_mismatch = 0
    else:
        total = total_exclusive
        has_mismatch = 1

    doc.vendor_name = req.vendor_name if req.vendor_name is not None else doc.vendor_name
    doc.total_amount = total
    doc.subtotal_amount = subtotal
    doc.tax_amount = tax
    doc.tip_amount = tip
    doc.misc_fees = misc_fees
    doc.discount_amount = discount
    doc.has_math_mismatch = has_mismatch
    if req.line_items is not None:
        doc.line_items = req.line_items
    doc.invoice_date = req.invoice_date
    doc.confidence_score = req.confidence_score
    doc.confidence_rationale = req.confidence_rationale
    doc.status = "Audited"
    
    db.commit()
    db.refresh(doc)
    return doc

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
