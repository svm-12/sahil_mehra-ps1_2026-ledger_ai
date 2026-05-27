from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from database import engine, Base, get_db, SessionLocal
import models
import schemas
from gemini_service import gemini_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    if db.query(models.Document).count() == 0:
        seed_docs = [
            models.Document(
                raw_text="Example Receipt 1: Target $45.00",
                vendor_name="Target",
                total_amount=45.00,
                status="Pending Review",
                confidence_score=95,
                confidence_rationale="Clear text"
            ),
            models.Document(
                raw_text="Example Receipt 2: Walmart $12.50",
                vendor_name="Walmart",
                total_amount=12.50,
                status="Pending Review",
                confidence_score=90,
                confidence_rationale="Clear text"
            ),
            models.Document(
                raw_text="Example Receipt 3: Starbucks $5.50",
                vendor_name="Starbucks",
                total_amount=5.50,
                status="Audited",
                confidence_score=85,
                confidence_rationale="Clear text"
            )
        ]
        db.add_all(seed_docs)
        db.commit()
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
            extracted = gemini_service.simulate_extraction(req.raw_text, req.image_base64)
        else:
            extracted = gemini_service.extract_invoice(req.raw_text, req.image_base64)
            
        doc = models.Document(
            raw_text=req.raw_text or "Image uploaded",
            vendor_name=extracted.vendor_name,
            total_amount=extracted.total_amount,
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
        
    doc.vendor_name = req.vendor_name
    doc.total_amount = req.total_amount
    doc.invoice_date = req.invoice_date
    doc.confidence_score = req.confidence_score
    doc.confidence_rationale = req.confidence_rationale
    doc.status = "Audited"
    
    db.commit()
    db.refresh(doc)
    return doc

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
