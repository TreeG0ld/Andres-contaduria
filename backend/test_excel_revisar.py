import pandas as pd
import sys

filepath = r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\nomina arus enero REVISIOM.xlsx"
try:
    df = pd.read_excel(filepath)
    first_employee = df['Identificación'].iloc[0]
    emp_df = df[df['Identificación'] == first_employee]
    
    print(f"Employee ID: {first_employee}")
    for _, row in emp_df.iterrows():
        print(f"Cuenta: {row['Código cuenta']} - {row['Descripción']}, Debito: {row['Débito']}, Credito: {row['Crédito']}")
except Exception as e:
    print(f"Error: {e}")
