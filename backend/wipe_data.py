import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.db import Base, engine, SessionLocal
from app.models.base import Aportante, Trabajador, Vinculo
from app.models.nomina import Carga, LineaNomina, ValorCalculado
from app.models.config import Exportacion

db = SessionLocal()

print("Borrando Exportacion...")
db.query(Exportacion).delete()

print("Borrando ValorCalculado...")
db.query(ValorCalculado).delete()

print("Borrando LineaNomina...")
db.query(LineaNomina).delete()

print("Borrando Carga...")
db.query(Carga).delete()

print("Borrando Vinculo...")
db.query(Vinculo).delete()

print("Borrando Trabajador...")
db.query(Trabajador).delete()

print("Borrando Aportante...")
db.query(Aportante).delete()

db.commit()
print("¡Base de datos limpiada para producción!")
