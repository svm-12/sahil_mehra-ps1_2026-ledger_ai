import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add is_subscription migration
migration = """
    try:
        db.execute(text("ALTER TABLE documents ADD COLUMN is_subscription INTEGER DEFAULT 0"))
        db.commit()
    except Exception:
        db.rollback()
"""
content = content.replace("    try:\n        db.execute(text(\"ALTER TABLE documents ADD COLUMN line_items JSON\"))", migration + "\n    try:\n        db.execute(text(\"ALTER TABLE documents ADD COLUMN line_items JSON\"))")

# 2. Add search query parameter to GET /documents
get_docs = """
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
"""
content = re.sub(
    r'@app\.get\("/documents"\)\s*def get_documents\(db: Session = Depends\(get_db\)\):\s*return db\.query\(models\.Document\)\.order_by\(models\.Document\.id\.desc\(\)\)\.all\(\)',
    get_docs.strip(),
    content,
    flags=re.DOTALL
)

# 3. Add is_subscription to extract_document and Document creations
content = content.replace("category=extracted.category,", "category=extracted.category,\n            is_subscription=extracted.is_subscription,")
content = content.replace("doc.category = req.category if req.category is not None else doc.category", "doc.category = req.category if req.category is not None else doc.category\n    doc.is_subscription = req.is_subscription if req.is_subscription is not None else doc.is_subscription")
content = content.replace("category=req.category,", "category=req.category,\n        is_subscription=req.is_subscription,")

# 4. Add budget endpoints
budget_endpoints = """
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
"""
content = content.replace("@app.get(\"/seed\")", budget_endpoints + "\n@app.get(\"/seed\")")

# Update seed endpoint to include is_subscription
content = content.replace('status="Audited"\n        )', 'status="Audited",\n            is_subscription=0\n        )')

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated main.py")
