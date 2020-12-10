from typing import Dict, Any, List, Optional
from paper_archaeology.connectors.base import BaseConnector

class OpenAlexConnector(BaseConnector):
    @property
    def name(self) -> str:
        return "OpenAlex"
        
    def search_works(self, query: str) -> List[Dict[str, Any]]:
        url = "https://api.openalex.org/works"
        params = {"search": query, "mailto": "lorenhey@example.com", "per-page": 10}
        response = self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
        
    def get_work_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        url = f"https://api.openalex.org/works/https://doi.org/{doi}"
        params = {"mailto": "lorenhey@example.com"}
        response = self.client.get(url, params=params)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
        
    def get_work_by_id(self, openalex_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://api.openalex.org/works/{openalex_id}"
        params = {"mailto": "lorenhey@example.com"}
        response = self.client.get(url, params=params)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
        
    def get_citations(self, openalex_id: str) -> List[Dict[str, Any]]:
        url = "https://api.openalex.org/works"
        params = {"filter": f"cites:{openalex_id}", "mailto": "lorenhey@example.com", "per-page": 50}
        response = self.client.get(url, params=params)
        response.raise_for_status()
        return response.json().get("results", [])
