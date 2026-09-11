import pandas as pd

filepath = r"D:\andresContador\Andres-contaduria\archivos extraccion de  data\nomina__2026-02-febrero.xlsx"
df = pd.read_excel(filepath)
c = df.columns.tolist()

emp1 = df[c[6]].iloc[0]
emp1_df = df[df[c[6]] == emp1]

print(f"Employee ID: {emp1}")
for _, row in emp1_df.iterrows():
    print(f"Cuenta: {row[c[5]]} - {row[c[19]]}, Debito: {row[c[21]]}, Credito: {row[c[22]]}")
