import { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CaretDown, Check } from '@phosphor-icons/react';
import './Selector.css';

const ALTURA_MENU = 280;

// Mismo resorte del componente de referencia: abre con cuerpo pero sin rebote.
const RESORTE_PANEL = { type: 'spring', damping: 34, stiffness: 380, mass: 0.8 };
// El resaltado se mueve más rápido que el panel para que persiga al cursor.
const RESORTE_RESALTADO = { type: 'spring', damping: 30, stiffness: 520, mass: 0.8 };
const EASE_OUT_QUINT = [0.23, 1, 0.32, 1];

/**
 * Selector accesible que reemplaza al <select> nativo.
 *
 * Sigue el patrón combobox de ARIA: el foco nunca sale del disparador y la
 * opción resaltada se comunica con aria-activedescendant. El menú se dibuja
 * con createPortal sobre el body para que ningún contenedor con overflow
 * (las tablas, por ejemplo) lo recorte.
 *
 * La apertura está adaptada del patrón "smooth dropdown": el panel crece en
 * altura desde el borde del campo —no a lo ancho, porque ya nace con el ancho
 * del campo— y las opciones entran escalonadas en vertical.
 *
 * opciones: [{ valor, etiqueta, deshabilitada? }]
 */
export default function Selector({
  opciones = [],
  valor,
  onChange,
  id,
  disabled = false,
  placeholder = 'Selecciona una opción',
  compacto = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [posicion, setPosicion] = useState(null);

  const disparadorRef = useRef(null);
  const menuRef = useRef(null);
  const busquedaRef = useRef({ texto: '', hora: 0 });

  const sinMovimiento = useReducedMotion();

  const idGenerado = useId();
  const idBase = id || idGenerado;
  const idMenu = `${idBase}-menu`;
  const idResaltado = `${idBase}-resaltado`;

  // El lector de pantalla debe oír la etiqueta Y el valor elegido: se apunta
  // al <label> y al propio botón, cuyo contenido es el valor.
  const etiquetadoPor = ariaLabelledBy ? `${ariaLabelledBy} ${idBase}` : undefined;

  const indiceElegido = opciones.findIndex((o) => String(o.valor) === String(valor));
  const elegida = indiceElegido >= 0 ? opciones[indiceElegido] : null;

  // --- Posición del menú -------------------------------------------------
  // Se recalcula al abrir y en cada scroll o resize, para que el menú siga
  // pegado al campo aunque se mueva dentro de una tabla con scroll.
  const calcularPosicion = () => {
    const nodo = disparadorRef.current;
    if (!nodo) return;
    const caja = nodo.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - caja.bottom - 8;
    const espacioArriba = caja.top - 8;
    const haciaArriba = espacioAbajo < Math.min(ALTURA_MENU, 180) && espacioArriba > espacioAbajo;

    setPosicion({
      izquierda: caja.left,
      ancho: caja.width,
      haciaArriba,
      arriba: haciaArriba ? undefined : caja.bottom + 4,
      abajo: haciaArriba ? window.innerHeight - caja.top + 4 : undefined,
      alto: Math.min(ALTURA_MENU, haciaArriba ? espacioArriba : espacioAbajo),
    });
  };

  useLayoutEffect(() => {
    if (!abierto) return;
    calcularPosicion();

    const alMover = () => calcularPosicion();
    // capture: true para enterarse también del scroll de contenedores internos
    window.addEventListener('scroll', alMover, true);
    window.addEventListener('resize', alMover);
    return () => {
      window.removeEventListener('scroll', alMover, true);
      window.removeEventListener('resize', alMover);
    };
  }, [abierto]);

  // Mantiene la opción resaltada a la vista al navegar con el teclado
  useEffect(() => {
    if (!abierto || indiceActivo < 0 || !menuRef.current) return;
    const nodo = menuRef.current.querySelector(`#${CSS.escape(`${idBase}-opcion-${indiceActivo}`)}`);
    nodo?.scrollIntoView({ block: 'nearest' });
  }, [abierto, indiceActivo, idBase]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    const alClicFuera = (e) => {
      if (
        disparadorRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }
      setAbierto(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierto]);

  const abrir = (indiceInicial) => {
    if (disabled) return;
    setIndiceActivo(indiceInicial ?? (indiceElegido >= 0 ? indiceElegido : 0));
    setAbierto(true);
  };

  const cerrar = ({ devolverFoco = true } = {}) => {
    setAbierto(false);
    setIndiceActivo(-1);
    if (devolverFoco) disparadorRef.current?.focus();
  };

  const elegir = (indice) => {
    const opcion = opciones[indice];
    if (!opcion || opcion.deshabilitada) return;
    onChange?.(opcion.valor);
    cerrar();
  };

  const moverActivo = (paso) => {
    if (opciones.length === 0) return;
    let siguiente = indiceActivo;
    for (let i = 0; i < opciones.length; i++) {
      siguiente = (siguiente + paso + opciones.length) % opciones.length;
      if (!opciones[siguiente].deshabilitada) break;
    }
    setIndiceActivo(siguiente);
  };

  // Escribir las primeras letras salta a esa opción, igual que el select nativo
  const buscarPorTexto = (letra) => {
    const ahora = Date.now();
    const previo = ahora - busquedaRef.current.hora < 500 ? busquedaRef.current.texto : '';
    const texto = (previo + letra).toLowerCase();
    busquedaRef.current = { texto, hora: ahora };

    const encontrado = opciones.findIndex(
      (o) => !o.deshabilitada && o.etiqueta.toLowerCase().startsWith(texto)
    );
    if (encontrado >= 0) {
      if (abierto) setIndiceActivo(encontrado);
      else elegir(encontrado);
    }
  };

  const alPresionarTecla = (e) => {
    if (disabled) return;

    if (!abierto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        buscarPorTexto(e.key);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moverActivo(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moverActivo(-1);
        break;
      case 'Home':
        e.preventDefault();
        setIndiceActivo(opciones.findIndex((o) => !o.deshabilitada));
        break;
      case 'End': {
        e.preventDefault();
        const ultimo = [...opciones].reverse().findIndex((o) => !o.deshabilitada);
        if (ultimo >= 0) setIndiceActivo(opciones.length - 1 - ultimo);
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        elegir(indiceActivo);
        break;
      case 'Escape':
        e.preventDefault();
        cerrar();
        break;
      case 'Tab':
        cerrar({ devolverFoco: false });
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          buscarPorTexto(e.key);
        }
    }
  };

  const panel = (
    <AnimatePresence>
      {abierto && posicion && (
        <motion.div
          ref={menuRef}
          className={`selector-menu${posicion.haciaArriba ? ' selector-menu--arriba' : ''}${
            compacto ? ' selector-menu--sm' : ''
          }`}
          style={{
            left: posicion.izquierda,
            top: posicion.arriba,
            bottom: posicion.abajo,
            width: posicion.ancho,
          }}
          initial={sinMovimiento ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={sinMovimiento ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={sinMovimiento ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={sinMovimiento ? { duration: 0.001 } : RESORTE_PANEL}
        >
          <ul
            id={idMenu}
            role="listbox"
            aria-labelledby={ariaLabelledBy}
            aria-label={ariaLabel}
            className="selector-menu__lista"
            style={{ maxHeight: posicion.alto }}
          >
            {opciones.map((opcion, indice) => {
              const esElegida = indice === indiceElegido;
              const esActiva = indice === indiceActivo;
              // El escalonado se corta a los 8 primeros: con 20 cargas en el
              // filtro, encadenar todos los retrasos haría lentísima la apertura.
              const retraso = sinMovimiento ? 0 : 0.04 + Math.min(indice, 8) * 0.02;

              return (
                <motion.li
                  key={opcion.valor}
                  id={`${idBase}-opcion-${indice}`}
                  role="option"
                  aria-selected={esElegida}
                  aria-disabled={opcion.deshabilitada || undefined}
                  className={[
                    'selector-opcion',
                    esActiva ? 'selector-opcion--activa' : '',
                    esElegida ? 'selector-opcion--elegida' : '',
                    opcion.deshabilitada ? 'selector-opcion--deshabilitada' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  animate={sinMovimiento ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{
                    delay: retraso,
                    duration: sinMovimiento ? 0.001 : 0.18,
                    ease: EASE_OUT_QUINT,
                  }}
                  onMouseEnter={() => !opcion.deshabilitada && setIndiceActivo(indice)}
                  onClick={() => elegir(indice)}
                >
                  {/* Resaltado único que se desliza de una opción a otra */}
                  {esActiva && (
                    <motion.span
                      layoutId={idResaltado}
                      className="selector-opcion__fondo"
                      transition={sinMovimiento ? { duration: 0.001 } : RESORTE_RESALTADO}
                      aria-hidden="true"
                    >
                      <span className="selector-opcion__barra" />
                    </motion.span>
                  )}
                  <span className="selector-opcion__etiqueta">{opcion.etiqueta}</span>
                  <Check
                    size={14}
                    weight="bold"
                    className="selector-opcion__check"
                    aria-hidden="true"
                  />
                </motion.li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={disparadorRef}
        type="button"
        id={idBase}
        role="combobox"
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-controls={abierto ? idMenu : undefined}
        aria-activedescendant={
          abierto && indiceActivo >= 0 ? `${idBase}-opcion-${indiceActivo}` : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={etiquetadoPor}
        disabled={disabled}
        className={[
          'selector',
          compacto ? 'selector--sm' : '',
          abierto ? 'selector--abierto' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alPresionarTecla}
      >
        <span className={`selector__valor${elegida ? '' : ' selector__valor--vacio'}`}>
          {elegida ? elegida.etiqueta : placeholder}
        </span>
        <CaretDown size={14} weight="bold" className="selector__flecha" aria-hidden="true" />
      </button>

      {createPortal(panel, document.body)}
    </>
  );
}
