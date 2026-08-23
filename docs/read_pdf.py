import pdfplumber

file_path = r"d:\andresContador\Andres-contaduria\archivos extraccion de  data\ejemploPlanoNominaLogica.pdf"

with pdfplumber.open(file_path) as pdf:
    for i, page in enumerate(pdf.pages[:3]):
        print(f"--- PAGE {i+1} ---")
        print(page.extract_text())
        print("\n\n")
