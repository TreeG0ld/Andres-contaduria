import { useState, useRef, useEffect } from 'react';
import Aviso from '../../components/Aviso';
import BotonAccion from '../../components/ui/BotonAccion';
import './PantallaLogin.css';

const LARGO = 6;

/**
 * Pantalla de ingreso por código de un solo uso.
 *
 * No hay campo de correo a propósito: el backend ya sabe a dónde enviarlo y
 * esa dirección nunca llega al navegador, así que no se puede averiguar
 * mirando la red ni el código de la página.
 */
export default function PantallaLogin({ onEntrar }) {
  const [digitos, setDigitos] = useState(Array(LARGO).fill(''));
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);
  const [espera, setEspera] = useState(0);

  const refs = useRef([]);

  // Cuenta atrás para poder reenviar
  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const codigo = digitos.join('');

  const solicitar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/solicitar', { method: 'POST' });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.detail || 'No se pudo enviar el código.');
      } else {
        setEnviado(true);
        setEspera(60);
        setDigitos(Array(LARGO).fill(''));
        setTimeout(() => refs.current[0]?.focus(), 50);
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const verificar = async (valor) => {
    setVerificando(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: valor }),
      });
      const datos = await res.json().catch(() => ({}));
      if (res.ok) {
        onEntrar();
      } else {
        setError(datos.detail || 'Código incorrecto o vencido.');
        setDigitos(Array(LARGO).fill(''));
        refs.current[0]?.focus();
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setVerificando(false);
    }
  };

  const escribir = (indice, valor) => {
    const limpio = valor.replace(/\D/g, '');
    if (!limpio) return;

    const nuevos = [...digitos];
    // Escribir en la primera casilla con el código completo copiado también
    // debe funcionar: se reparte carácter a carácter.
    limpio.split('').forEach((c, i) => {
      if (indice + i < LARGO) nuevos[indice + i] = c;
    });
    setDigitos(nuevos);

    const siguiente = Math.min(indice + limpio.length, LARGO - 1);
    refs.current[siguiente]?.focus();

    const completo = nuevos.join('');
    if (completo.length === LARGO && !completo.includes('')) {
      verificar(completo);
    }
  };

  const teclear = (indice, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const nuevos = [...digitos];
      if (nuevos[indice]) {
        nuevos[indice] = '';
        setDigitos(nuevos);
      } else if (indice > 0) {
        nuevos[indice - 1] = '';
        setDigitos(nuevos);
        refs.current[indice - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && indice > 0) {
      refs.current[indice - 1]?.focus();
    } else if (e.key === 'ArrowRight' && indice < LARGO - 1) {
      refs.current[indice + 1]?.focus();
    }
  };

  const pegar = (e) => {
    e.preventDefault();
    const texto = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, LARGO);
    if (texto) escribir(0, texto);
  };

  return (
    <div className="login">
      <div className="login__tarjeta">
        <div className="login__marca">
          <span className="login__logo">C</span>
          <div>
            <div className="login__nombre">Counter</div>
            <div className="login__submarca">Nómina y aportes PILA</div>
          </div>
        </div>

        <div className="login__cuerpo">
          {!enviado ? (
            <>
              <h1 className="login__titulo">Ingreso</h1>
              <p className="login__texto">
                Te enviaremos un código de {LARGO} dígitos al correo autorizado
                para entrar.
              </p>

              {error && <Aviso tipo="peligro">{error}</Aviso>}

              <BotonAccion
                type="button"
                className="boton--bloque"
                onClick={solicitar}
                disabled={enviando}
              >
                {enviando ? 'Enviando...' : 'Enviarme el código'}
              </BotonAccion>
            </>
          ) : (
            <>
              <h1 className="login__titulo">Ingresa el código</h1>
              <p className="login__texto">
                Revisa tu correo y escribe aquí los {LARGO} dígitos. Caduca en
                10 minutos.
              </p>

              {error && <Aviso tipo="peligro">{error}</Aviso>}

              <div className="login__digitos" onPaste={pegar}>
                {digitos.map((d, i) => (
                  <input
                    key={i}
                    ref={(nodo) => (refs.current[i] = nodo)}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={LARGO}
                    className={`login__digito${d ? ' login__digito--lleno' : ''}`}
                    value={d}
                    disabled={verificando}
                    aria-label={`Dígito ${i + 1} de ${LARGO}`}
                    onChange={(e) => escribir(i, e.target.value)}
                    onKeyDown={(e) => teclear(i, e)}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>

              <BotonAccion
                type="button"
                className="boton--bloque"
                onClick={() => verificar(codigo)}
                disabled={codigo.length < LARGO || verificando}
              >
                {verificando ? 'Verificando...' : 'Entrar'}
              </BotonAccion>

              <div className="login__pie">
                {espera > 0 ? (
                  <>Puedes pedir otro código en {espera}s</>
                ) : (
                  <>
                    ¿No te llegó?{' '}
                    <button
                      type="button"
                      className="login__reenviar"
                      onClick={solicitar}
                      disabled={enviando}
                    >
                      Reenviar
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
