from fastapi import APIRouter
from app.api.v1.endpoints import (
    search,
    facets,
    chat,
    alerts,
    internal,
    rules,
    impact,
    semantic,
)

api_router = APIRouter()

# Search & Retrieval
api_router.include_router(search.router, prefix="/search", tags=["Regulatory Search"])
api_router.include_router(facets.router, prefix="/search/facets", tags=["Filter Facets"])
api_router.include_router(semantic.router, prefix="/semantic", tags=["Semantic Vector Search"])
api_router.include_router(chat.router, prefix="/chat", tags=["Compliance Q&A Chat"])

# Alerts
api_router.include_router(alerts.router)

# Internal Webhooks & Operations
api_router.include_router(internal.router, prefix="/internal", tags=["Internal Webhooks & Dev Tools"])

# Rules & Impact Evaluation Engine
api_router.include_router(rules.router, prefix="/regulators", tags=["Rules & Regulators"])
api_router.include_router(impact.router, prefix="/impact", tags=["Impact Analysis"])