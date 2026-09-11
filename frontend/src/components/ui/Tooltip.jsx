import { useState, useRef, useId, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import './Tooltip.css';

/**
 * Tooltip anclado a su contenido.
 *
 * El hover y el foco se escuchan en un envoltorio, no en el hijo: un botón
 * deshabilitado no emite eventos de ratón, así que un tooltip puesto sobre él
 * nunca se mostraría — y justo ahí es donde hace falta explicar por qué no se
 * puede continuar.
 *
 * Se dibuja en un portal para que no lo recorte ningún contenedor.
 */
export default function Tooltip({
  texto,
  children,
  posicion = 'arriba',
  bloque = false,
}) {
  const [visible, setVisible] = useState(false);
  const [caja, setCaja] = useState(null);
  const anclaRef = useRef(null);
  const sinMovimiento = useReducedMotion();
  const id = `${useId()}-tooltip`;

  useLayoutEffect(() => {
    if (!visible || !anclaRef.current) return;

    const medir = () => {
      const r = anclaRef.current?.getBoundingClientRect();
      if (r) setCaja(r);
    };
    medir();

    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [visible]);

  const mostrar = () => setVisible(true);
  const ocultar = () => setVisible(false);

  const arriba = posicion === 'arriba';

  return (
    <span
      ref={anclaRef}
      className={`tooltip-ancla${bloque ? ' tooltip-ancla--bloque' : ''}`}
      onMouseEnter={mostrar}
      onMouseLeave={ocultar}
      onFocusCapture={mostrar}
      onBlurCapture={ocultar}
      onKeyDown={(e) => e.key === 'Escape' && ocultar()}
      aria-describedby={visible ? id : undefined}
    >
      {children}

      {createPortal(
        <AnimatePresence>
          {visible && caja && (
            <motion.div
              id={id}
              role="tooltip"
              className={`tooltip tooltip--${posicion}`}
              style={{
                left: caja.left + caja.width / 2,
                top: arriba ? caja.top - 10 : undefined,
                bottom: arriba ? undefined : window.innerHeight - caja.bottom - 10,
                translate: arriba ? '-50% -100%' : '-50% 0',
              }}
              initial={
                sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: arriba ? 4 : -4 }
              }
              animate={sinMovimiento ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: sinMovimiento ? 0.001 : 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              {texto}
              <span className="tooltip__punta" aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  );
}
