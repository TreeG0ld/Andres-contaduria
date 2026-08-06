"""
Placeholder de persistencia — NO ACTIVO todavía.

Este módulo documenta cómo se conectará la base de datos "memoria de
trabajadores" (cédulas, salarios históricos, fechas de ingreso/retiro) en
una fase futura del producto. Hoy no se importa desde ningún router: todo
el flujo actual trabaja en memoria (mock).

────────────────────────────────────────────────────────────────────────
OPCIÓN A — SQLAlchemy + PostgreSQL (control total del esquema)
────────────────────────────────────────────────────────────────────────

    from sqlalchemy import create_engine
    from sqlalchemy.orm import declarative_base, sessionmaker

    DATABASE_URL = "postgresql://user:password@localhost:5432/relev_pila"

    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()

    # app/db/models_orm.py definiría, por ejemplo:
    #
    # class TrabajadorORM(Base):
    #     __tablename__ = "trabajadores"
    #     id = Column(Integer, primary_key=True)
    #     cedula = Column(String(15), unique=True, index=True, nullable=False)
    #     nombre_completo = Column(String(120), nullable=False)
    #     salario_base_actual = Column(Numeric(12, 2), nullable=False)
    #     fecha_ingreso = Column(Date, nullable=True)
    #     fecha_retiro = Column(Date, nullable=True)
    #     historico_salarios = relationship("HistoricoSalarioORM", back_populates="trabajador")

    # Dependencia inyectable en los routers de FastAPI:
    #
    # def get_db():
    #     db = SessionLocal()
    #     try:
    #         yield db
    #     finally:
    #         db.close()
    #
    # Uso en un endpoint: `db: Session = Depends(get_db)`

────────────────────────────────────────────────────────────────────────
OPCIÓN B — Cliente Supabase (Postgres administrado + Auth/Storage listos)
────────────────────────────────────────────────────────────────────────

    import os
    from supabase import create_client, Client

    SUPABASE_URL = os.environ["SUPABASE_URL"]
    SUPABASE_KEY = os.environ["SUPABASE_KEY"]

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Ejemplo de consulta desde un router:
    # respuesta = supabase.table("trabajadores").select("*").eq("cedula", cedula).execute()

────────────────────────────────────────────────────────────────────────
Cuándo migrar del mock a esta capa
────────────────────────────────────────────────────────────────────────

1. Reemplazar el mock de `routers/liquidacion.py` por la extracción real
   del PDF (ej. pdfplumber / PyMuPDF).
2. Al detectar una cédula ya existente en la tabla `trabajadores`, cargar
   su histórico salarial en lugar de asumir que es un IBC nuevo.
3. Persistir cada liquidación procesada en una tabla `liquidaciones`
   (FK a `trabajadores`) para alimentar el menú "Historial de Archivos".
"""
