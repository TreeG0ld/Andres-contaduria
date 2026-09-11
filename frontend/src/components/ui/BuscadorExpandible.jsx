import { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { IconoBuscar, IconoCerrar } from '../iconos';
import './BuscadorExpandible.css';

const ANCHO_CERRADO = 40;

/**
 * Buscador que vive plegado como un botón de lupa y se abre en barra al pasar
 * el cursor o al recibir el foco.
 *
 * Se mantiene abierto mientras haya texto escrito: plegarse con una búsqueda
 * activa escondería el motivo por el que la lista está filtrada.
 */
export default function BuscadorExpandible({
  valor,
  onChange,
  placeholder = 'Buscar...',
  etiqueta = 'Buscar',
  ancho = 300,
}) {
  const [hover, setHover] = useState(false);
  const [foco, setFoco] = useState(false);
  const campoRef = useRef(null);
  const sinMovimiento = useReducedMotion();

  const abierto = hover || foco || Boolean(valor);

  const limpiar = () => {
    onChange('');
    campoRef.current?.focus();
  };

  return (
    <motion.div
      className={`buscador${abierto ? ' buscador--abierto' : ''}`}
      animate={{ width: abierto ? ancho : ANCHO_CERRADO }}
      initial={false}
      transition={
        sinMovimiento
          ? { duration: 0.001 }
          : { type: 'spring', damping: 30, stiffness: 340, mass: 0.7 }
      }
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="buscador__lupa"
        aria-label={etiqueta}
        onClick={() => campoRef.current?.focus()}
      >
        <IconoBuscar size={17} aria-hidden="true" />
      </button>

      <input
        ref={campoRef}
        type="search"
        className="buscador__campo"
        placeholder={placeholder}
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (valor) onChange('');
            else campoRef.current?.blur();
          }
        }}
      />

      <AnimatePresence>
        {valor && (
          <motion.button
            type="button"
            className="buscador__limpiar"
            aria-label="Limpiar búsqueda"
            onClick={limpiar}
            initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            transition={{ duration: sinMovimiento ? 0.001 : 0.14 }}
          >
            <IconoCerrar size={14} aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
