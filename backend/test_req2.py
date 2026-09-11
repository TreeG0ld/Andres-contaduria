import sys
sys.path.append('d:\\andresContador\\Andres-contaduria\\backend')
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
with open('d:\\andresContador\\Andres-contaduria\\archivos extraccion de  data\\estructuraAPORTESENLINEA.pdf', 'rb') as f:
    res = client.post('/api/cargas/cargar', data={'operador': 'aportes_en_linea'}, files={'pdf_file': ('estructuraAPORTESENLINEA.pdf', f, 'application/pdf')})
    print(res.status_code)
    print(res.text)
