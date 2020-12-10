from typing import Dict, Any, List, Optional
from paper_archaeology.connectors.base import BaseConnector

class CrossrefConnector(BaseConnector):
    @property
    def name(self) -> str:
        return "Crossref"
        
    def search_works(self, query: str) -> List[Dict[str, Any]]:
        url = "https://api.crossref.org/works"
        params = {"query": query, "mailto": "lorenhey@example.com", "rows": 10}
        response = self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("items", [])
        
    def get_work_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        url = f"https://api.crossref.org/works/{doi}"
        params = {"mailto": "lorenhey@example.com"}
        response = self.client.get(url, params=params)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json().get("message")
