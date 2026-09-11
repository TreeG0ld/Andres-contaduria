import './BotonAccion.css';

/**
 * Botón primario con destello en hover.
 *
 * Adaptado del patrón "glare shine": franja de luz inclinada que barre en
 * bucle, más un leve crecimiento al pasar el cursor y un hundido al pulsar.
 * La franja es decorativa, así que no aporta nada al árbol de accesibilidad.
 */
export default function BotonAccion({
  children,
  icono,
  className = '',
  ...props
}) {
  return (
    <button
      className={['boton', 'boton--primario', 'boton--brillo', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <span className="boton-brillo__contenido">
        {icono}
        {children}
      </span>
      <span className="boton-brillo__destello" aria-hidden="true" />
    </button>
  );
}
