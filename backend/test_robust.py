import re
import pdfplumber

p = pdfplumber.open(r'D:\andresContador\Andres-contaduria\archivos extraccion de  data\SPS 01 ENERO_Autoliquidaciones_83256504_Consolidado.pdf')
text = p.pages[0].extract_text()
pattern = r'(CC|CE|NIT|TI|PA|RC)\s+(\d+)'
matches = list(re.finditer(pattern, text))
for i in range(len(matches)):
    start = matches[i].start()
    end = matches[i+1].start() if i + 1 < len(matches) else len(text)
    block = text[start:end]
    moneys = re.findall(r'\$\s*([\d\.\,]+)', block)
    if len(moneys) >= 13:
        # We need a robust regex to extract Tipo, Subtipo, Novedades, and Days
        # Example 1: 01 00 X 0 7 7 7 7(230201)
        # Example 2: 01 00 030303030(231001)
        # Example 3: 01 01 X X 0 0 3 3 3(NIN-AF)
        
        match = re.search(r"(\d{2})\s+(\d{2}|[A-Z0-9]+)[\sX0]*?(\d{1,2})[\s]*(\d{1,2})[\s]*(\d{1,2})[\s]*(\d{1,2})\s*\(", block)
        if match:
            print("Worker", matches[i].group(2), match.groups())
        else:
            print("Worker", matches[i].group(2), "NOT FOUND")
