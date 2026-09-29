"""Envío del código de acceso por correo, vía Resend."""
import httpx

from app.core.config import settings

RESEND_URL = "https://api.resend.com/emails"


def _plantilla(codigo: str) -> str:
    """HTML del correo.

    Escrito con tablas y estilos en línea a propósito: los clientes de correo
    —Outlook y Gmail sobre todo— descartan las hojas de estilo y entienden mal
    flexbox o grid. Lo que en una web sería anticuado, aquí es lo único que se
    ve igual en todas partes.
    """
    minutos = settings.codigo_minutos
    return f"""<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#fafafa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;">

          <!-- Cabecera negra, igual que la barra lateral de la app -->
          <tr>
            <td style="background:#0a0a0b;padding:22px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:34px;height:34px;background:#ffffff;border-radius:10px;text-align:center;vertical-align:middle;font-family:'Nunito',Segoe UI,Arial,sans-serif;font-size:17px;font-weight:800;color:#0a0a0b;line-height:34px;">C</td>
                  <td style="padding-left:10px;font-family:'Nunito',Segoe UI,Arial,sans-serif;">
                    <div style="font-size:15px;font-weight:800;color:#ffffff;line-height:1.2;">Counter</div>
                    <div style="font-size:11px;color:#a1a1aa;">N&oacute;mina y aportes PILA</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 28px;font-family:'Nunito',Segoe UI,Arial,sans-serif;">
              <div style="font-size:18px;font-weight:800;color:#18181b;margin-bottom:6px;">Tu c&oacute;digo de acceso</div>
              <div style="font-size:13.5px;color:#71717a;line-height:1.55;margin-bottom:24px;">
                Escr&iacute;belo en la pantalla de ingreso para entrar a Counter.
              </div>

              <!-- El código, grande y espaciado para copiarlo de un vistazo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:20px 0;">
                    <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#18181b;">{codigo}</div>
                  </td>
                </tr>
              </table>

              <div style="font-size:12.5px;color:#a1a1aa;line-height:1.55;margin-top:24px;">
                Caduca en {minutos} minutos y solo sirve una vez.
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:18px 28px;font-family:'Nunito',Segoe UI,Arial,sans-serif;font-size:12px;color:#a1a1aa;line-height:1.55;">
              Si no fuiste t&uacute; quien lo pidi&oacute;, ignora este correo: sin el c&oacute;digo nadie puede entrar.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _texto_plano(codigo: str) -> str:
    return (
        f"Tu codigo de acceso a Counter es: {codigo}\n\n"
        f"Caduca en {settings.codigo_minutos} minutos y solo sirve una vez.\n"
        "Si no fuiste tu quien lo pidio, ignora este correo."
    )


def enviar_codigo(codigo: str) -> None:
    """Manda el código al correo configurado en el servidor.

    Lanza excepción si falla; quien llama decide qué contarle al usuario —y
    nunca menciona la dirección de destino.
    """
    # Sin API key no hay a dónde enviar, así que el código sale por el
    # registro del servidor para poder probar el flujo en local. No es una
    # puerta trasera: el código solo aparece en la consola de quien tiene
    # acceso a la máquina, jamás en la respuesta HTTP. En producción hay que
    # configurar RESEND_API_KEY, y si falta la app lo avisa al arrancar.
    if not settings.resend_api_key:
        print("\n" + "=" * 52)
        print("  MODO LOCAL — el correo no se envió (falta RESEND_API_KEY)")
        print(f"  Código de acceso: {codigo}")
        print("=" * 52 + "\n", flush=True)
        return

    respuesta = httpx.post(
        RESEND_URL,
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json={
            "from": settings.auth_remitente,
            "to": [settings.auth_correo_destino],
            "subject": f"{codigo} es tu código de acceso a Counter",
            "html": _plantilla(codigo),
            "text": _texto_plano(codigo),
        },
        timeout=15,
    )
    respuesta.raise_for_status()
