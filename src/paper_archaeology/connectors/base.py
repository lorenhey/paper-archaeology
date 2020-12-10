from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import httpx

class BaseConnector(ABC):
    def __init__(self):
        self.client = httpx.Client(timeout=10.0)
        
    @property
    @abstractmethod
    def name(self) -> str:
        pass
        
    @abstractmethod
    def search_works(self, query: str) -> List[Dict[str, Any]]:
        pass
        
    @abstractmethod
    def get_work_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        pass
        
    def close(self):
        self.client.close()
