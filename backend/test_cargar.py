import sys
import asyncio
sys.path.append('d:\\andresContador\\Andres-contaduria\\backend')
from app.core.db import SessionLocal
from app.api.cargas import cargar_pdf
from fastapi import UploadFile

async def main():
    db = SessionLocal()
    with open('d:\\andresContador\\Andres-contaduria\\archivos extraccion de  data\\estructuraAPORTESENLINEA.pdf', 'rb') as f:
        u = UploadFile(filename='estructuraAPORTESENLINEA.pdf', file=f)
        try:
            res = await cargar_pdf('aportes_en_linea', u, db)
            print("Result:", res)
        except Exception as e:
            import traceback
            traceback.print_exc()
        finally:
            db.close()

asyncio.run(main())
