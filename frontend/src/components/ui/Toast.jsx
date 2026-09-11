import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { IconoExito, IconoError } from '../iconos';
import './Toast.css';

const ICONOS = { exito: IconoExito, peligro: IconoError };

/**
 * Píldora de confirmación al pie de la pantalla.
 *
 * Para avisos que no exigen nada del usuario: aparece, confirma y se va sola.
 * Va con role="status" para que un lector de pantalla lo anuncie sin robar el
 * foco ni interrumpir lo que esté leyendo.
 */
export default function Toast({
  abierto,
  mensaje,
  tipo = 'exito',
  duracion = 3200,
  onCerrar,
}) {
  const sinMovimiento = useReducedMotion();
  const Icono = ICONOS[tipo] ?? IconoExito;

  useEffect(() => {
    if (!abierto) return;
    const id = setTimeout(() => onCerrar?.(), duracion);
    return () => clearTimeout(id);
  }, [abierto, duracion, onCerrar]);

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="toast-capa">
          <motion.div
            className={`toast toast--${tipo}`}
            role="status"
            aria-live="polite"
            initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: sinMovimiento
                ? { duration: 0.001 }
                : { type: 'spring', damping: 26, stiffness: 380, mass: 0.7 },
            }}
            exit={{
              opacity: 0,
              y: 12,
              scale: 0.98,
              transition: { duration: sinMovimiento ? 0.001 : 0.18 },
            }}
          >
            <span className="toast__icono" aria-hidden="true">
              <Icono size={20} weight="fill" />
            </span>
            <span className="toast__texto">{mensaje}</span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
