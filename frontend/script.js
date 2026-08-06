/**
 * Counter — Dashboard de Liquidación PILA
 * Lógica DOM + fetch asíncrono hacia la API FastAPI. Vanilla JS, sin frameworks.
 */

(() => {
    "use strict";

    const API_BASE = "";
    const CUENTAS_DISPONIBLES = ["51", "52", "72"];

    const state = {
        trabajadores: [],
        historial: [],
    };

    const currencyFormatter = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    });

    // ---------------------------------------------------------------------
    // Referencias al DOM
    // ---------------------------------------------------------------------
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");
    const loadingOverlay = document.getElementById("loading-overlay");
    const uploadError = document.getElementById("upload-error");
    const resultadosSection = document.getElementById("resultados");
    const tablaBody = document.getElementById("tabla-body");
    const exportBtn = document.getElementById("export-btn");

    const sidebarNav = document.getElementById("sidebar-nav");
    const historialVacio = document.getElementById("historial-vacio");
    const historialLista = document.getElementById("historial-lista");
    const parametrosGrid = document.getElementById("parametros-grid");
    const parametrosForm = document.getElementById("parametros-form");
    const parametrosStatus = document.getElementById("parametros-status");
    const parametrosGuardarBtn = document.getElementById("parametros-guardar");

    // ---------------------------------------------------------------------
    // Navegación entre vistas (Nueva Liquidación / Historial / Parámetros / Nómina DIAN)
    // ---------------------------------------------------------------------
    const VISTAS = ["liquidacion", "historial", "parametros", "nomina-dian"];

    function cambiarVista(vista) {
        if (!VISTAS.includes(vista)) return;

        VISTAS.forEach((v) => {
            document.getElementById(`view-${v}`).classList.toggle("hidden", v !== vista);
        });

        document.querySelectorAll(".nav-link[data-view]").forEach((link) => {
            const esActivo = link.dataset.view === vista;
            link.classList.toggle("active", esActivo);
            if (esActivo) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        if (vista === "historial") renderHistorial();
        if (vista === "parametros") cargarParametros();
    }

    document.addEventListener("click", (event) => {
        const link = event.target.closest("[data-view]");
        if (!link) return;
        event.preventDefault();
        cambiarVista(link.dataset.view);
    });

    // ---------------------------------------------------------------------
    // Drag & Drop / selección de archivo
    // ---------------------------------------------------------------------
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInput.click();
        }
    });

    ["dragenter", "dragover"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropzone.classList.add("border-accent", "bg-blue-50/60");
        });
    });

    ["dragleave", "dragend"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropzone.classList.remove("border-accent", "bg-blue-50/60");
        });
    });

    dropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        dropzone.classList.remove("border-accent", "bg-blue-50/60");
        const [file] = event.dataTransfer.files;
        if (file) handleFile(file);
    });

    fileInput.addEventListener("change", () => {
        const [file] = fileInput.files;
        if (file) handleFile(file);
        fileInput.value = "";
    });

    function handleFile(file) {
        if (file.type !== "application/pdf") {
            showUploadError("Solo se aceptan archivos PDF.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showUploadError("El archivo supera el tamaño máximo de 10 MB.");
            return;
        }
        clearUploadError();
        uploadFile(file);
    }

    function showUploadError(mensaje) {
        uploadError.textContent = mensaje;
        uploadError.classList.remove("hidden");
    }

    function clearUploadError() {
        uploadError.classList.add("hidden");
        uploadError.textContent = "";
    }

    function setLoading(isLoading) {
        if (isLoading) {
            loadingOverlay.classList.remove("hidden");
            requestAnimationFrame(() => {
                loadingOverlay.classList.remove("opacity-0");
                loadingOverlay.classList.add("flex");
            });
        } else {
            loadingOverlay.classList.add("opacity-0");
            setTimeout(() => {
                loadingOverlay.classList.add("hidden");
                loadingOverlay.classList.remove("flex");
            }, 300);
        }
    }

    // ---------------------------------------------------------------------
    // Carga hacia la API (mock de extracción de PDF)
    // ---------------------------------------------------------------------
    async function uploadFile(file) {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("archivo", file);

            const response = await fetch(`${API_BASE}/api/liquidacion/procesar`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`El servidor respondió con estado ${response.status}`);
            }

            const data = await response.json();
            state.trabajadores = data.trabajadores;
            renderTabla();
            resultadosSection.classList.remove("hidden");

            state.historial.unshift({
                archivo: data.archivo_origen,
                totalTrabajadores: data.total_trabajadores,
                procesadoEn: new Date().toLocaleString("es-CO"),
            });
            renderHistorial();
        } catch (error) {
            showUploadError(`No se pudo procesar la planilla: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    // ---------------------------------------------------------------------
    // Render de la tabla de conceptos
    // ---------------------------------------------------------------------
    function renderTabla() {
        tablaBody.innerHTML = "";

        state.trabajadores.forEach((trabajador) => {
            trabajador.conceptos.forEach((concepto, index) => {
                const row = document.createElement("tr");
                row.className = "hover:bg-slate-50 transition-colors";

                if (index === 0) {
                    row.appendChild(
                        celda(trabajador.nombre_completo, "px-4 py-2.5 font-medium text-slate-900 align-top", trabajador.conceptos.length)
                    );
                    row.appendChild(
                        celda(trabajador.cedula, "px-4 py-2.5 text-slate-500 align-top", trabajador.conceptos.length)
                    );
                }

                const conceptoCell = document.createElement("td");
                conceptoCell.className = "px-4 py-2.5 text-slate-700";
                conceptoCell.textContent = concepto.nombre;
                row.appendChild(conceptoCell);

                row.appendChild(celdaValorEditable(trabajador.id, concepto));
                row.appendChild(celdaClasificacion(trabajador.id, concepto));

                tablaBody.appendChild(row);
            });
        });
    }

    function celda(texto, className, rowspan) {
        const td = document.createElement("td");
        td.className = className;
        td.textContent = texto;
        if (rowspan > 1) td.rowSpan = rowspan;
        return td;
    }

    function celdaValorEditable(trabajadorId, concepto) {
        const td = document.createElement("td");
        td.className =
            "px-4 py-2.5 text-right font-mono text-slate-800 focus:outline-2 focus:outline-accent focus:bg-blue-50 cursor-text";
        td.contentEditable = "true";
        td.dataset.trabajadorId = trabajadorId;
        td.dataset.conceptoId = concepto.id;
        td.dataset.role = "valor";
        td.textContent = currencyFormatter.format(concepto.valor);
        return td;
    }

    function celdaClasificacion(trabajadorId, concepto) {
        const td = document.createElement("td");
        td.className = "px-4 py-2.5";

        const select = document.createElement("select");
        select.className =
            "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-accent focus:outline-none";
        select.dataset.trabajadorId = trabajadorId;
        select.dataset.conceptoId = concepto.id;
        select.dataset.role = "clasificacion";

        CUENTAS_DISPONIBLES.forEach((codigo) => {
            const option = document.createElement("option");
            option.value = codigo;
            option.textContent = codigo;
            option.selected = codigo === concepto.clasificacion_cuenta;
            select.appendChild(option);
        });

        td.appendChild(select);
        return td;
    }

    function buscarConcepto(trabajadorId, conceptoId) {
        const trabajador = state.trabajadores.find((t) => t.id === trabajadorId);
        if (!trabajador) return null;
        return trabajador.conceptos.find((c) => String(c.id) === String(conceptoId)) || null;
    }

    // Commit de ediciones en la columna "Valor" (contenteditable)
    tablaBody.addEventListener("focusout", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || target.dataset.role !== "valor") return;

        const concepto = buscarConcepto(target.dataset.trabajadorId, target.dataset.conceptoId);
        if (!concepto) return;

        const numero = parseFloat(target.textContent.replace(/[^\d.-]/g, ""));
        concepto.valor = Number.isFinite(numero) ? numero : 0;
        target.textContent = currencyFormatter.format(concepto.valor);
    });

    // Commit de ediciones en la columna "Clasificación de Cuenta" (select)
    tablaBody.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLSelectElement) || target.dataset.role !== "clasificacion") return;

        const concepto = buscarConcepto(target.dataset.trabajadorId, target.dataset.conceptoId);
        if (!concepto) return;

        concepto.clasificacion_cuenta = target.value;
    });

    // ---------------------------------------------------------------------
    // Historial de Archivos (sesión actual, sin persistencia todavía)
    // ---------------------------------------------------------------------
    function renderHistorial() {
        if (state.historial.length === 0) {
            historialVacio.classList.remove("hidden");
            historialLista.classList.add("hidden");
            return;
        }

        historialVacio.classList.add("hidden");
        historialLista.classList.remove("hidden");
        historialLista.innerHTML = "";

        state.historial.forEach((entrada) => {
            const li = document.createElement("li");
            li.className = "flex items-center justify-between gap-4 px-4 py-3";

            const info = document.createElement("div");
            info.innerHTML = `
                <p class="text-sm font-medium text-slate-900">${entrada.archivo}</p>
                <p class="text-xs text-slate-500">${entrada.procesadoEn}</p>
            `;

            const badge = document.createElement("span");
            badge.className = "shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-accent";
            badge.textContent = `${entrada.totalTrabajadores} trabajador${entrada.totalTrabajadores === 1 ? "" : "es"}`;

            li.appendChild(info);
            li.appendChild(badge);
            historialLista.appendChild(li);
        });
    }

    // ---------------------------------------------------------------------
    // Parámetros de Ley (tasas editables que alimentan los 19 conceptos)
    // ---------------------------------------------------------------------
    const CAMPOS_PARAMETROS = [
        { clave: "salario_minimo_mensual", etiqueta: "Salario mínimo mensual (SMLMV)", tipo: "moneda" },
        { clave: "auxilio_transporte", etiqueta: "Auxilio de transporte", tipo: "moneda" },
        { clave: "porc_salud_empleado", etiqueta: "Deducción salud (empleado) — afecta \"Deducción salud\"", tipo: "porcentaje" },
        { clave: "porc_pension_empleado", etiqueta: "Deducción pensión (empleado) — afecta \"Deducción pensión\"", tipo: "porcentaje" },
        { clave: "porc_salud_empleador", etiqueta: "Aporte salud (empleador) — afecta \"Aporte salud\"", tipo: "porcentaje" },
        { clave: "porc_pension_empleador", etiqueta: "Aporte pensión (empleador) — afecta \"Aporte pensión\"", tipo: "porcentaje" },
        { clave: "porc_arl_riesgo_i", etiqueta: "Aporte ARL (riesgo I) — afecta \"Aporte ARL\"", tipo: "porcentaje" },
        { clave: "porc_ccf", etiqueta: "Aporte CCF — afecta \"Aporte CCF\"", tipo: "porcentaje" },
        { clave: "porc_cesantias", etiqueta: "Provisión cesantías — afecta \"Provisión cesantías\"", tipo: "porcentaje" },
        { clave: "porc_intereses_cesantias", etiqueta: "Intereses sobre cesantías — afecta \"Provisión intereses\"", tipo: "porcentaje" },
        { clave: "porc_prima", etiqueta: "Provisión prima — afecta \"Provisión prima\"", tipo: "porcentaje" },
        { clave: "porc_vacaciones", etiqueta: "Provisión vacaciones — afecta \"Provisión vacaciones\"", tipo: "porcentaje" },
    ];

    async function cargarParametros() {
        parametrosStatus.textContent = "Cargando...";
        try {
            const response = await fetch(`${API_BASE}/api/parametros/`);
            if (!response.ok) throw new Error(`Estado ${response.status}`);
            const data = await response.json();
            renderParametrosForm(data);
            parametrosStatus.textContent = "";
        } catch (error) {
            parametrosStatus.textContent = `No se pudieron cargar los parámetros: ${error.message}`;
        }
    }

    function renderParametrosForm(data) {
        parametrosGrid.innerHTML = "";

        CAMPOS_PARAMETROS.forEach((campo) => {
            const wrapper = document.createElement("label");
            wrapper.className = "flex flex-col gap-1 text-sm";

            const texto = document.createElement("span");
            texto.className = "font-medium text-slate-700";
            texto.textContent = campo.etiqueta;

            const input = document.createElement("input");
            input.type = "number";
            input.name = campo.clave;
            input.step = campo.tipo === "porcentaje" ? "0.001" : "1";
            input.min = "0";
            input.required = true;
            input.className =
                "rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-accent focus:outline-none";

            const valorCrudo = data[campo.clave];
            input.value = campo.tipo === "porcentaje" ? (valorCrudo * 100).toFixed(3) : valorCrudo;

            const sufijo = document.createElement("span");
            sufijo.className = "text-xs text-slate-400";
            sufijo.textContent = campo.tipo === "porcentaje" ? "% sobre el IBC" : "COP";

            wrapper.appendChild(texto);
            wrapper.appendChild(input);
            wrapper.appendChild(sufijo);
            parametrosGrid.appendChild(wrapper);
        });
    }

    parametrosForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {};
        CAMPOS_PARAMETROS.forEach((campo) => {
            const input = parametrosForm.elements.namedItem(campo.clave);
            const numero = parseFloat(input.value);
            payload[campo.clave] = campo.tipo === "porcentaje" ? numero / 100 : numero;
        });

        parametrosGuardarBtn.disabled = true;
        parametrosStatus.textContent = "Guardando...";

        try {
            const response = await fetch(`${API_BASE}/api/parametros/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`Estado ${response.status}`);
            const data = await response.json();
            renderParametrosForm(data);
            parametrosStatus.textContent = "Cambios guardados. Las próximas liquidaciones usarán estos valores.";
        } catch (error) {
            parametrosStatus.textContent = `No se pudieron guardar los cambios: ${error.message}`;
        } finally {
            parametrosGuardarBtn.disabled = false;
        }
    });

    // ---------------------------------------------------------------------
    // Exportación a Excel
    // ---------------------------------------------------------------------
    exportBtn.addEventListener("click", async () => {
        if (state.trabajadores.length === 0) return;

        const textoOriginal = exportBtn.textContent;
        exportBtn.disabled = true;
        exportBtn.textContent = "Generando Excel...";

        try {
            const response = await fetch(`${API_BASE}/api/export/excel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trabajadores: state.trabajadores,
                    nombre_liquidacion: "liquidacion_pila",
                }),
            });

            if (!response.ok) {
                throw new Error(`El servidor respondió con estado ${response.status}`);
            }

            const blob = await response.blob();
            const nombreArchivo = extraerNombreArchivo(response.headers.get("Content-Disposition")) || "liquidacion_pila.xlsx";

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = nombreArchivo;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            showUploadError(`No se pudo exportar el archivo: ${error.message}`);
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = textoOriginal;
        }
    });

    function extraerNombreArchivo(contentDisposition) {
        if (!contentDisposition) return null;
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        return match ? match[1] : null;
    }
})();
