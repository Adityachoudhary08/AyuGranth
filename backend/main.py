"""
IP-SAKTI Sahayak — FastAPI application entry point.

- Lifespan: connects/disconnects MongoDB Atlas ipsakti
- Registers all 13 domain routers under /api/v1
- Exposes GET /health
- Configures CORS middleware
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import close_db, connect_db

# ── Route imports ─────────────────────────────────────────────────────────
from routes import (
    abs_engine,
    auth,
    classify,
    documents,
    evaluation,
    export,
    ip_engine,
    novelty,
    passport,
    products,
    rag,
    regulatory,
    tk_engine,
    gi_navigator,
    copyright_design,
    trade_secret,
    plant_variety,
    escalation,
    jurisdiction,
    legal_status,
    advertising,
    label,
    trademark,
    graph,
    multilingual,
    tk_watch,
)


# ── Lifespan ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle hook."""
    await connect_db()
    yield
    await close_db()


# ── App ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="IP-SAKTI Sahayak",
    description=(
        "Evidence-grounded legal and regulatory decision-support system "
        "for Ayurvedic product IP, TK, ABS, and regulatory compliance."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check (no prefix — top-level) ─────────────────────────────────


@app.get("/health", tags=["health"])
async def health():
    """Simple liveness probe."""
    return {"status": "ok"}


# ── Register all routers under /api/v1 ────────────────────────────────────

_API_V1 = "/api/v1"

app.include_router(auth.router, prefix=_API_V1)
app.include_router(products.router, prefix=_API_V1)
app.include_router(passport.router, prefix=_API_V1)
app.include_router(classify.router, prefix=_API_V1)
app.include_router(rag.router, prefix=_API_V1)
app.include_router(ip_engine.router, prefix=_API_V1)
app.include_router(tk_engine.router, prefix=_API_V1)
app.include_router(abs_engine.router, prefix=_API_V1)
app.include_router(regulatory.router, prefix=_API_V1)
app.include_router(export.router, prefix=_API_V1)
app.include_router(novelty.router, prefix=_API_V1)
app.include_router(documents.router, prefix=_API_V1)
app.include_router(evaluation.router, prefix=_API_V1)

# New IP engines
app.include_router(gi_navigator.router, prefix=_API_V1)
app.include_router(copyright_design.router, prefix=_API_V1)
app.include_router(trade_secret.router, prefix=_API_V1)
app.include_router(plant_variety.router, prefix=_API_V1)

# Remaining PRD Gaps
app.include_router(escalation.router, prefix=_API_V1)
app.include_router(jurisdiction.router, prefix=_API_V1)
app.include_router(legal_status.router, prefix=_API_V1)
app.include_router(advertising.router, prefix=_API_V1)
app.include_router(label.router, prefix=_API_V1)
app.include_router(trademark.router, prefix=_API_V1)
app.include_router(graph.router, prefix=_API_V1)
app.include_router(multilingual.router, prefix=_API_V1)
app.include_router(tk_watch.router, prefix=_API_V1)
