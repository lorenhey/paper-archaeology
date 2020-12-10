import enum
import datetime
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Table, Enum, DateTime, JSON
from sqlalchemy.orm import declarative_base, relationship, Mapped, mapped_column

Base = declarative_base()

class WorkType(str, enum.Enum):
    PAPER = "paper"
    BOOK = "book"
    PROCEEDINGS = "proceedings"
    LETTER = "letter"
    MEMOIR = "memoir"
    THESIS = "thesis"
    OTHER = "other"

class Person(Base):
    __tablename__ = "people"
    id: Mapped[int] = mapped_column(primary_key=True)
    canonical_name: Mapped[str] = mapped_column(String, index=True)
    alternate_names: Mapped[Optional[str]] = mapped_column(JSON, nullable=True) # List of strings
    orcid: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    viaf: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    wikidata_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)

class Work(Base):
    """
    The abstract scientific concept.
    """
    __tablename__ = "works"
    id: Mapped[int] = mapped_column(primary_key=True)
    canonical_title: Mapped[str] = mapped_column(String)
    original_language: Mapped[Optional[str]] = mapped_column(String)
    year: Mapped[Optional[int]] = mapped_column(Integer)
    work_type: Mapped[WorkType] = mapped_column(Enum(WorkType))
    subject: Mapped[Optional[str]] = mapped_column(String)
    
    expressions: Mapped[List["Expression"]] = relationship(back_populates="work")
    authors: Mapped[List["WorkAuthor"]] = relationship(back_populates="work")
    
class WorkAuthor(Base):
    __tablename__ = "work_authors"
    work_id: Mapped[int] = mapped_column(ForeignKey("works.id"), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), primary_key=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    
    work: Mapped["Work"] = relationship(back_populates="authors")
    person: Mapped["Person"] = relationship()

class Expression(Base):
    """
    The language-specific realization of a Work.
    """
    __tablename__ = "expressions"
    id: Mapped[int] = mapped_column(primary_key=True)
    work_id: Mapped[int] = mapped_column(ForeignKey("works.id"))
    language: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    is_translation: Mapped[bool] = mapped_column(default=False)
    
    work: Mapped["Work"] = relationship(back_populates="expressions")
    publications: Mapped[List["Publication"]] = relationship(back_populates="expression")

class Publication(Base):
    """
    A specific print/digital event.
    """
    __tablename__ = "publications"
    id: Mapped[int] = mapped_column(primary_key=True)
    expression_id: Mapped[int] = mapped_column(ForeignKey("expressions.id"))
    
    venue: Mapped[Optional[str]] = mapped_column(String) # Journal, book title, etc.
    volume: Mapped[Optional[str]] = mapped_column(String)
    issue: Mapped[Optional[str]] = mapped_column(String)
    pages: Mapped[Optional[str]] = mapped_column(String)
    publisher: Mapped[Optional[str]] = mapped_column(String)
    place: Mapped[Optional[str]] = mapped_column(String)
    date: Mapped[Optional[str]] = mapped_column(String)
    year: Mapped[Optional[int]] = mapped_column(Integer)
    
    doi: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    other_identifiers: Mapped[Optional[dict]] = mapped_column(JSON) # e.g. arxiv, pmid
    
    is_reprint: Mapped[bool] = mapped_column(default=False)
    
    expression: Mapped["Expression"] = relationship(back_populates="publications")
    digital_copies: Mapped[List["DigitalCopy"]] = relationship(back_populates="publication")

class DigitalCopy(Base):
    __tablename__ = "digital_copies"
    id: Mapped[int] = mapped_column(primary_key=True)
    publication_id: Mapped[int] = mapped_column(ForeignKey("publications.id"))
    
    institution: Mapped[Optional[str]] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    persistent_id: Mapped[Optional[str]] = mapped_column(String)
    file_format: Mapped[Optional[str]] = mapped_column(String)
    has_ocr: Mapped[bool] = mapped_column(default=False)
    rights: Mapped[Optional[str]] = mapped_column(String)
    
    publication: Mapped["Publication"] = relationship(back_populates="digital_copies")

class RelationshipType(str, enum.Enum):
    CITES = "cites"
    PRECURSOR_TO = "precursor_to"
    EXTENDS = "extends"
    CRITICIZES = "criticizes"
    CORRECTS = "corrects"
    GENERALIZES = "generalizes"
    REFORMULATES = "reformulates"
    TRANSLATION_OF = "translation_of"
    REPRINT_OF = "reprint_of"

class WorkRelationship(Base):
    """
    Intellectual relationships between works.
    """
    __tablename__ = "work_relationships"
    id: Mapped[int] = mapped_column(primary_key=True)
    source_work_id: Mapped[int] = mapped_column(ForeignKey("works.id"))
    target_work_id: Mapped[int] = mapped_column(ForeignKey("works.id"))
    relationship_type: Mapped[RelationshipType] = mapped_column(Enum(RelationshipType))
    
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    evidence: Mapped[Optional[str]] = mapped_column(String) # Or JSON for structured evidence
    
class Evidence(Base):
    """
    Provenance tracking for claims.
    """
    __tablename__ = "evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String) # e.g., 'Work', 'Relationship'
    entity_id: Mapped[int] = mapped_column(Integer)
    field_name: Mapped[Optional[str]] = mapped_column(String)
    
    source: Mapped[str] = mapped_column(String) # e.g., 'Crossref', 'Library Catalogue'
    retrieved_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    notes: Mapped[Optional[str]] = mapped_column(String)
