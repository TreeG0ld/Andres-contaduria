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
        dias_match = re.search(r"(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s*\(", block)
        if dias_match:
            print("Worker", matches[i].group(2), "Days:", dias_match.groups())
        else:
            print("Worker", matches[i].group(2), "Days NOT FOUND")
