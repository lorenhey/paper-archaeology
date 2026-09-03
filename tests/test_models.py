import pytest
from paper_archaeology.models.db import Work, WorkType
from paper_archaeology.core.database import get_engine, init_db, get_session

@pytest.fixture
def session():
    engine = get_engine("sqlite:///:memory:")
    init_db(engine)
    session = get_session(engine)
    yield session
    session.close()

def test_create_work(session):
    w = Work(canonical_title="Test Paper", year=1900, work_type=WorkType.PAPER)
    session.add(w)
    session.commit()
    
    saved = session.query(Work).first()
    assert saved.canonical_title == "Test Paper"
    assert saved.year == 1900
