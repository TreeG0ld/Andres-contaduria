from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="PILA")


from app.api.cargas import router as cargas_router
from app.api.revision import router as revision_router
from app.api.trabajadores import router as trabajadores_router
from app.api.formulas import router as formulas_router
from app.api.plantillas import router as plantillas_router

@app.get("/api/salud")
def salud():
    return {"estado": "ok"}

app.include_router(cargas_router, prefix="/api/cargas", tags=["cargas"])
app.include_router(revision_router, prefix="/api/revision", tags=["revision"])
app.include_router(trabajadores_router, prefix="/api/trabajadores", tags=["trabajadores"])
app.include_router(formulas_router, prefix="/api/formulas", tags=["formulas"])
app.include_router(plantillas_router, prefix="/api/plantillas", tags=["plantillas"])


frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{ruta_completa:path}")
    def servir_frontend(ruta_completa: str):
        """Sirve el build de React; cae a index.html para rutas del router del cliente."""
        archivo = frontend_dist / ruta_completa
        if archivo.is_file():
            return FileResponse(archivo)
        return FileResponse(frontend_dist / "index.html")
