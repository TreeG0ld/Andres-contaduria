"""
Punto de entrada de la API de Counter — Liquidador de Planillas PILA.

Ejecutar en desarrollo:
    cd backend
    uvicorn main:app --reload

La app sirve:
  - /api/...      → endpoints REST (routers/)
  - /             → frontend estático (../frontend), para desarrollo local
                     sin necesidad de un segundo servidor.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers import export, liquidacion, parametros

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

app = FastAPI(
    title="Counter — Liquidador PILA",
    description="API para automatizar y transformar planillas de seguridad social (PILA).",
    version="0.1.0",
)

# En producción, restringir `allow_origins` al dominio real del dashboard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(liquidacion.router)
app.include_router(export.router)
app.include_router(parametros.router)

# Sirve los assets estáticos del frontend (script.js, css) bajo /static.
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    """Sirve el dashboard (index.html) para desarrollo local sin servidor separado."""
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health", tags=["Sistema"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
