import sqlite3
import json

conn = sqlite3.connect('paper_archaeology.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Query all works with aggregated authors, expressions, publications, and relationships
works_rows = cur.execute("""
    SELECT w.id, w.canonical_title, w.year, w.original_language, w.work_type, w.subject
    FROM works w
    ORDER BY w.year ASC, w.id ASC
""").fetchall()

# Authors mapping
authors_rows = cur.execute("""
    SELECT wa.work_id, p.id as person_id, p.canonical_name, p.wikidata_id, p.orcid, p.viaf
    FROM work_authors wa
    JOIN people p ON wa.person_id = p.id
    ORDER BY wa.work_id, wa."order"
""").fetchall()

work_authors_map = {}
for a in authors_rows:
    wid = a["work_id"]
    if wid not in work_authors_map:
        work_authors_map[wid] = []
    work_authors_map[wid].append({
        "id": a["person_id"],
        "name": a["canonical_name"],
        "wikidata_id": a["wikidata_id"],
        "orcid": a["orcid"],
        "viaf": a["viaf"]
    })

# Expressions mapping
expr_rows = cur.execute("""
    SELECT e.id, e.work_id, e.language, e.title, e.is_translation
    FROM expressions e
""").fetchall()

work_expr_map = {}
for e in expr_rows:
    wid = e["work_id"]
    if wid not in work_expr_map:
        work_expr_map[wid] = []
    work_expr_map[wid].append({
        "id": e["id"],
        "language": e["language"],
        "title": e["title"],
        "is_translation": bool(e["is_translation"])
    })

# Publications mapping
pub_rows = cur.execute("""
    SELECT p.id, p.expression_id, p.venue, p.volume, p.issue, p.pages, p.publisher, p.place, p.year, p.doi
    FROM publications p
""").fetchall()

expr_pubs_map = {}
for p in pub_rows:
    eid = p["expression_id"]
    if eid not in expr_pubs_map:
        expr_pubs_map[eid] = []
    expr_pubs_map[eid].append({
        "id": p["id"],
        "venue": p["venue"],
        "volume": p["volume"],
        "issue": p["issue"],
        "pages": p["pages"],
        "publisher": p["publisher"],
        "place": p["place"],
        "year": p["year"],
        "doi": p["doi"]
    })

# Relationships
rel_rows = cur.execute("""
    SELECT r.id, r.source_work_id, r.target_work_id, r.relationship_type, r.confidence, r.evidence
    FROM work_relationships r
""").fetchall()

relationships = []
for r in rel_rows:
    relationships.append({
        "id": r["id"],
        "source": r["source_work_id"],
        "target": r["target_work_id"],
        "type": r["relationship_type"],
        "confidence": r["confidence"],
        "evidence": r["evidence"]
    })

# Evidences
ev_rows = cur.execute("""
    SELECT e.id, e.entity_type, e.entity_id, e.source, e.confidence, e.notes
    FROM evidence e
""").fetchall()

evidence_list = []
for e in ev_rows:
    evidence_list.append({
        "id": e["id"],
        "entity_type": e["entity_type"],
        "entity_id": e["entity_id"],
        "source": e["source"],
        "confidence": e["confidence"],
        "notes": e["notes"]
    })

works_list = []
for w in works_rows:
    wid = w["id"]
    w_exprs = work_expr_map.get(wid, [])
    # attach publications to expressions
    for ex in w_exprs:
        ex["publications"] = expr_pubs_map.get(ex["id"], [])
    
    works_list.append({
        "id": wid,
        "title": w["canonical_title"],
        "year": w["year"],
        "original_language": w["original_language"],
        "work_type": w["work_type"],
        "subject": w["subject"],
        "authors": work_authors_map.get(wid, []),
        "expressions": w_exprs
    })

corpus_bundle = {
    "version": "2.0.0",
    "total_works": len(works_list),
    "total_relationships": len(relationships),
    "works": works_list,
    "relationships": relationships,
    "evidence": evidence_list
}

with open("data/corpus_bundle.json", "w", encoding="utf-8") as f:
    json.dump(corpus_bundle, f, ensure_ascii=False, indent=2)

with open("data/archaeology-corpus.js", "w", encoding="utf-8") as f:
    f.write("window.ARCHAEOLOGY_CORPUS = " + json.dumps(corpus_bundle, ensure_ascii=False, indent=2) + ";\n")

print(f"Exported {len(works_list)} works and {len(relationships)} relationships to data/corpus_bundle.json and data/archaeology-corpus.js")
