import "./PantallaPendiente.css";

export default function PantallaPendiente({ titulo, descripcion, fase, children }) {
  return (
    <div className="pantalla">
      <header className="pantalla__cabecera">
        <div>
          <h1>{titulo}</h1>
          <p className="pantalla__descripcion">{descripcion}</p>
        </div>
        <span className="pantalla__fase">Fase {fase}</span>
      </header>

      {children ?? (
        <div className="pantalla__vacio">
          <p>Esta pantalla se construye en la Fase {fase}, según el orden de construcción del proyecto.</p>
          <p className="pantalla__vacio-nota">Todavía no hay datos ni lógica de negocio implementados aquí.</p>
        </div>
      )}
    </div>
  );
}
