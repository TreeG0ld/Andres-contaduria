const BASE_URL = "/api";

export async function obtenerSalud() {
  const respuesta = await fetch(`${BASE_URL}/salud`);
  if (!respuesta.ok) {
    throw new Error(`Error de red: ${respuesta.status}`);
  }
  return respuesta.json();
}
