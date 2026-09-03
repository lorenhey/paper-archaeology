from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from paper_archaeology.models.db import Base

def get_engine(db_path: str = "sqlite:///paper_archaeology.db"):
    return create_engine(db_path, echo=False)

def get_session(engine):
    Session = sessionmaker(bind=engine)
    return Session()

def init_db(engine):
    Base.metadata.create_all(engine)
