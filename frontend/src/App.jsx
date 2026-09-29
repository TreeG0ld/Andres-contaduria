import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import PantallaCarga from "./features/carga/PantallaCarga";
import PantallaHistorial from "./features/historial/PantallaHistorial";
import PantallaRevision from "./features/revision/PantallaRevision";
import PantallaFormulas from "./features/formulas/PantallaFormulas";
import PantallaPlantillas from "./features/plantillas/PantallaPlantillas";
import PantallaTrabajadores from "./features/trabajadores/PantallaTrabajadores";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PantallaCarga />} />
          <Route path="historial" element={<PantallaHistorial />} />
          <Route path="revision" element={<PantallaRevision />} />
          <Route path="formulas" element={<PantallaFormulas />} />
          <Route path="plantillas" element={<PantallaPlantillas />} />
          <Route path="trabajadores" element={<PantallaTrabajadores />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
