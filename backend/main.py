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
        db.execute(text("ALTER TABLE documents ADD COLUMN category VARCHAR(255)"))
        db.commit()
    except Exception:
        db.rollback()
        

    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN is_subscription INTEGER DEFAULT 0"))
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

from sqlalchemy import or_

@app.get("/documents")
def get_documents(search: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Document)
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            models.Document.vendor_name.ilike(search_term),
            models.Document.category.ilike(search_term),
            models.Document.raw_text.ilike(search_term)
        ))
    return query.order_by(models.Document.id.desc()).all()

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
            category=extracted.category,
            is_subscription=extracted.is_subscription,
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
    doc.category = req.category if req.category is not None else doc.category
    doc.is_subscription = req.is_subscription if req.is_subscription is not None else doc.is_subscription
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

@app.post("/documents")
def create_document_manual(req: schemas.DocumentCreate, db: Session = Depends(get_db)):
    doc = models.Document(
        raw_text=req.raw_text,
        vendor_name=req.vendor_name,
        category=req.category,
        is_subscription=req.is_subscription,
        total_amount=req.total_amount,
        subtotal_amount=req.subtotal_amount,
        tax_amount=req.tax_amount,
        tip_amount=req.tip_amount,
        discount_amount=req.discount_amount,
        line_items=req.line_items or [],
        invoice_date=req.invoice_date,
        confidence_score=req.confidence_score or 100,
        confidence_rationale=req.confidence_rationale or "Manually entered document.",
        status=req.status
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

from pydantic import BaseModel
class InsightsRequest(BaseModel):
    items: list
@app.post("/analytics/insights")
def generate_insights(req: InsightsRequest):
    try:
        insights = gemini_service.generate_savings_insights(req.items)
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/budget_goals")
def get_budget_goals(db: Session = Depends(get_db)):
    return db.query(models.BudgetGoal).all()

@app.post("/budget_goals")
def create_budget_goal(req: schemas.BudgetGoalCreate, db: Session = Depends(get_db)):
    goal = db.query(models.BudgetGoal).filter(models.BudgetGoal.category == req.category).first()
    if goal:
        goal.amount = req.amount
    else:
        goal = models.BudgetGoal(category=req.category, amount=req.amount)
        db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

@app.delete("/budget_goals/{goal_id}")
def delete_budget_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(models.BudgetGoal).filter(models.BudgetGoal.id == goal_id).first()
    if goal:
        db.delete(goal)
        db.commit()
    return {"message": "Deleted"}

@app.get("/seed")
def seed_dummy_data(db: Session = Depends(get_db)):
    dummy_docs = [
        {
            "vendor_name": "BigBasket",
            "category": "Groceries",
            "is_subscription": 0,
            "total_amount": 1250.0,
            "subtotal_amount": 1250.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Aashirvaad Whole Wheat Atta 5kg", "quantity": 1, "unit_price": 250.0, "total_price": 250.0},
                {"description": "Amul Taaza Toned Milk 1L", "quantity": 2, "unit_price": 70.0, "total_price": 140.0},
                {"description": "Maggi 2-Minute Noodles 400g", "quantity": 3, "unit_price": 60.0, "total_price": 180.0},
                {"description": "Tata Salt 1kg", "quantity": 2, "unit_price": 28.0, "total_price": 56.0},
                {"description": "Fortune Sunlite Sunflower Oil 1L", "quantity": 4, "unit_price": 156.0, "total_price": 624.0}
            ],
            "invoice_date": "2026-05-20"
        },
        {
            "vendor_name": "Amazon India",
            "category": "Electronics",
            "is_subscription": 0,
            "total_amount": 54990.0,
            "subtotal_amount": 54990.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Sony WH-1000XM5 Wireless Headphones", "quantity": 1, "unit_price": 29990.0, "total_price": 29990.0},
                {"description": "Logitech MX Master 3S Mouse", "quantity": 1, "unit_price": 9999.0, "total_price": 9999.0},
                {"description": "Keychron K2 Mechanical Keyboard", "quantity": 1, "unit_price": 8499.0, "total_price": 8499.0},
                {"description": "Anker 65W GaN Charger", "quantity": 2, "unit_price": 3251.0, "total_price": 6502.0}
            ],
            "invoice_date": "2026-05-22"
        },
        {
            "vendor_name": "Zomato",
            "category": "Dining",
            "is_subscription": 0,
            "total_amount": 1050.0,
            "subtotal_amount": 800.0,
            "tax_amount": 40.0,
            "tip_amount": 50.0,
            "misc_fees": 160.0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Paneer Butter Masala", "quantity": 2, "unit_price": 280.0, "total_price": 560.0},
                {"description": "Garlic Naan", "quantity": 4, "unit_price": 60.0, "total_price": 240.0}
            ],
            "invoice_date": "2026-05-25"
        },
        {
            "vendor_name": "Uber",
            "category": "Transport",
            "is_subscription": 0,
            "total_amount": 450.0,
            "subtotal_amount": 450.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Uber Go: Airport to Home", "quantity": 1, "unit_price": 450.0, "total_price": 450.0}
            ],
            "invoice_date": "2026-05-26"
        },
        {
            "vendor_name": "Adobe",
            "category": "Software",
            "is_subscription": 1,
            "total_amount": 4230.0,
            "subtotal_amount": 4230.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Creative Cloud All Apps - 1 Month", "quantity": 1, "unit_price": 4230.0, "total_price": 4230.0}
            ],
            "invoice_date": "2026-05-27"
        },
        {
            "vendor_name": "Netflix",
            "category": "Software",
            "is_subscription": 1,
            "total_amount": 649.0,
            "subtotal_amount": 649.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Netflix Premium Plan - 1 Month", "quantity": 1, "unit_price": 649.0, "total_price": 649.0}
            ],
            "invoice_date": "2026-05-01"
        },
        {
            "vendor_name": "AWS",
            "category": "Software",
            "is_subscription": 1,
            "total_amount": 12500.0,
            "subtotal_amount": 11000.0,
            "tax_amount": 1500.0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "EC2 Instances Compute", "quantity": 1, "unit_price": 8000.0, "total_price": 8000.0},
                {"description": "RDS Database Hosting", "quantity": 1, "unit_price": 3000.0, "total_price": 3000.0}
            ],
            "invoice_date": "2026-05-05"
        },
        {
            "vendor_name": "Blinkit",
            "category": "Groceries",
            "is_subscription": 0,
            "total_amount": 320.0,
            "subtotal_amount": 300.0,
            "tax_amount": 0,
            "tip_amount": 10.0,
            "misc_fees": 10.0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Organic Whole Milk 1L", "quantity": 2, "unit_price": 85.0, "total_price": 170.0},
                {"description": "Brown Bread", "quantity": 1, "unit_price": 50.0, "total_price": 50.0},
                {"description": "Eggs 6 pcs", "quantity": 1, "unit_price": 80.0, "total_price": 80.0}
            ],
            "invoice_date": "2026-05-28"
        },
        {
            "vendor_name": "BSES Rajdhani Power",
            "category": "Utilities",
            "is_subscription": 0,
            "total_amount": 3450.0,
            "subtotal_amount": 3200.0,
            "tax_amount": 250.0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Electricity Bill - May 2026", "quantity": 1, "unit_price": 3200.0, "total_price": 3200.0}
            ],
            "invoice_date": "2026-05-10"
        },
        {
            "vendor_name": "Jio",
            "category": "Utilities",
            "is_subscription": 1,
            "total_amount": 999.0,
            "subtotal_amount": 846.6,
            "tax_amount": 152.4,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "JioFiber Broadband Plan - 150Mbps", "quantity": 1, "unit_price": 846.6, "total_price": 846.6}
            ],
            "invoice_date": "2026-05-15"
        }
    ]
    
    count = 0
    for d in dummy_docs:
        doc = models.Document(
            raw_text="Dummy Seed Data",
            vendor_name=d["vendor_name"],
            category=d["category"],
            total_amount=d["total_amount"],
            subtotal_amount=d["subtotal_amount"],
            tax_amount=d["tax_amount"],
            tip_amount=d["tip_amount"],
            misc_fees=d["misc_fees"],
            discount_amount=d["discount_amount"],
            line_items=d["line_items"],
            invoice_date=d["invoice_date"],
            confidence_score=100,
            confidence_rationale="Seed data for testing analytics.",
            status="Audited",
            is_subscription=d["is_subscription"]
        )
        db.add(doc)
        count += 1
    
    db.commit()
    return {"message": f"Successfully seeded {count} dummy documents."}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
