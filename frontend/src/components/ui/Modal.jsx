import { useEffect, useRef, useState, useId } from 'react';
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

  // "presente" cubre también la animación de salida: sigue en true mientras
  // el panel se está yendo. De eso depende el bloqueo del scroll (ver abajo).
  const [presente, setPresente] = useState(abierto);

  const idTitulo = `${useId()}-titulo`;

  useEffect(() => {
    if (abierto) setPresente(true);
  }, [abierto]);

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

  // Bloquea el scroll del fondo compensando el ancho de la barra.
  //
  // Depende de "presente", no de "abierto": si se soltara al pulsar cerrar,
  // la barra de scroll reaparecería con la animación de salida a medias, el
  // viewport se angostaría y el panel —centrado sobre una capa fija— se iría
  // de lado justo mientras se desvanece.
  useEffect(() => {
    if (!presente) return;
    const { body } = document;
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    const overflowPrevio = body.style.overflow;
    const paddingPrevio = body.style.paddingRight;

    body.style.overflow = 'hidden';
    if (anchoBarra > 0) {
      body.style.paddingRight = `${anchoBarra}px`;
      // Al ocultar la barra, el viewport se ensancha y con él la capa fija:
      // el panel centrado se correría media barra a la derecha justo al
      // aparecer. Se le pasa la medida a la capa para que compense.
      document.documentElement.style.setProperty('--ancho-barra-scroll', `${anchoBarra}px`);
    }

    return () => {
      body.style.overflow = overflowPrevio;
      body.style.paddingRight = paddingPrevio;
      document.documentElement.style.removeProperty('--ancho-barra-scroll');
    };
  }, [presente]);

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
    <AnimatePresence
      onExitComplete={() => {
        setPresente(false);
        onCerrado?.();
      }}
    >
      {abierto && (
        <div className="modal-capa">
          <motion.div
            className="modal-fondo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: sinMovimiento ? 0.001 : 0.18 }}
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
            // Escala corta a propósito: al animar scale sobre texto el
            // navegador lo rasteriza a un tamaño y lo reescala, y al terminar
            // lo redibuja nítido. Cuanto mayor el salto, más se nota ese
            // "reajuste". El movimiento lo aporta sobre todo la Y.
            initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 14 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: sinMovimiento ? { duration: 0.001 } : ENTRADA,
            }}
            // Sale solo desvaneciéndose y encogiendo un pelo: sin desplazar
            // en Y, que es lo que hacía ver el cierre como un tirón.
            exit={{
              opacity: 0,
              scale: 0.98,
              y: 0,
              transition: sinMovimiento ? { duration: 0.001 } : SALIDA,
            }}
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
