"""Fase 2 — modelos SQLAlchemy del esquema descrito en arquitectura.md, sección 8."""
from app.models.base import Aportante, Trabajador, Vinculo
from app.models.nomina import Carga, LineaNomina, ValorCalculado
from app.models.config import VersionFormula, Formula, Plantilla, MapeoPlantilla, Exportacion
