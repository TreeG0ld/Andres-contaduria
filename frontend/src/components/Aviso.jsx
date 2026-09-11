import {
  IconoExito,
  IconoError,
  IconoAdvertencia,
  IconoInfo,
} from "./iconos";

// Aviso de una sola forma para toda la app. El tipo define color E ícono:
// el color nunca es la única señal de lo que pasó.
const ICONOS = {
  exito: IconoExito,
  peligro: IconoError,
  advertencia: IconoAdvertencia,
  info: IconoInfo,
};

export default function Aviso({ tipo = "info", titulo, children }) {
  const Icono = ICONOS[tipo] ?? IconoInfo;
  // Los errores se anuncian de inmediato; el resto espera a que el lector
  // de pantalla termine lo que está diciendo.
  const rol = tipo === "peligro" ? "alert" : "status";

  return (
    <div className={`aviso aviso--${tipo}`} role={rol}>
      <span className="aviso__icono" aria-hidden="true">
        <Icono size={18} />
      </span>
      <div className="aviso__cuerpo">
        {titulo && <div className="aviso__titulo">{titulo}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
