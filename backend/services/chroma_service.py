import chromadb
from chromadb.config import Settings
from typing import Optional
from config import CHROMA_DIR


class ChromaService:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=str(CHROMA_DIR),
            settings=Settings(anonymized_telemetry=False),
        )

    def get_or_create_collection(self, name: str):
        try:
            return self.client.get_collection(name)
        except ValueError:
            return self.client.create_collection(name)

    def delete_collection(self, name: str):
        try:
            self.client.delete_collection(name)
        except ValueError:
            pass

    def list_collections(self):
        return self.client.list_collections()

    def add_documents(
        self,
        collection_name: str,
        documents: list[str],
        metadatas: Optional[list[dict]] = None,
        ids: Optional[list[str]] = None,
    ):
        collection = self.get_or_create_collection(collection_name)
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids,
        )

    def search(
        self,
        collection_name: str,
        query: str,
        n_results: int = 5,
    ) -> list[dict]:
        try:
            collection = self.client.get_collection(collection_name)
            results = collection.query(query_texts=[query], n_results=n_results)
            items = []
            for i in range(len(results["ids"][0])):
                items.append({
                    "id": results["ids"][0][i],
                    "document": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                })
            return items
        except ValueError:
            return []

    def delete_documents(self, collection_name: str, ids: list[str]):
        try:
            collection = self.client.get_collection(collection_name)
            collection.delete(ids=ids)
        except ValueError:
            pass
