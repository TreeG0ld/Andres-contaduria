import { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { IconoCerrar } from '../iconos';
import './Modal.css';

const FOCALIZABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Entra con cuerpo, sale rápido: una salida lenta se siente como un pegote.
const ENTRADA = { type: 'spring', damping: 30, stiffness: 380, mass: 0.8 };
const SALIDA = { duration: 0.14, ease: [0.4, 0, 1, 1] };

/**
 * Modal centrado con apertura y cierre animados.
 *
 * Se encarga de lo que un diálogo necesita para no ser una trampa: Escape
 * cierra, el foco queda atrapado dentro mientras está abierto y vuelve al
 * elemento que lo disparó al cerrarse, y el fondo no puede desplazarse.
 *
 * onCerrado se llama cuando la animación de salida termina — útil para
 * limpiar los datos sin que el contenido parpadee a mitad del cierre.
 */
export default function Modal({
  abierto,
  onCerrar,
  onCerrado,
  titulo,
  descripcion,
  ancho = false,
  children,
}) {
  const panelRef = useRef(null);
  const focoPrevioRef = useRef(null);
  const sinMovimiento = useReducedMotion();

  const idTitulo = `${useId()}-titulo`;

  // Recuerda quién tenía el foco y se lo devuelve al cerrar
  useEffect(() => {
    if (!abierto) return;
    focoPrevioRef.current = document.activeElement;

    return () => {
      const previo = focoPrevioRef.current;
      if (previo instanceof HTMLElement) previo.focus();
    };
  }, [abierto]);

  // Mueve el foco al primer control del diálogo
  useEffect(() => {
    if (!abierto) return;
    const id = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const primero = panel.querySelector(FOCALIZABLES);
      (primero instanceof HTMLElement ? primero : panel).focus();
    });
    return () => cancelAnimationFrame(id);
  }, [abierto]);

  // Bloquea el scroll del fondo compensando el ancho de la barra, para que
  // la página no dé un salto lateral al abrir
  useEffect(() => {
    if (!abierto) return;
    const { body } = document;
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    const overflowPrevio = body.style.overflow;
    const paddingPrevio = body.style.paddingRight;

    body.style.overflow = 'hidden';
    if (anchoBarra > 0) body.style.paddingRight = `${anchoBarra}px`;

    return () => {
      body.style.overflow = overflowPrevio;
      body.style.paddingRight = paddingPrevio;
    };
  }, [abierto]);

  const alPresionarTecla = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCerrar?.();
      return;
    }

    if (e.key !== 'Tab') return;

    // Trampa de foco: el tabulador da la vuelta dentro del diálogo
    const panel = panelRef.current;
    if (!panel) return;
    const focalizables = Array.from(panel.querySelectorAll(FOCALIZABLES)).filter(
      (n) => n.offsetParent !== null
    );
    if (focalizables.length === 0) return;

    const primero = focalizables[0];
    const ultimo = focalizables[focalizables.length - 1];

    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  return createPortal(
    <AnimatePresence onExitComplete={onCerrado}>
      {abierto && (
        <div className="modal-capa">
          <motion.div
            className="modal-fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: sinMovimiento ? 0.001 : 0.2 }}
            onClick={onCerrar}
          />

          <motion.div
            ref={panelRef}
            className={`modal${ancho ? ' modal--ancho' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={idTitulo}
            tabIndex={-1}
            onKeyDown={alPresionarTecla}
            initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={sinMovimiento ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
            transition={
              sinMovimiento ? { duration: 0.001 } : { ...ENTRADA, exit: SALIDA }
            }
          >
            <header className="modal__cabecera">
              <div>
                <h2 className="modal__titulo" id={idTitulo}>
                  {titulo}
                </h2>
                {descripcion && <p className="modal__descripcion">{descripcion}</p>}
              </div>
              <button
                type="button"
                className="modal__cerrar"
                onClick={onCerrar}
                aria-label="Cerrar"
              >
                <IconoCerrar size={18} aria-hidden="true" />
              </button>
            </header>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
