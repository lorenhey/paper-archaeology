import networkx as nx
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from paper_archaeology.models.db import Work, WorkRelationship, RelationshipType

class GraphAnalyzer:
    def __init__(self, session: Session):
        self.session = session
        self.graph = nx.DiGraph()
        self._build_graph()
        
    def _build_graph(self):
        # Load works as nodes
        works = self.session.query(Work).all()
        for w in works:
            self.graph.add_node(w.id, title=w.canonical_title, year=w.year)
            
        # Load relationships as edges
        rels = self.session.query(WorkRelationship).all()
        for r in rels:
            # For CITES, A cites B means information flow is B -> A, but citation arrow is A -> B
            # Let's keep arrow as A -> B meaning A cites B
            self.graph.add_edge(r.source_work_id, r.target_work_id, rel_type=r.relationship_type.value)
            
    def get_path(self, source_id: int, target_id: int) -> List[int]:
        """
        Find shortest path from source to target in the citation/genealogy graph.
        """
        try:
            path = nx.shortest_path(self.graph, source=source_id, target=target_id)
            return path
        except nx.NetworkXNoPath:
            return []
            
    def get_descendants(self, work_id: int, max_depth: int = 2) -> List[Dict[str, Any]]:
        """
        Find works that cite or extend this work.
        Because arrow is A -> B (A cites B), descendants of B are nodes that have path TO B.
        So we reverse the graph.
        """
        rev_graph = self.graph.reverse()
        descendants = []
        if work_id not in rev_graph:
            return []
            
        lengths = nx.single_source_shortest_path_length(rev_graph, work_id, cutoff=max_depth)
        for node, depth in lengths.items():
            if node != work_id:
                node_data = self.graph.nodes[node]
                descendants.append({
                    "id": node,
                    "title": node_data.get("title"),
                    "depth": depth
                })
        return descendants
        
    def get_precursors(self, work_id: int, max_depth: int = 2) -> List[Dict[str, Any]]:
        """
        Find works that this work cites or extends.
        Arrow is A -> B (A cites B), so precursors of A are reachable FROM A.
        """
        precursors = []
        if work_id not in self.graph:
            return []
            
        lengths = nx.single_source_shortest_path_length(self.graph, work_id, cutoff=max_depth)
        for node, depth in lengths.items():
            if node != work_id:
                node_data = self.graph.nodes[node]
                precursors.append({
                    "id": node,
                    "title": node_data.get("title"),
                    "depth": depth
                })
        return precursors
