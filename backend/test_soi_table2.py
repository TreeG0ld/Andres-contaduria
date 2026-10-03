import os
import sys
import pprint

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pdfplumber

filepath = r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\estructuraSOI.pdf"
with pdfplumber.open(filepath) as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if len(table) > 2:
                print("Found table in SOI! length: ", len(table))
                print("Headers row 0:")
                for i, h in enumerate(table[0]): print(f"{i}: {repr(h)}")
                print("First data row:")
                for i, d in enumerate(table[1]): print(f"{i}: {repr(d)}")
                sys.exit(0)
