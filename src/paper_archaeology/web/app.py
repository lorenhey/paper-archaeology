from fastapi import FastAPI, Request, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy.orm import Session
from paper_archaeology.core.database import get_engine, get_session
from paper_archaeology.models.db import Work

app = FastAPI(title="Paper Archaeology")

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Optional: static files for css/js if needed later
# app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

def get_db():
    engine = get_engine()
    db = get_session(engine)
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def index(request: Request, db: Session = Depends(get_db)):
    works = db.query(Work).all()
    return templates.TemplateResponse("index.html", {"request": request, "works": works})

@app.get("/paper/{paper_id}")
def paper_detail(request: Request, paper_id: int, db: Session = Depends(get_db)):
    work = db.query(Work).filter(Work.id == paper_id).first()
    if not work:
        return {"error": "Not Found"}
    return templates.TemplateResponse("paper.html", {"request": request, "work": work})
