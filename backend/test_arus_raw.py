import os
import sys
import pprint

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.parsers.arus import ARUSParser

class MyARUSParser(ARUSParser):
    def extraer(self, filepath):
        import pdfplumber
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if "datos generales del aportante" in text.lower():
                    table = page.extract_table()
                    if table:
                        for row in table:
                            if len(row) > 1 and row[1] in ["CC", "CE", "PA", "TI", "PEP", "PPT"]:
                                print(f"Raw row length: {len(row)}")
                                for i, v in enumerate(row):
                                    print(f"Col {i}: {repr(v)}")
                                return super().extraer(filepath)
        return super().extraer(filepath)

parser = MyARUSParser()
try:
    extraccion = parser.extraer(r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\1.Pago seguridad social mes de enero.pdf")
except Exception as e:
    print(f"Error: {e}")
