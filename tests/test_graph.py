import pytest
from paper_archaeology.models.db import Work, WorkRelationship, RelationshipType, WorkType
from paper_archaeology.core.database import get_engine, init_db, get_session
from paper_archaeology.core.graph import GraphAnalyzer

@pytest.fixture
def session():
    engine = get_engine("sqlite:///:memory:")
    init_db(engine)
    session = get_session(engine)
    yield session
    session.close()

def test_graph_analyzer_shortest_path(session):
    w1 = Work(id=1, canonical_title="Paper A", year=1950, work_type=WorkType.PAPER)
    w2 = Work(id=2, canonical_title="Paper B", year=1940, work_type=WorkType.PAPER)
    w3 = Work(id=3, canonical_title="Paper C", year=1920, work_type=WorkType.PAPER)
    session.add_all([w1, w2, w3])
    
    # 1 cites 2, 2 cites 3
    r1 = WorkRelationship(id=1, source_work_id=1, target_work_id=2, relationship_type=RelationshipType.CITES)
    r2 = WorkRelationship(id=2, source_work_id=2, target_work_id=3, relationship_type=RelationshipType.CITES)
    session.add_all([r1, r2])
    session.commit()
    
    analyzer = GraphAnalyzer(session)
    path = analyzer.get_path(1, 3)
    assert path == [1, 2, 3]

def test_graph_analyzer_precursors_and_descendants(session):
    w1 = Work(id=1, canonical_title="Paper A", year=1950, work_type=WorkType.PAPER)
    w2 = Work(id=2, canonical_title="Paper B", year=1940, work_type=WorkType.PAPER)
    session.add_all([w1, w2])
    
    # 1 cites 2
    r1 = WorkRelationship(id=1, source_work_id=1, target_work_id=2, relationship_type=RelationshipType.CITES)
    session.add(r1)
    session.commit()
    
    analyzer = GraphAnalyzer(session)
    precursors = analyzer.get_precursors(1)
    assert len(precursors) == 1
    assert precursors[0]["id"] == 2
    
    descendants = analyzer.get_descendants(2)
    assert len(descendants) == 1
    assert descendants[0]["id"] == 1
