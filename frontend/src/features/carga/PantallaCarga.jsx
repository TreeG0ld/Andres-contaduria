import PantallaPendiente from "../../components/PantallaPendiente";
import { IconoSubida } from "../../components/iconos";
import "./PantallaCarga.css";

const OPERADORES = ["SOI", "Arus", "Simple", "Enlace Operativo"];

export default function PantallaCarga() {
  return (
    <PantallaPendiente
      titulo="Nueva carga"
      descripcion="Sube la planilla PILA en PDF y elige el operador que la emitió."
      fase="1-2"
      centrado
    >
      <div className="carga">
        <div className="carga__dropzone">
          <IconoSubida size={30} />
          <p>Arrastra el PDF de la planilla o haz clic para elegirlo</p>
          <span className="carga__nota">Se detecta la firma del operador automáticamente</span>
        </div>

        <div className="carga__operador">
          <label htmlFor="operador">Operador</label>
          <select id="operador" disabled defaultValue="">
            <option value="" disabled>
              Selecciona un operador
            </option>
            {OPERADORES.map((op) => (
              <option key={op}>{op}</option>
            ))}
          </select>
          <button type="button" disabled>
            Procesar carga
          </button>
        </div>
      </div>
    </PantallaPendiente>
  );
}
