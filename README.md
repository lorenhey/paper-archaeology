# PAPER ARCHAEOLOGY

> *Tracing the lives of scientific papers across editions, languages, citations, and time.*

[![Deploy GitHub Pages](https://github.com/lorenhey/paper-archaeology/actions/workflows/deploy.yml/badge.svg)](https://github.com/lorenhey/paper-archaeology/actions/workflows/deploy.yml)
[![Live Workbench](https://img.shields.io/badge/Live_Workbench-GitHub_Pages-cyan.svg)](https://lorenhey.github.io/paper-archaeology/)

**Interactive Web Observatory & Genealogy Workbench:** [https://lorenhey.github.io/paper-archaeology/](https://lorenhey.github.io/paper-archaeology/)

Papers do not remain where they were published. They are translated, reprinted, cited, misquoted, forgotten, and occasionally rediscovered. A scientific paper has a publication date. Its history usually does not.

**PAPER ARCHAEOLOGY** is an open-source tool for conducting bibliographic and intellectual archaeology. It moves beyond standard citation metrics (like Google Scholar) to reconstruct the actual historical trajectory of a scientific work. 

## Philosophy

PAPER ARCHAEOLOGY is not just a search engine. It's a tool to follow **the life of a paper**.
It answers questions like:
- What was the original publication?
- When and where was it translated?
- Who cited it 50 years later, and how?
- Did it fall into obscurity before being rediscovered?
- What is the intellectual lineage (precursors and descendants) of this specific idea?

We separate the abstract "Work" from its "Expressions" (translations, variations), its "Publications" (journal, proceedings, anthology), and its "Digital Copies" (OCR, PDFs). This FRBR-inspired approach allows for genuine historical rigor.

## Features

- **Bibliographic Resolution**: Handles title variants, historical naming conventions, and ambiguous metadata.
- **Translation Tracking**: Distinguishes between full translations, partial excerpts, and missing translations. 
- **Citation Genealogy**: Computes intellectual paths ("Path through Science") rather than just showing a hairball graph.
- **Evidence Tracking**: Every relationship and data point retains its source and confidence (Provenance).
- **Archival Interface**: A sober, text-first web UI suitable for deep reading and exploration.
- **Extensible Connectors**: Built-in integrations for OpenAlex and Crossref, with architecture for historical sources.

## Getting Started

### Installation

Requires Python 3.10+ and `uv` package manager.

```bash
git clone https://github.com/lorenhey/paper-archaeology.git
cd paper-archaeology
uv sync
```

### CLI Usage

```bash
# Search for a paper and add it to the local archive
uv run paper-archaeology search "A Mathematical Theory of Communication"

# View details for a specific paper
uv run paper-archaeology paper 1

# Explore intellectual lineage (precursors/descendants)
uv run paper-archaeology lineage 1 --max-depth 3

# Find a citation path between two works
uv run paper-archaeology path 1 4
```

### Web Interface

```bash
uv run uvicorn paper_archaeology.web.app:app --reload
```
Open `http://127.0.0.1:8000` to browse the archive.

## Project Structure
- `src/paper_archaeology/models/` - FRBR-inspired DB schema and Pydantic models.
- `src/paper_archaeology/core/` - Resolution logic, graph algorithms (NetworkX).
- `src/paper_archaeology/connectors/` - API integrations (OpenAlex, Crossref).
- `src/paper_archaeology/cli/` - Typer CLI.
- `src/paper_archaeology/web/` - FastAPI + Jinja2 frontend.
- `scripts/` - Automation for populating the initial corpus.

## Limitations & Open Questions
- Translation detection is largely dependent on available metadata.
- "Untranslated" is treated as a hypothesis ("No translation found in consulted sources"), not an absolute truth.
- AI models (if integrated later) are treated as heuristics, not primary sources.

## License
MIT License for the code. Bibliographic metadata retrieved from external sources retains their respective licenses (e.g., CC0 for OpenAlex).
