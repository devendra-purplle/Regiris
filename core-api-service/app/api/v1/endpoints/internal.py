"""Internal endpoints and webhooks for inter-service communication and diagnostics."""
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status

from app.schemas.internal import (
    EmbedChunksPayload,
    EmbedChunksResponse,
    ServiceError,
)
from app.schemas.rule import RuleFileStatus, RuleTestRequest, RuleTestResult
from app.services.rules.explanation_builder import explain_failure
from app.services.rules.json_logic_evaluator import (
    EvaluationError,
    collect_fields,
    evaluate,
    validate_logic,
)
from app.services.rules.rule_loader import load_regulators, validate_all
from app.services.vector.embedder import embedder
from app.services.vector.chroma_client import chroma_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Internal Operations & Webhooks"])


@router.post(
    "/embed-chunks",
    response_model=EmbedChunksResponse,
    status_code=status.HTTP_200_OK,
    summary="Webhook for Ingestion Service to index chunks in ChromaDB",
)
def embed_chunks(payload: EmbedChunksPayload):
    """
    Receives parsed document chunks from the Ingestion Service,
    generates 384-d dense vector embeddings, and persists them into ChromaDB.
    """
    if not payload.chunks:
        return EmbedChunksResponse(
            status="success",
            docId=payload.docId,
            chunks_processed=0,
            collection=chroma_client.get_collection().name,
        )

    try:
        texts = [chunk.text for chunk in payload.chunks]
        ids = [chunk.chunkId for chunk in payload.chunks]
        metadatas = [
            {
                "docId": str(chunk.documentId or payload.docId),
                "regulator": str(payload.regulator),
                "parentSectionId": str(chunk.parentSectionId or ""),
                "pageNumber": int(chunk.pageNumber or 1),
            }
            for chunk in payload.chunks
        ]

        logger.info(
            f"Embedding {len(texts)} chunks for doc ID {payload.docId} ({payload.regulator})"
        )
        embeddings = embedder.embed_documents(texts)

        collection = chroma_client.get_collection()
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )

        logger.info(
            f"Successfully stored {len(ids)} chunk vectors in Chroma collection '{collection.name}'"
        )
        return EmbedChunksResponse(
            status="success",
            docId=payload.docId,
            chunks_processed=len(ids),
            collection=collection.name,
        )
    except Exception as exc:
        logger.error(f"Failed to embed and index chunks for doc {payload.docId}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector embedding failed: {str(exc)}",
        )


@router.get(
    "/rules/status",
    response_model=List[RuleFileStatus],
    summary="Validate loaded rule files",
)
def rule_file_status():
    """Returns the parse status and rule count of all JSON rule files in data directory."""
    return validate_all()


@router.get(
    "/rules/{regulator_id}/logic",
    summary="Inspect raw JSON Logic for a regulator",
)
def raw_rule_logic(regulator_id: str):
    """Returns raw JSON Logic representations for the given regulator."""
    try:
        rulesets = load_regulators([regulator_id])
        if not rulesets:
            raise HTTPException(status_code=404, detail="Regulator not found")
        return {r.id: r.logic for r in rulesets[0].rules}
    except ServiceError as exc:
        status_code = 404 if exc.status_code == 422 else exc.status_code
        raise HTTPException(status_code=status_code, detail=exc.message)


@router.post(
    "/rules/test",
    response_model=RuleTestResult,
    summary="Test individual rule logic against a trade payload",
)
def test_rule(body: RuleTestRequest):
    """Evaluates raw JSON Logic against a single trade dictionary for debugging."""
    try:
        validate_logic(body.logic)
        trace = evaluate(body.logic, body.trade)
    except (ValueError, EvaluationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if trace.truthy:
        return RuleTestResult(passed=True, evidence=collect_fields(trace))
    return RuleTestResult(
        passed=False,
        explanation=explain_failure(trace),
        evidence=collect_fields(trace),
    )
