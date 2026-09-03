import typer
from rich.console import Console
from rich.table import Table
from paper_archaeology.core.database import get_engine, get_session, init_db
from paper_archaeology.core.resolver import PaperResolver
from paper_archaeology.connectors.openalex import OpenAlexConnector

app = typer.Typer(help="Paper Archaeology CLI")
console = Console()

@app.callback()
def main_callback():
    """
    Paper Archaeology: Tracing the lives of scientific papers across editions, languages, citations and time.
    """
    engine = get_engine()
    init_db(engine)

@app.command()
def search(query: str):
    """
    Search for a paper via external sources and import it.
    """
    console.print(f"Searching for: [bold]{query}[/bold]")
    oa = OpenAlexConnector()
    results = oa.search_works(query)
    
    if not results:
        console.print("[red]No results found.[/red]")
        return
        
    table = Table("Index", "Title", "Year", "DOI", "Authors")
    for idx, res in enumerate(results[:5]):
        title = res.get("title", "No Title")
        year = str(res.get("publication_year", ""))
        doi = res.get("doi", "")
        authors = ", ".join([a.get("author", {}).get("display_name", "") for a in res.get("authorships", [])[:2]])
        table.add_row(str(idx), title, year, doi, authors)
        
    console.print(table)
    
    choice = typer.prompt("Select a paper to import (or 'q' to quit)", default="q")
    if choice.isdigit() and int(choice) < len(results):
        selected = results[int(choice)]
        engine = get_engine()
        session = get_session(engine)
        resolver = PaperResolver(session)
        work = resolver.resolve_from_openalex(selected)
        console.print(f"[green]Successfully imported Work ID {work.id}: {work.canonical_title}[/green]")

@app.command()
def paper(paper_id: int):
    """
    View details for a specific paper in the local archive.
    """
    from paper_archaeology.models.db import Work, Expression, Publication, WorkAuthor
    engine = get_engine()
    session = get_session(engine)
    
    work = session.query(Work).filter(Work.id == paper_id).first()
    if not work:
        console.print(f"[red]Paper {paper_id} not found in archive.[/red]")
        return
        
    console.print(f"\n[bold]{work.canonical_title}[/bold] ({work.year})")
    
    authors = session.query(WorkAuthor).filter(WorkAuthor.work_id == work.id).all()
    author_names = [a.person.canonical_name for a in authors]
    console.print(f"Authors: {', '.join(author_names)}")
    console.print(f"Original Language: {work.original_language or 'Unknown'}")
    
    console.print("\n[bold]Publications & Editions:[/bold]")
    for expr in work.expressions:
        for pub in expr.publications:
            console.print(f" - [{expr.language}] {pub.venue or 'Unknown Venue'}, {pub.year} (DOI: {pub.doi})")
            
@app.command()
def lineage(paper_id: int, max_depth: int = 2):
    """
    Show intellectual lineage (precursors and descendants) of a paper.
    """
    from paper_archaeology.models.db import Work
    from paper_archaeology.core.graph import GraphAnalyzer
    engine = get_engine()
    session = get_session(engine)
    
    work = session.query(Work).filter(Work.id == paper_id).first()
    if not work:
        console.print(f"[red]Paper {paper_id} not found.[/red]")
        return
        
    console.print(f"\n[bold]{work.canonical_title}[/bold] ({work.year})")
    
    analyzer = GraphAnalyzer(session)
    
    precursors = analyzer.get_precursors(paper_id, max_depth)
    console.print(f"\n[bold]Precursors (cites/extends):[/bold]")
    for p in precursors:
        console.print(f" - [Depth {p['depth']}] [{p['id']}] {p['title']}")
        
    descendants = analyzer.get_descendants(paper_id, max_depth)
    console.print(f"\n[bold]Descendants (cited by/extended by):[/bold]")
    for d in descendants:
        console.print(f" - [Depth {d['depth']}] [{d['id']}] {d['title']}")

@app.command()
def path(source_id: int, target_id: int):
    """
    Find citation path between two papers.
    """
    from paper_archaeology.core.graph import GraphAnalyzer
    from paper_archaeology.models.db import Work
    engine = get_engine()
    session = get_session(engine)
    
    analyzer = GraphAnalyzer(session)
    path = analyzer.get_path(source_id, target_id)
    
    if not path:
        console.print(f"[yellow]No path found between {source_id} and {target_id}.[/yellow]")
        return
        
    console.print("\n[bold]Path through science:[/bold]")
    for step_idx, node_id in enumerate(path):
        work = session.query(Work).filter(Work.id == node_id).first()
        if step_idx < len(path) - 1:
            console.print(f" [{node_id}] {work.canonical_title} ({work.year})\n   -> cites")
        else:
            console.print(f" [{node_id}] {work.canonical_title} ({work.year})")

@app.command()
def discover():
    """
    Discover interesting untranslated or obscure historical papers.
    """
    console.print("[yellow]Discovery mode coming soon...[/yellow]")

if __name__ == "__main__":
    app()
