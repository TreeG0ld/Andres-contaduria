import re


def nombre_archivo_exportacion(aportante, periodo, sufijo: str = "") -> str:
    """Nombre de archivo de descarga: NOMBRE-AAAA-MM[-sufijo].xlsx

    Usa la razón social del aportante; si viene vacía usa su número de documento.
    Quita los caracteres que Windows no permite en nombres de archivo.
    """
    base = (getattr(aportante, "razon_social", "") or "").strip()
    if not base:
        base = (getattr(aportante, "numero_documento", "") or "").strip() or "empresa"
    base = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "-", base)
    base = re.sub(r"\.", "", base)          # S.A.S. -> SAS
    base = re.sub(r"\s+", "_", base).strip("_-")
    periodo_str = periodo.strftime("%Y-%m")
    extra = f"-{sufijo}" if sufijo else ""
    return f"{base}-{periodo_str}{extra}.xlsx"
