import { useEffect, useState } from "react";
import { obtenerSalud } from "./api/cliente";
import "./App.css";

function App() {
  const [estadoApi, setEstadoApi] = useState("verificando...");

  useEffect(() => {
    obtenerSalud()
      .then((datos) => setEstadoApi(datos.estado))
      .catch(() => setEstadoApi("sin conexión con la API"));
  }, []);

  return (
    <main className="app">
      <h1>PILA</h1>
      <p>Procesador de planillas y generador de archivos planos.</p>
      <p>Estado de la API: {estadoApi}</p>
    </main>
  );
}

export default App;
