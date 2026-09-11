import os
import sys
import pprint

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.parsers.arus import ARUSParser

parser = ARUSParser()
try:
    extraccion = parser.extraer(r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\1.Pago seguridad social mes de enero.pdf")
    print(f"Extracted {len(extraccion.lineas)} lines")
    if len(extraccion.lineas) > 0:
        print("First line:")
        pprint.pprint(extraccion.lineas[0].__dict__)
except Exception as e:
    print(f"Error: {e}")
