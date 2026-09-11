import sys
import os
from pprint import pprint

# Añadir el backend al path para poder importar
sys.path.append(r"d:\andresContador\Andres-contaduria\backend")

from app.parsers.soi import SOIParser
from app.parsers.arus import ARUSParser
from app.parsers.aportes_en_linea import AportesEnLineaParser
from app.parsers.simple import SimpleParser

base_dir = r"D:\andresContador\Andres-contaduria\archivos extraccion de  data"

files = {
    "ARUS": os.path.join(base_dir, "estructuraARUS.pdf"),
    "SOI": os.path.join(base_dir, "estructuraSOI.pdf"),
    "AportesEnLinea": os.path.join(base_dir, "estructuraAPORTESENLINEA.pdf"),
    "Simple": os.path.join(base_dir, "estructuraSIMPLE.pdf")
}

parsers = {
    "ARUS": ARUSParser(),
    "SOI": SOIParser(),
    "AportesEnLinea": AportesEnLineaParser(),
    "Simple": SimpleParser()
}

for name, filepath in files.items():
    print(f"\n{'='*50}\nProbando Parser {name} con el archivo: {os.path.basename(filepath)}")
    try:
        parser = parsers[name]
        resultado = parser.extraer(filepath)
        print(f"Éxito: Se extrajeron {len(resultado.lineas)} líneas.")
        if len(resultado.lineas) > 0:
            print("Muestra del primer trabajador extraído:")
            pprint(resultado.lineas[0].__dict__)
    except Exception as e:
        print(f"Error al procesar {name}: {e}")
