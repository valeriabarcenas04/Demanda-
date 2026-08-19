(() => {
  const STORAGE_KEY = "expedienteDigital.demandas";

  /** @type {Array<Object>} Arreglo que sustituye a los arreglos paralelos del algoritmo */
  let demandas = cargarDemandas();

  // ---- Referencias al DOM ----
  const form = document.getElementById("demandaForm");
  const tipoJuicioSelect = document.getElementById("tipoJuicio");
  const campoOtroJuicio = document.getElementById("campoOtroJuicio");
  const tipoJuicioOtroInput = document.getElementById("tipoJuicioOtro");
  const expedientePreview = document.getElementById("expedientePreview");
  const formMsg = document.getElementById("formMsg");
  const recordsList = document.getElementById("recordsList");
  const recordsEmpty = document.getElementById("recordsEmpty");
  const recordCount = document.getElementById("recordCount");
  const clearRecordsBtn = document.getElementById("clearRecords");

  // ---- Menú móvil ----
  const navToggle = document.getElementById("navToggle");
  const tabs = document.querySelector(".tabs");
  navToggle?.addEventListener("click", () => {
    const isOpen = tabs.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  tabs?.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => tabs.classList.remove("open"))
  );

  // ---- Equivalente al "Según tipoJuicio Hacer" del algoritmo ----
  // Caso 4 ("Otro") pide captura manual, igual que en el pseudocódigo.
  tipoJuicioSelect.addEventListener("change", () => {
    const esOtro = tipoJuicioSelect.value === "Otro";
    campoOtroJuicio.hidden = !esOtro;
    tipoJuicioOtroInput.required = esOtro;
    if (!esOtro) tipoJuicioOtroInput.value = "";
  });

  actualizarPreviewExpediente();
  renderDemandas();

  // ---- Registro de una demanda (equivalente al caso "1" del menú) ----
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const datos = leerFormulario();

    // "Validar que un formulario no esté vacío"
    const faltantes = camposFaltantes(datos);
    if (faltantes.length > 0) {
      mostrarMensaje(
        `Faltan datos por capturar: ${faltantes.join(", ")}.`,
        "error"
      );
      return;
    }

    const numeroExpediente = demandas.length + 1;
    const demanda = {
      expediente: `${String(numeroExpediente).padStart(3, "0")}/${new Date().getFullYear()}`,
      juicio: datos.tipoJuicio === "Otro" ? datos.tipoJuicioOtro : datos.tipoJuicio,
      asunto: datos.asunto,
      actor: datos.actor,
      abogado: datos.abogado,
      demandado: datos.demandado,
      pretensiones: datos.pretensiones,
      hechos: datos.hechos,
      fundamentos: datos.fundamentos,
      valorDemanda: datos.valorDemanda,
      pruebas: datos.pruebas,
      copias: datos.copias,
      registradaEn: new Date().toLocaleString("es-MX")
    };

    demandas.push(demanda);
    guardarDemandas();
    renderDemandas();
    actualizarPreviewExpediente();

    // Mensaje dinámico personalizado con el nombre capturado en "actor"
    const nombreActor = datos.actor.split(",")[0].trim();
    mostrarMensaje(
      `Expediente ${demanda.expediente} registrado correctamente para ${nombreActor}.`,
      "ok"
    );

    form.reset();
    campoOtroJuicio.hidden = true;
    tipoJuicioOtroInput.required = false;

    document.getElementById("recordsList").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // ---- Vaciar registros (equivalente a reiniciar "total") ----
  clearRecordsBtn.addEventListener("click", () => {
    if (demandas.length === 0) return;
    const confirmado = confirm("¿Vaciar todos los expedientes registrados? Esta acción no se puede deshacer.");
    if (!confirmado) return;
    demandas = [];
    guardarDemandas();
    renderDemandas();
    actualizarPreviewExpediente();
    mostrarMensaje("Se vaciaron los expedientes registrados.", "ok");
  });

  // =========================================================
  // Funciones auxiliares
  // =========================================================

  function leerFormulario() {
    return {
      asunto: document.getElementById("asunto").value.trim(),
      tipoJuicio: tipoJuicioSelect.value,
      tipoJuicioOtro: tipoJuicioOtroInput.value.trim(),
      actor: document.getElementById("actor").value.trim(),
      abogado: document.getElementById("abogado").value.trim(),
      demandado: document.getElementById("demandado").value.trim(),
      pretensiones: document.getElementById("pretensiones").value.trim(),
      hechos: document.getElementById("hechos").value.trim(),
      fundamentos: document.getElementById("fundamentos").value.trim(),
      valorDemanda: document.getElementById("valorDemanda").value.trim(),
      pruebas: document.getElementById("pruebas").value.trim(),
      copias: document.getElementById("copias").value,
      firma: document.getElementById("firma").checked
    };
  }

  function camposFaltantes(datos) {
    const etiquetas = {
      asunto: "Asunto",
      tipoJuicio: "Tipo de juicio",
      actor: "Parte actora",
      abogado: "Abogado",
      demandado: "Parte demandada",
      pretensiones: "Pretensiones",
      hechos: "Hechos",
      fundamentos: "Fundamentos de derecho",
      valorDemanda: "Valor de la demanda",
      pruebas: "Pruebas y testigos",
      copias: "Copias de traslado"
    };

    const faltantes = Object.keys(etiquetas).filter(campo => !datos[campo]);

    if (datos.tipoJuicio === "Otro" && !datos.tipoJuicioOtro) {
      faltantes.push("Especificación del tipo de juicio");
    }
    if (!datos.firma) {
      faltantes.push("Firma de conformidad");
    }
    return faltantes.map(campo => etiquetas[campo] || campo);
  }

  function mostrarMensaje(texto, tipo) {
    formMsg.textContent = texto;
    formMsg.className = "form-msg " + (tipo === "ok" ? "ok" : "error");
  }

  function actualizarPreviewExpediente() {
    const siguiente = demandas.length + 1;
    expedientePreview.textContent = `#${String(siguiente).padStart(3, "0")} / ${new Date().getFullYear()}`;
  }

  // "Si total = 0 ... SiNo ... Para i <- 1 Hasta total Hacer"
  function renderDemandas() {
    recordCount.textContent = `(${demandas.length})`;
    recordsList.querySelectorAll(".record-card").forEach(el => el.remove());

    if (demandas.length === 0) {
      recordsEmpty.hidden = false;
      return;
    }
    recordsEmpty.hidden = true;

    demandas.forEach((d, indice) => {
      recordsList.appendChild(crearTarjeta(d, indice + 1));
    });
  }

  function crearTarjeta(demanda, numero) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "record-card";
    tarjeta.innerHTML = `
      <span class="stamp">Registrada</span>
      <div class="record-head">
        <span class="record-num">Expediente ${escapar(demanda.expediente)}</span>
        <span class="record-tipo">${escapar(demanda.juicio)}</span>
      </div>
      <h4 class="record-title">${escapar(demanda.asunto)}</h4>
      <p class="record-row"><b>Actor:</b> ${escapar(demanda.actor)}</p>
      <p class="record-row"><b>Demandado:</b> ${escapar(demanda.demandado)}</p>
      <p class="record-row"><b>Abogado:</b> ${escapar(demanda.abogado)}</p>
      <p class="record-row"><b>Valor:</b> ${escapar(demanda.valorDemanda)}</p>
      <p class="record-row"><b>Copias de traslado:</b> ${escapar(demanda.copias)}</p>
    `;
    return tarjeta;
  }

  function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
  }

  function guardarDemandas() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demandas));
    } catch (error) {
      console.warn("No se pudieron guardar los expedientes localmente:", error);
    }
  }

  function cargarDemandas() {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      return guardado ? JSON.parse(guardado) : [];
    } catch (error) {
      console.warn("No se pudieron cargar los expedientes guardados:", error);
      return [];
    }
  }
})();
