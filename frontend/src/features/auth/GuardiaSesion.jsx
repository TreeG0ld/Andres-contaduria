import { useState, useEffect, createContext, useContext } from 'react';
import PantallaLogin from './PantallaLogin';

const ContextoSesion = createContext({ salir: () => {} });

/** Da acceso a `salir()` desde cualquier punto de la app (lo usa el pie de
 *  la barra lateral) sin tener que ir pasando la función por props. */
export function useSesion() {
  return useContext(ContextoSesion);
}

/**
 * Decide si se muestra la app o la pantalla de ingreso.
 *
 * Además envuelve fetch una sola vez para detectar los 401: si la sesión
 * caduca a media jornada, el usuario vería errores sueltos en cada pantalla
 * sin entender por qué. Interceptar aquí evita tener que añadir el mismo
 * control en las cinco pantallas y en cada llamada.
 */
export default function GuardiaSesion({ children }) {
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    let vivo = true;

    fetch('/api/auth/sesion')
      .then((r) => r.json())
      .then((d) => vivo && setEstado(d.activa ? 'dentro' : 'fuera'))
      .catch(() => vivo && setEstado('fuera'));

    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (estado !== 'dentro') return;

    const original = window.fetch;
    window.fetch = async (...args) => {
      const respuesta = await original(...args);
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url ?? '';
      // Los propios endpoints de acceso devuelven 401 cuando el código está
      // mal; ese caso lo maneja la pantalla de ingreso, no este guardián.
      if (respuesta.status === 401 && !url.includes('/api/auth/')) {
        setEstado('fuera');
      }
      return respuesta;
    };

    return () => {
      window.fetch = original;
    };
  }, [estado]);

  const salir = async () => {
    try {
      await fetch('/api/auth/salir', { method: 'POST' });
    } catch {
      // Aunque falle la petición se cierra igual: la cookie caduca sola y
      // dejar al usuario dentro porque el servidor no respondió sería peor.
    }
    setEstado('fuera');
  };

  if (estado === 'cargando') {
    return <div className="cargando">Verificando sesión...</div>;
  }

  if (estado === 'fuera') {
    return <PantallaLogin onEntrar={() => setEstado('dentro')} />;
  }

  return (
    <ContextoSesion.Provider value={{ salir }}>{children}</ContextoSesion.Provider>
  );
}
