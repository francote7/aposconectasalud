// =====================================================
// APOS CONECTA — SISTEMA COMPLETO v2025
// ESTADO: Conexión Activa con API para la carga inicial y el módulo Afiliación.
// MEJORA: Fallback robusto a MOCK en caso de fallo de conexión a BDD.
// =====================================================

(() => {

  // ============================================
  // USUARIOS BASE DEL SISTEMA (MOCK TEMPORAL)
  // ============================================
  const users = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "auditor", password: "auditor123", role: "auditor" },
    { username: "prestador", password: "prestador123", role: "prestador" },
    { username: "operador", password: "operator123", role: "prestador" }
  ];

  let userList = [...users];

  // ============================================
  // PACIENTES - (AHORA SE CARGAN POR API O MOCK)
  // Se inicializa vacío. El contenido se llena con loadPatients().
  // ============================================
  let patients = [];
  
  // SNOMED MOCK (Mantener como array local por simplicidad)
  const snomedMock = [
    { code: "44054006", term: "Diabetes Mellitus tipo 2" },
    { code: "195967001", term: "Hipertensión arterial" },
    { code: "38341003", term: "Neumonía" },
    { code: "422034002", term: "Cefalea" },
    { code: "36971009", term: "Lumbalgia" },
    { code: "387713003", term: "Otitis media aguda" },
    { code: "86049000", term: "Asma bronquial" }
  ];


  // ============================================
  // ESTADO GLOBAL y REFERENCIAS DOM
  // ============================================
  let currentUser = null;
  let currentPatient = null;
  let diagSecundarios = [];

  const loginScreen = document.getElementById("login-screen");
  const mainScreen = document.getElementById("main-screen");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const currentUserEl = document.getElementById("current-user");
  const currentRoleEl = document.getElementById("current-role");
  const adminTab = document.getElementById("tab-admin");
  const adminPanelBtn = document.getElementById("admin-panel-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const patientListEl = document.getElementById("patient-list");
  const patientFilter = document.getElementById("patient-filter");
  const patientNameEl = document.getElementById("patient-name");
  const patientFiliatoryEl = document.getElementById("patient-filiatory");
  const resumenBody = document.getElementById("resumen-body");

  // Listas y Formularios
  const ambList = document.getElementById("ambulatorio-list");
  const intList = document.getElementById("internacion-list");
  const evoTimeline = document.getElementById("evoluciones-timeline");
  const farmList = document.getElementById("farmacia-list");
  const labList = document.getElementById("lab-list");
  const kineList = document.getElementById("kine-list");
  const odontoList = document.getElementById("odonto-list");
  const adminUserList = document.getElementById("admin-user-list");

  const formAmb = document.getElementById("form-ambulatorio");
  const formInt = document.getElementById("form-internacion");
  const formEvo = document.getElementById("form-evolucion");
  const formFarm = document.getElementById("form-farmacia");
  const formLab = document.getElementById("form-lab");
  const formKine = document.getElementById("form-kine");
  const formOdonto = document.getElementById("form-odonto");
  const formAdminUser = document.getElementById("admin-user-form");
  const adminCancelEdit = document.getElementById("admin-cancel-edit");
  const formAfiliacion = document.getElementById("form-afiliacion"); 

  const snomedSearchAmb = document.getElementById("snomed-search-amb");
  const snomedResultsAmb = document.getElementById("snomed-results-amb");
  const addSnomedAmb = document.getElementById("add-snomed-amb");

  const snomedSearchInt = document.getElementById("snomed-search-int");
  const snomedResultsInt = document.getElementById("snomed-results-int");
  const addSnomedInt = document.getElementById("add-snomed-int");


  // ============================================
  // LÓGICA DE CARGA DE DATOS (API - CON FALLBACK ROBUSTO)
  // ============================================

  /**
   * Función de respaldo para cargar datos mock en caso de fallo de la API.
   */
  function useMockFallback() {
      patients = [
          {
            id: "p1", nombre: "María González (MOCK)", documento: "23456789", nacimiento: "1976-04-12", sexo: "F",
            filiatory: { domicilio: "San Nicolás de Bari 699", telefono: "3804-123456", obra_social: "12345678900" },
            registros: { ambulatorio: [], internacion: { datos: null, evoluciones: [] }, farmacia: [], laboratorio: [], kinesiologia: [], odontologia: [] }
          },
          {
            id: "p2", nombre: "Juan Pérez (MOCK)", documento: "30987654", nacimiento: "1988-11-02", sexo: "M",
            filiatory: { domicilio: "25 de Mayo 442", telefono: "3804-369874", obra_social: "130987654" },
            registros: { ambulatorio: [], internacion: { datos: null, evoluciones: [] }, farmacia: [], laboratorio: [], kinesiologia: [], odontologia: [] }
          }
      ];
  }

  /**
   * Carga los afiliados desde el backend (api.php) o utiliza mock si falla.
   * **CORRECCIÓN: Se agrega manejo de errores robusto.**
   * @returns {Promise<void>}
   */
  async function loadPatients() {
    console.log("Cargando afiliados desde la API...");

    try {
        const response = await fetch('api.php?action=get_patients');
        
        // Verifica si la respuesta HTTP es exitosa
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();

        if (result.success) {
            // Transformar la estructura de la BDD (plana) al formato JS (anidado)
            patients = result.data.map(p => ({
                id: p.id,
                nombre: p.nombre,
                documento: p.documento,
                nacimiento: p.nacimiento,
                sexo: p.sexo,
                filiatory: { 
                    domicilio: p.domicilio, 
                    telefono: p.telefono, 
                    obra_social: p.obra_social 
                },
                registros: {
                    ambulatorio: [],
                    internacion: { datos: null, evoluciones: [] },
                    farmacia: [],
                    laboratorio: [],
                    kinesiologia: [],
                    odontologia: []
                }
            }));
            console.log(`Afiliados cargados: ${patients.length}`);
        } else {
            console.error("API Error (get_patients):", result.message);
            // Si la API responde pero con éxito: false, usamos el fallback.
            useMockFallback();
        }
    } catch (error) {
        // Si hay un error de red o de parsing de JSON (indicando fallo total del PHP/MySQL)
        console.error("Error de conexión o de parsing de JSON:", error);
        alert("¡Advertencia! Conexión a la BDD o API fallida. Usando datos MOCK de respaldo. Revise XAMPP/db_config.php");
        useMockFallback();
    }

    renderPatientList();
  }


  // ============================================
  // LOGIN
  // ============================================
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const u = usernameInput.value.trim();
    const p = passwordInput.value.trim();

    // La validación sigue siendo local (frontend)
    const found = userList.find(x => x.username === u && x.password === p);
    if (!found) return alert("Credenciales incorrectas");

    currentUser = found;
    currentUserEl.textContent = found.username;
    currentRoleEl.textContent = `Rol: ${found.role}`;

    loginScreen.classList.add("hidden");
    mainScreen.classList.remove("hidden");

    applyRolePermissions();
    loadPatients(); // <- Esta llamada está protegida por el fallback.
  });


  // ============================================
  // LOGOUT
  // ============================================
  logoutBtn.addEventListener("click", () => {
    currentUser = null;
    currentPatient = null;
    loginScreen.classList.remove("hidden");
    mainScreen.classList.add("hidden");
    usernameInput.value = "";
    passwordInput.value = "";
  });


  // ============================================
  // PERMISOS POR ROL
  // ============================================
  function applyRolePermissions() {
    if (!currentUser) return;

    if (currentUser.role === "admin" || currentUser.role === "prestador") {
      enableForms(true);
      if (currentUser.role === "admin") {
        adminTab.style.display = "inline-block";
        adminPanelBtn?.classList.remove("hidden");
      } else {
        adminTab.style.display = "none";
        adminPanelBtn?.classList.add("hidden");
      }

    } else if (currentUser.role === "auditor") {
      enableForms(false);
      adminTab.style.display = "none";
      adminPanelBtn?.classList.add("hidden");
    }
  }

  function enableForms(enable) {
    document.querySelectorAll("form").forEach(form => {
      Array.from(form.elements).forEach(el => {
        if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName)) {
          if(form.id !== 'login-form' && form.id !== 'admin-user-form' && el.id !== 'logout-btn' && el.id !== 'admin-cancel-edit') {
            el.disabled = !enable;
          }
        }
      });
    });
  }


  // ============================================
  // LISTADO DE PACIENTES
  // ============================================
  function renderPatientList(q = "") {
    patientListEl.innerHTML = "";
    q = q.toLowerCase();

    patients
      .filter(p => p.nombre.toLowerCase().includes(q) || p.documento.includes(q))
      .forEach(p => {
        const li = document.createElement("li");
        li.textContent = `${p.nombre} — DNI ${p.documento}`;
        li.addEventListener("click", () => selectPatient(p.id));
        patientListEl.appendChild(li);
      });
  }

  patientFilter.addEventListener("input", e => {
    renderPatientList(e.target.value);
  });


  // ============================================
  // SELECCIONAR PACIENTE
  // ============================================
  function selectPatient(id) {
    currentPatient = patients.find(p => p.id === id);

    patientNameEl.textContent = currentPatient.nombre;
    patientFiliatoryEl.textContent = `Domicilio: ${currentPatient.filiatory.domicilio} • Tel: ${currentPatient.filiatory.telefono} • OS: ${currentPatient.filiatory.obra_social}`;

    refreshModules();
  }


  // ============================================
  // TABS
  // ============================================
  document.getElementById("module-tabs").addEventListener("click", e => {
    const tab = e.target.closest(".tab");
    if (!tab) return;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.module).classList.add("active");

    if (tab.dataset.module === "admin") renderAdminUsers();
  });


  // ============================================
  // SNOMED
  // ============================================
  function populateSnomed(select, q) {
    select.innerHTML = "";
    const results = snomedMock.filter(s =>
      s.term.toLowerCase().includes(q.toLowerCase())
    );

    if (results.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "Sin resultados";
      opt.value = "";
      select.appendChild(opt);
      return;
    }

    results.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.code;
      opt.textContent = `${s.term} (${s.code})`;
      select.appendChild(opt);
    });
  }

  function setupSnomedInput(input, select) {
    input.addEventListener("input", () => populateSnomed(select, input.value));
    populateSnomed(select, "");
  }

  setupSnomedInput(snomedSearchAmb, snomedResultsAmb);
  setupSnomedInput(snomedSearchInt, snomedResultsInt);


  addSnomedAmb.addEventListener("click", () => {
    const code = snomedResultsAmb.value;
    const item = snomedMock.find(s => s.code === code);
    if (item) snomedSearchAmb.value = `${item.term} (${item.code})`;
  });

  addSnomedInt.addEventListener("click", () => {
    const code = snomedResultsInt.value;
    const item = snomedMock.find(s => s.code === code);
    if (item) snomedSearchInt.value = `${item.term} (${item.code})`;
  });


  function parseSnomed(txt) {
    if (!txt.includes("(")) return null;
    return {
      term: txt.substring(0, txt.lastIndexOf("(")).trim(),
      code: txt.substring(txt.lastIndexOf("(") + 1, txt.lastIndexOf(")"))
    };
  }


  // ============================================
  // REFRESH GENERAL DE MÓDULOS
  // ============================================
  function refreshModules() {
    if (!currentPatient) return;

    // RESUMEN
    resumenBody.innerHTML = `
      <strong>Últimas consultas:</strong><br>
      ${currentPatient.registros.ambulatorio.slice(-3).map(a => `${a.fecha} — ${a.motivo}`).join("<br>") || "Sin registros"}
      <br><br>
      <strong>Internación:</strong><br>
      ${currentPatient.registros.internacion.datos ? currentPatient.registros.internacion.datos.ingreso : "Sin internación"}
    `;

    // AMBULATORIO
    ambList.innerHTML = "";
    currentPatient.registros.ambulatorio.slice().reverse().forEach(a => {
      const div = document.createElement("div");
      div.className = "list";
      div.innerHTML = `
        <li>
          <strong>${a.fecha}</strong><br>
          Motivo: ${a.motivo}<br>
          Dx: ${a.dx.term} (${a.dx.code})<br>
        </li>`;
      ambList.appendChild(div);
    });

    // INTERNACION
    if (currentPatient.registros.internacion.datos) {
      const d = currentPatient.registros.internacion.datos;
      intList.innerHTML = `
        <div class="card small">
          <strong>Ingreso:</strong> ${d.ingreso}<br>
          Servicio: ${d.servicio} — Cama: ${d.cama}<br>
          Dx ingreso: ${d.dx.term}
        </div>
      `;
    } else {
      intList.innerHTML = "<div class='muted'>Sin internación</div>";
    }

    renderTimeline();

    // FARMACIA
    farmList.innerHTML = "";
    currentPatient.registros.farmacia.slice().reverse().forEach(f => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${f.fecha}</strong> — ${f.medicamento} x${f.cantidad}`;
      farmList.appendChild(li);
    });

    // LABORATORIO
    labList.innerHTML = "";
    currentPatient.registros.laboratorio.slice().reverse().forEach(l => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${l.fecha}</strong> — ${l.estudio}<br><span class="muted">${l.resultado}</span>`;
      labList.appendChild(li);
    });

    // KINESIOLOGÍA
    kineList.innerHTML = "";
    currentPatient.registros.kinesiologia.slice().reverse().forEach(k => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${k.fecha}</strong> — ${k.tecnica}`;
      kineList.appendChild(li);
    });

    // ODONTOLOGÍA
    odontoList.innerHTML = "";
    currentPatient.registros.odontologia.slice().reverse().forEach(o => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${o.fecha}</strong> — Pieza ${o.pieza} — ${o.practica}`;
      odontoList.appendChild(li);
    });

    // ADMIN
    renderAdminUsers();
  }


  // ============================================
  // TIMELINE
  // ============================================
  function renderTimeline() {
    evoTimeline.innerHTML = "";
    const reg = currentPatient.registros.internacion;

    if (!reg.datos) {
      evoTimeline.innerHTML = "<div class='muted'>Sin internación.</div>";
      return;
    }

    if (reg.evoluciones.length === 0) {
      evoTimeline.innerHTML = "<div class='muted'>Sin evoluciones.</div>";
      return;
    }

    reg.evoluciones.slice().reverse().forEach(ev => {
      const box = document.createElement("div");
      box.className = "timeline-entry";
      box.innerHTML = `
        <strong>${ev.fecha}</strong><br>
        <em>${ev.usuario}</em><br>
        ${ev.evo}
      `;
      evoTimeline.appendChild(box);
    });
  }


  // ============================================
  // FORMULARIOS DE REGISTRO HSI (Guardado local, debe migrar a API)
  // NOTA: Se mantiene el mock local en estos módulos.
  // ============================================

  // --- Ambulatorio ---
  formAmb.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentPatient) return alert("Elegir paciente");

    const fd = new FormData(formAmb);
    const profesional = fd.get("profesional");
    const matricula = fd.get("matricula");
    const fecha = fd.get("fecha");
    const motivo = fd.get("motivo");
    const examen = fd.get("examen");
    const plan = fd.get("plan");
    const obs = fd.get("obs");

    const dx = parseSnomed(snomedSearchAmb.value);
    if (!dx) return alert("SNOMED principal obligatorio");
    
    currentPatient.registros.ambulatorio.push({
      profesional, matricula, fecha, motivo, examen, plan, obs,
      dx,
      dxSec: [...diagSecundarios]
    });

    diagSecundarios = [];
    formAmb.reset();
    refreshModules();
    alert("Consulta Ambulatoria registrada (localmente)");
  });

  // --- Internación ---
  formInt.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentPatient) return;

    const fd = new FormData(formInt);
    const dx = parseSnomed(snomedSearchInt.value);
    if (!dx) return alert("SNOMED ingreso obligatorio");

    currentPatient.registros.internacion.datos = {
      tipo: fd.get("tipo"),
      ingreso: fd.get("ingreso"),
      servicio: fd.get("servicio"),
      cama: fd.get("cama"),
      dx
    };

    formInt.reset();
    refreshModules();
    alert("Internación registrada (localmente)");
  });

  // --- Evolución ---
  formEvo.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentPatient.registros.internacion.datos)
      return alert("Debe existir internación");

    const fd = new FormData(formEvo);
    currentPatient.registros.internacion.evoluciones.push({
      fecha: fd.get("fecha"),
      evo: fd.get("evo"),
      usuario: currentUser.username
    });

    formEvo.reset();
    refreshModules();
    alert("Evolución registrada (localmente)");
  });

  // --- Farmacia ---
  formFarm.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentPatient) return;

    const fd = new FormData(formFarm);
    currentPatient.registros.farmacia.push({
      fecha: fd.get("fecha"),
      medicamento: fd.get("medicamento"),
      cantidad: fd.get("cantidad"),
      obs: fd.get("obs"),
      usuario: currentUser.username
    });

    formFarm.reset();
    refreshModules();
    alert("Dispensa registrada (localmente)");
  });

  // --- Laboratorio ---
  formLab.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentPatient) return;

    const fd = new FormData(formLab);
    currentPatient.registros.laboratorio.push({
      fecha: fd.get("fecha"),
      estudio: fd.get("estudio"),
      resultado: fd.get("resultado"),
      usuario: currentUser.username
    });

    formLab.reset();
    refreshModules();
    alert("Laboratorio registrado (localmente)");
  });

  // --- Kinesiología ---
  formKine.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentPatient) return;

    const fd = new FormData(formKine);
    currentPatient.registros.kinesiologia.push({
      fecha: fd.get("fecha"),
      tecnica: fd.get("tecnica"),
      obs: fd.get("obs"),
      usuario: currentUser.username
    });

    formKine.reset();
    refreshModules();
    alert("Sesión Kine registrada (localmente)");
  });

  // --- Odontología ---
  formOdonto.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentPatient) return;

    const fd = new FormData(formOdonto);
    currentPatient.registros.odontologia.push({
      fecha: fd.get("fecha"),
      pieza: fd.get("pieza"),
      practica: fd.get("practica"),
      obs: fd.get("obs"),
      usuario: currentUser.username
    });

    formOdonto.reset();
    refreshModules();
    alert("Práctica Odontológica registrada (localmente)");
  });
  
  // --- Afiliación (CON CONEXIÓN A API) ---
  formAfiliacion.addEventListener("submit", async e => {
    e.preventDefault();

    const fd = new FormData(formAfiliacion);
    const documento = fd.get("documento").trim();
    
    // 1. Validación de DNI Duplicado (Control Preliminar en Frontend)
    const isDuplicated = patients.some(p => p.documento === documento);
    if (isDuplicated) {
      return alert(`Error: Ya existe un afiliado registrado con DNI ${documento}.`);
    }

    // 2. Preparar datos para el Backend
    const newAfiliadoData = {
      action: 'add_afiliado',
      nombre: fd.get("nombre"),
      documento: documento,
      nacimiento: fd.get("nacimiento"),
      sexo: fd.get("sexo"),
      domicilio: fd.get("domicilio"),
      telefono: fd.get("telefono"),
      os_nro: fd.get("obra_social") 
    };

    // 3. Llamada al Servidor (API) - Lógica de guardado
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newAfiliadoData)
        });

        // La respuesta puede fallar en HTTP o en la lógica de negocio (BDD)
        const result = await response.json();

        if (result.success) {
            alert(`Afiliado ${newAfiliadoData.nombre} (DNI: ${documento}) registrado con éxito.`);
            formAfiliacion.reset();
            
            // Recargar la lista de afiliados con el nuevo registro de la BDD
            await loadPatients(); 
            
            const newPatientId = result.data.id; 
            if (newPatientId) selectPatient(newPatientId);
            document.querySelector('.tab[data-module="resumen"]').click();

        } else {
            alert(`Error al registrar afiliado: ${result.message}`);
        }
    } catch (error) {
        console.error("Error de conexión/registro:", error);
        alert("No se pudo conectar con el servidor para registrar al afiliado. (Revise api.php)");
    }
  });


  // ============================================
  // ADMINISTRACIÓN DE USUARIOS (ABM)
  // ============================================

  function renderAdminUsers() {
    adminUserList.innerHTML = "";
    userList.forEach((u, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span><strong>${u.username}</strong> — Rol: ${u.role}</span>
        <span class="admin-actions">
          <button class="btn" data-edit="${index}">Editar</button>
          <button class="btn danger" data-delete="${index}">Eliminar</button>
        </span>
      `;
      adminUserList.appendChild(li);
    });
  }

  adminUserList.addEventListener("click", e => {
    const edit = e.target.dataset.edit;
    const del = e.target.dataset.delete;

    if (edit !== undefined) loadUserIntoForm(edit);
    if (del !== undefined) {
      if (confirm("¿Eliminar usuario?")) {
        userList.splice(del, 1);
        renderAdminUsers();
      }
    }
  });

  function loadUserIntoForm(i) {
    const u = userList[i];
    formAdminUser.username.value = u.username;
    formAdminUser.password.value = u.password;
    formAdminUser.role.value = u.role;
    formAdminUser.editIndex.value = i;
  }

  formAdminUser.addEventListener("submit", e => {
    e.preventDefault();
    // NOTA: Esta lógica también debe migrar a la API
    const fd = new FormData(formAdminUser);
    const username = fd.get("username");
    const password = fd.get("password");
    const role = fd.get("role");
    const index = parseInt(fd.get("editIndex"));

    const nuevo = { username, password, role };

    if (index >= 0) {
      userList[index] = nuevo;
    } else {
      userList.push(nuevo);
    }

    formAdminUser.reset();
    formAdminUser.editIndex.value = -1;
    renderAdminUsers();
    alert("Usuario guardado (localmente)");
  });

  adminCancelEdit.addEventListener("click", () => {
    formAdminUser.reset();
    formAdminUser.editIndex.value = -1;
  });

  // Inicial (Solo renderiza la lista de pacientes/afiliados. Se cargan en el login)
  renderPatientList();

})();