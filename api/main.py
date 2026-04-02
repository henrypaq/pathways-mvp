"""
main.py — Pathways FastAPI app.

Route definitions only. Business logic lives in api/routes/, api/services/, api/models/.
Run with: uvicorn api.main:app --reload --port 8000
"""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Make data_scrapper importable from the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise RuntimeError(
        "ANTHROPIC_API_KEY is not set. "
        "Add it to the .env file at the project root or export it in your shell."
    )

import anthropic
from data_scrapper.chunker import get_collection, load_model
from api.routes import health, search, analyze


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = load_model()
    app.state.collection = get_collection()
    app.state.anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    yield


app = FastAPI(
    title="Pathways API",
    description="AI-powered Canadian immigration assistant",
    version="0.1.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(search.router)
app.include_router(analyze.router)
