from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="PILA")


@app.get("/api/salud")
def salud():
    return {"estado": "ok"}


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
