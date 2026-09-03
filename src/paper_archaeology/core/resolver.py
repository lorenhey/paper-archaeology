from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from paper_archaeology.models.db import (
    Work, WorkType, Expression, Publication, Person, WorkAuthor, Evidence
)
from paper_archaeology.connectors import OpenAlexConnector, CrossrefConnector

class PaperResolver:
    def __init__(self, session: Session):
        self.session = session
        self.openalex = OpenAlexConnector()
        self.crossref = CrossrefConnector()
        
    def _get_or_create_person(self, name: str, orcid: Optional[str] = None) -> Person:
        query = self.session.query(Person).filter(Person.canonical_name == name)
        if orcid:
            query = self.session.query(Person).filter(Person.orcid == orcid)
            
        person = query.first()
        if not person:
            person = Person(canonical_name=name, orcid=orcid)
            self.session.add(person)
            self.session.commit()
        return person

    def resolve_from_openalex(self, openalex_data: Dict[str, Any]) -> Work:
        # Check if we already have it by DOI
        doi = openalex_data.get("doi")
        if doi:
            # openalex doi format is usually https://doi.org/...
            doi = doi.replace("https://doi.org/", "")
            
        # Very simplified resolution for now
        title = openalex_data.get("title") or "Unknown Title"
        year = openalex_data.get("publication_year")
        
        # Check if work exists by title/year (rudimentary deduplication)
        work = self.session.query(Work).filter(Work.canonical_title == title, Work.year == year).first()
        
        if not work:
            work = Work(
                canonical_title=title,
                year=year,
                work_type=WorkType.PAPER, # simplified
            )
            self.session.add(work)
            
            # Authors
            for authorship in openalex_data.get("authorships", []):
                author_data = authorship.get("author", {})
                name = author_data.get("display_name")
                if name:
                    orcid = author_data.get("orcid")
                    person = self._get_or_create_person(name, orcid)
                    work_author = WorkAuthor(work=work, person=person)
                    self.session.add(work_author)
                    
            # Expression & Publication
            expression = Expression(
                work=work,
                language=openalex_data.get("language", "en"),
                title=title
            )
            self.session.add(expression)
            
            venue = None
            if openalex_data.get("primary_location"):
                source = openalex_data["primary_location"].get("source")
                if source:
                    venue = source.get("display_name")
                    
            publication = Publication(
                expression=expression,
                doi=doi,
                venue=venue,
                year=year
            )
            self.session.add(publication)
            
            # Evidence
            evidence = Evidence(
                entity_type="Work",
                entity_id=0, # Will set after flush
                source="OpenAlex",
                confidence=0.9
            )
            self.session.add(evidence)
            self.session.commit()
            
            # update evidence id
            evidence.entity_id = work.id
            self.session.commit()
            
        return work
