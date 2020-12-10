import time
from paper_archaeology.core.database import get_engine, get_session, init_db
from paper_archaeology.core.resolver import PaperResolver
from paper_archaeology.connectors.openalex import OpenAlexConnector

engine = get_engine()
init_db(engine)
session = get_session(engine)
resolver = PaperResolver(session)
oa = OpenAlexConnector()

TARGETS = [
    "A Mathematical Theory of Communication",
    "On Computable Numbers, with an Application to the Entscheidungsproblem",
    "Zur Elektrodynamik bewegter Körper",
    "Molecular structure of nucleic acids",
    "Versuche über Pflanzen-Hybriden",
    "A homogeneous universe of constant mass and increasing radius accounting for the radial velocity of extra-galactic nebulae",
    "The Origin of Chemical Elements",
    "Computing Machinery and Intelligence",
    "Information Theory and Statistical Mechanics",
    "Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung von in ruhenden Flüssigkeiten suspendierten Teilchen"
]

def populate():
    print("Populating corpus...")
    for target in TARGETS:
        print(f"Searching for: {target}")
        results = oa.search_works(target)
        if results:
            # Try to find an exact or very close title match, or just take the first
            selected = None
            for r in results:
                title = r.get("title", "")
                if title and target.lower() in title.lower():
                    selected = r
                    break
            
            if not selected:
                selected = results[0]
                
            work = resolver.resolve_from_openalex(selected)
            print(f"  -> Imported Work {work.id}: {work.canonical_title}")
        else:
            print("  -> Not found.")
        time.sleep(1) # respect rate limit

if __name__ == "__main__":
    populate()
