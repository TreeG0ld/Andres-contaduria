import requests
url = 'http://localhost:8000/api/cargas/cargar'
files = {'pdf_file': ('estructuraAPORTESENLINEA.pdf', open('d:\\andresContador\\Andres-contaduria\\archivos extraccion de  data\\estructuraAPORTESENLINEA.pdf', 'rb'), 'application/pdf')}
data = {'operador': 'aportes_en_linea'}
r = requests.post(url, files=files, data=data)
print(r.status_code)
print(r.text)
