import sys
sys.path.append(r'd:\andresContador\Andres-contaduria\backend')
from app.parsers.soi import SOIParser
from app.parsers.arus import ARUSParser
from app.parsers.aportes_en_linea import AportesEnLineaParser
from app.parsers.simple import SimpleParser

filepath = r'D:\andresContador\Andres-contaduria\archivos extraccion de  data\SPS 01 ENERO_Autoliquidaciones_83256504_Consolidado.pdf'
parsers = [ARUSParser(), SOIParser(), AportesEnLineaParser(), SimpleParser()]

for p in parsers:
    try:
        print(f'{p.operador} detect: {p.detectar(filepath)}')
    except Exception as e:
        print(e)
