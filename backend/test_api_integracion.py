import requests
import json
import os

url = "http://localhost:8002/api/cargas/cargar"
file_path = r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\DOUCE-ENERO.pdf"

print("1. Probando carga de archivo DOUCE-ENERO con consecutivo_inicial = 500")

with open(file_path, "rb") as f:
    files = {"pdf_file": f}
    data = {
        "operador": "soi",
        "consecutivo_inicial": 500
    }
    
    response = requests.post(url, files=files, data=data)
    
if response.status_code == 200:
    res_json = response.json()
    print("Éxito en /cargar:", res_json)
    
    carga_id = res_json.get("carga_id")
    if res_json.get("status") == "needs_config" and carga_id:
        print("2. Confirmando NITs para avanzar...")
        # Confirm nits to trigger generation
        conf_url = f"http://localhost:8002/api/cargas/{carga_id}/confirmar_nits"
        conf_data = {
            "nit_ccf": "111",
            "nit_arl": "222"
        }
        r2 = requests.post(conf_url, json=conf_data)
        print("Confirmar NITs res:", r2.json())
        
        # Clasificar si lo pide (DOUCE-ENERO pide clasificar porque no todos son 51)
        r2_json = r2.json()
        if r2_json.get("status") == "needs_workers_classification":
            print("3. Clasificando trabajadores para que genere el excel...")
            class_url = f"http://localhost:8002/api/cargas/{carga_id}/clasificar_trabajadores"
            trabajadores = r2_json.get("trabajadores", [])
            class_data = {
                "clasificaciones": {t["id"]: "51" for t in trabajadores}
            }
            r3 = requests.post(class_url, json=class_data)
            print("Clasificar res:", r3.json())
            
        # Download Excel
        print("4. Descargando Excel...")
        dl_url = f"http://localhost:8002/api/cargas/descargar/{carga_id}"
        r4 = requests.get(dl_url)
        if r4.status_code == 200:
            with open("test_generado.xlsx", "wb") as xf:
                xf.write(r4.content)
            print("Excel descargado: test_generado.xlsx")
            
            # Leer el Excel para ver si tiene 500, 501, 502...
            import openpyxl
            wb = openpyxl.load_workbook(filename="test_generado.xlsx")
            sheet = wb.active
            
            # Consecutivos en columna H (indice 8) asumiendo la plantilla original, o en la B?
            # En la captura de pantalla: Columna B es "Consecutivo" (Consecuti)
            
            consecutivos = set()
            # Iterar desde la fila 2
            for row in sheet.iter_rows(min_row=2, max_row=20, values_only=True):
                if row[1]: # Columna B
                    consecutivos.add(row[1])
                    
            print(f"Consecutivos encontrados en las primeras 20 filas: {consecutivos}")
            
else:
    print("Error:", response.status_code, response.text)
