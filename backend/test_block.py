import re
import pdfplumber

p = pdfplumber.open(r'D:\andresContador\Andres-contaduria\archivos extraccion de  data\SPS 01 ENERO_Autoliquidaciones_83256504_Consolidado.pdf')
text = p.pages[0].extract_text()
pattern = r'(CC|CE|NIT|TI|PA|RC)\s+(\d+)'
matches = list(re.finditer(pattern, text))
print('Found:', len(matches))
for i in range(len(matches)):
    start = matches[i].start()
    end = matches[i+1].start() if i + 1 < len(matches) else len(text)
    block = text[start:end]
    moneys = re.findall(r'\$\s*([\d\.\,]+)', block)
    print('Worker', i, block[:30].replace('\n', ' '), 'Moneys:', len(moneys))
