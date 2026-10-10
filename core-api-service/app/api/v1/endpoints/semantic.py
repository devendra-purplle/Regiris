"""Pure vector semantic search endpoint using dense embeddings and ChromaDB."""
from fastapi import APIRouter, HTTPException, status
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search_orchestrator import search_orchestrator

router = APIRouter(tags=["Semantic Vector Search"])


@router.post("", response_model=SearchResponse, status_code=status.HTTP_200_OK, summary="Dense Semantic Search")
def semantic_search(payload: SearchRequest):
    """
    Executes dense vector semantic search against ChromaDB using MiniLM-L6 embeddings.
    Forces search_mode='vector' regardless of payload override.
    """
    try:
        payload.search_mode = "vector"
        return search_orchestrator.search(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search failed: {str(exc)}"
        )
