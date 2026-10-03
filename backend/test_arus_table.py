import os
import sys
import pprint

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pdfplumber

filepath = r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\1.Pago seguridad social mes de enero.pdf"
with pdfplumber.open(filepath) as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if len(table) > 2:
                row0 = [str(x).lower() for x in table[0] if x]
                row1 = [str(x).lower() for x in table[1] if x]
                has_ident = any("identific" in x for x in row0) or any("identific" in x for x in row1)
                has_nombres = any("nombres" in x for x in row0) or any("nombres" in x for x in row1)
                if has_ident and has_nombres:
                    print("Found table!")
                    print("Headers row 0:")
                    for i, h in enumerate(table[0]): print(f"{i}: {repr(h)}")
                    print("Headers row 1:")
                    for i, h in enumerate(table[1]): print(f"{i}: {repr(h)}")
                    print("First data row:")
                    for i, d in enumerate(table[2]): print(f"{i}: {repr(d)}")
                    sys.exit(0)
