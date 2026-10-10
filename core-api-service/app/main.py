from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.router import api_router

# Initialize application logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Regulatory Search, Rules & Impact Evaluation Microservice with Hybrid BM25/Vector search, bitemporal filtering, and grounded citations.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount primary versioned API router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also mount under /api for backwards compatibility with unversioned client routes (/api/regulators, /api/impact)
app.include_router(api_router, prefix="/api")

@app.get("/health", tags=["Health Check"])
@app.get("/api/health", tags=["Health Check"])
@app.get("/api/v1/health", tags=["Health Check"])
def health():
    return {
        "status": "healthy",
        "service": "core-api-service",
        "version": settings.VERSION
    }