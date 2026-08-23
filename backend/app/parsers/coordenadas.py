from collections import defaultdict
from app.parsers.base import Dias

def leer_dias(page, top_fila, bandas):
    """
    Lee los dias de cotizacion basandose en bandas de coordenadas X.
    Ejemplo de bandas: {'afp': (253, 259), 'eps': (259, 265), 'arp': (265, 271), 'ccf': (271, 277)}
    """
    chars = [c for c in page.chars if abs(c["top"] - top_fila) < 4 and c["text"].isdigit()]
    salida = {}
    for nombre, (xi, xf) in bandas.items():
        digitos = sorted((c for c in chars if xi <= c["x0"] < xf), key=lambda c: c["x0"])
        salida[nombre] = int("".join(c["text"] for c in digitos) or 0)
    return Dias(**salida)

def mapa_novedades(page, top_primera_fila, banda=30):
    """
    Lee las novedades (textos rotados) y devuelve un diccionario {texto: coord_x}.
    Ej: {'ING': 153.0, 'RET': 159.0, ...}
    """
    rot = [c for c in page.chars 
           if c.get("upright") is False 
           and top_primera_fila - banda < c["bottom"] < top_primera_fila]
    grupos = defaultdict(list)
    for c in rot:
        grupos[round(c["x0"])].append(c)
    
    # Reconstruir la palabra por columna
    return {
        "".join(ch["text"] for ch in sorted(g, key=lambda c: -c["top"])).strip(): x
        for x, g in grupos.items()
    }
