import time
from paper_archaeology.core.database import get_engine, get_session, init_db
from paper_archaeology.core.resolver import PaperResolver
from paper_archaeology.connectors.openalex import OpenAlexConnector
from paper_archaeology.models.db import Work, WorkRelationship, RelationshipType, Publication

engine = get_engine()
session = get_session(engine)
resolver = PaperResolver(session)
oa = OpenAlexConnector()

def fetch_citations():
    print("Fetching citations for existing works...")
    works = session.query(Work).all()
    for work in works:
        print(f"\nProcessing {work.canonical_title} ({work.year})...")
        # Try to find openalex ID
        # Since our resolver doesn't save OpenAlex ID yet (only DOI), we need to search it again or use DOI
        publication = session.query(Publication).filter(Publication.expression.has(work_id=work.id)).first()
        if not publication or not publication.doi:
            print("  No DOI found, skipping.")
            continue
            
        print(f"  DOI: {publication.doi}")
        oa_work = oa.get_work_by_doi(publication.doi)
        if not oa_work:
            print("  Could not resolve via OpenAlex API, skipping.")
            continue
            
        oa_id = oa_work.get("id")
        # OpenAlex provides referenced_works
        referenced_works = oa_work.get("referenced_works", [])
        print(f"  Found {len(referenced_works)} references.")
        
        # Limit to 5 just to show concept in this corpus script
        for ref_id in referenced_works[:5]:
            ref_data = oa.get_work_by_id(ref_id)
            if ref_data:
                # Import the cited work
                cited_work = resolver.resolve_from_openalex(ref_data)
                
                # Check if relationship exists
                existing = session.query(WorkRelationship).filter(
                    WorkRelationship.source_work_id == work.id,
                    WorkRelationship.target_work_id == cited_work.id
                ).first()
                
                if not existing:
                    rel = WorkRelationship(
                        source_work_id=work.id,
                        target_work_id=cited_work.id,
                        relationship_type=RelationshipType.CITES,
                        confidence=1.0,
                        evidence="OpenAlex referenced_works"
                    )
                    session.add(rel)
                    session.commit()
                    print(f"    Added citation: -> {cited_work.canonical_title}")
                
            time.sleep(1)

if __name__ == "__main__":
    fetch_citations()
