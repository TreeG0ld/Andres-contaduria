import sqlite3
conn = sqlite3.connect(r'd:\andresContador\Andres-contaduria\backend\pila.db')
cursor = conn.cursor()
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = cursor.fetchall()
for t in tables:
    try:
        cursor.execute(f'SELECT * FROM {t[0]} LIMIT 1')
        print(f'Table {t[0]}: {cursor.fetchone()}')
    except Exception as e:
        print(e)
