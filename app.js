// app.js — Simulación front-end con Nuevo Paciente + HCDU + validación inline

// Datos de ejemplo (simulados)
let patients = [
  { id:1, name:"Martín Gómez", dni:"33123456", age:39, last:"2025-10-02", summary:"Hipertensión arterial controlada", allergies:["Aspirina"], meds:["Enalapril 10mg"] },
  { id:2, name:"María Pérez", dni:"27987654", age:52, last:"2025-09-10", summary:"Diabetes tipo 2", allergies:[], meds:["Metformina 850mg"] },
  { id:3, name:"Lucía Fernández", dni:"21456789", age:28, last:"2025-08-20", summary:"Consulta ginecológica", allergies:["Penicilina"], meds:[] }
];

// Autorizaciones simuladas
const authorizations = [
  { id:101, patient:"Martín Gómez", type:"Estudio imagenológico", status:"Aprobado", date:"2025-09-28" },
  { id:102, patient:"María Pérez", type:"Medicamento crónico", status:"Pendiente", date:"2025-10-05" }
];

// HCDU records: map patientId -> record object
let hcRecords = {
  1: { patientId:1, encounters:[
    { id: 1001, type:'ambulatoria', date:'2025-10-02', summary:'Control rutina', details:{provider:'Sanatorio Mayo'} }
  ]},
  2: { patientId:2, encounters:[
    { id: 1002, type:'laboratorio', date:'2025-09-30', summary:'Hemograma', details:{test:'Hemograma', result:'Normal'} }
  ]},
  3: { patientId:3, encounters:[] }
};

// KPI state (simulado) for dashboard (kept simple)
let kpiState = { consultas:28, prestadores:35, duplicados:10, admin:50, ap:22 };

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  bindUiEvents();
  renderInitial();
  initNewPatientForm();
  window.viewPatient = viewPatient; // expose for potential inline handlers
});

// --- DOM cache
let dom = {};
function cacheDom(){
  dom = {
    recentList: document.getElementById('recent-patients'),
    patientsTbody: document.querySelector('#patients-table tbody'),
    selectPatient: document.getElementById('select-patient'),
    hcCard: document.getElementById('hc-card'),
    hcName: document.getElementById('hc-name'),
    hcDni: document.getElementById('hc-dni'),
    hcSummary: document.getElementById('hc-summary'),
    hcAllergies: document.getElementById('hc-allergies'),
    hcMeds: document.getElementById('hc-meds'),
    hcEncounters: document.getElementById('hc-encounters'),
    hcLabs: document.getElementById('hc-labs'),
    authTbody: document.querySelector('#auth-table tbody'),
    toast: document.getElementById('toast'),
    globalSearch: document.getElementById('global-search'),
    btnSearch: document.getElementById('btn-search'),
    patientFilter: document.getElementById('patient-filter'),
    filterBtn: document.getElementById('filter-btn'),
    loadHcBtn: document.getElementById('load-hc'),
    exportReportBtn: document.getElementById('export-report'),
    menuItems: document.querySelectorAll('.menu-item'),
    navLinks: document.querySelectorAll('.topnav .nav-link'),
    // new patient form controls (selected on init)
    formNewPatient: document.getElementById('form-new-patient'),
    btnClearNew: document.getElementById('btn-clear-new')
  };
}

// --- UI events
function bindUiEvents(){
  dom.menuItems.forEach(btn=>{
    btn.addEventListener('click', ()=> {
      dom.menuItems.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showSection(btn.dataset.section);
    });
  });

  dom.navLinks.forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const nav = a.dataset.nav;
      if(nav) {
        dom.menuItems.forEach(b=>{
          b.classList.toggle('active', b.dataset.section === nav);
        });
        showSection(nav);
      }
    });
  });

  dom.btnSearch.addEventListener('click', globalSearch);
  dom.globalSearch.addEventListener('keydown', (e)=>{ if(e.key==='Enter') globalSearch(); });

  dom.filterBtn.addEventListener('click', filterPatients);
  dom.patientFilter.addEventListener('keydown', (e)=>{ if(e.key==='Enter') filterPatients(); });

  dom.loadHcBtn.addEventListener('click', () => {
    const id = Number(dom.selectPatient.value);
    if(!id) return notify('Seleccione un afiliado', 2200);
    const p = patients.find(x=>x.id===id);
    fillHc(p);
  });

  dom.exportReportBtn.addEventListener('click', exportCSV);
}

// --- Initial render
function renderInitial(){
  showSection('dashboard');
  renderRecent();
  populatePatientsTable(patients);
  populateSelect();
  renderAuthorizations();
  renderKpis();
}

// --- Sections
function showSection(id){
  document.querySelectorAll('.section').forEach(s=> s.classList.add('hidden'));
  const el = document.getElementById(id);
  if(el) {
    el.classList.remove('hidden');
    setTimeout(()=> el.querySelector('h2')?.focus(), 60);
  }
}

// --- Render functions
function renderRecent(){
  dom.recentList.innerHTML = '';
  patients.slice(0,5).forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${p.name}</strong><br><small>${p.dni} — Última: ${p.last}</small>`;
    dom.recentList.appendChild(li);
  });
}

function populatePatientsTable(list){
  dom.patientsTbody.innerHTML = '';
  const rows = (list && list.length) ? list : patients;
  rows.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.name}</td><td>${p.dni}</td><td>${p.age || ''}</td><td>${p.last}</td>
      <td><button class="small-btn" data-id="${p.id}">Ver</button></td>`;
    dom.patientsTbody.appendChild(tr);
  });
  // delegate
  dom.patientsTbody.querySelectorAll('button[data-id]').forEach(btn=>{
    btn.addEventListener('click', ()=> viewPatient(Number(btn.dataset.id)));
  });
}

function populateSelect(){
  dom.selectPatient.innerHTML = '<option value="">-- Seleccionar afiliado --</option>';
  patients.forEach(p=>{
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} — ${p.dni}`;
    dom.selectPatient.appendChild(opt);
  });
}

function renderAuthorizations(){
  dom.authTbody.innerHTML = '';
  authorizations.forEach(a=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.id}</td><td>${a.patient}</td><td>${a.type}</td><td>${a.status}</td><td>${a.date}</td>`;
    dom.authTbody.appendChild(tr);
  });
}

// --- View patient & HCDU
function viewPatient(id){
  const p = patients.find(x=>x.id===id);
  if(!p) return notify('Afiliado no encontrado', 2200);
  dom.menuItems.forEach(b=> b.classList.toggle('active', b.dataset.section === 'historial'));
  showSection('historial');
  fillHc(p);
}

function fillHc(p){
  if(!p) return;
  dom.hcCard.style.display = 'block';
  dom.hcName.textContent = p.name;
  dom.hcDni.textContent = `DNI: ${p.dni}`;
  dom.hcSummary.textContent = p.summary || '—';
  dom.hcAllergies.innerHTML = (p.allergies && p.allergies.length) ? p.allergies.map(a=>`<li>${a}</li>`).join('') : '<li>—</li>';
  dom.hcMeds.innerHTML = (p.meds && p.meds.length) ? p.meds.map(m=>`<li>${m}</li>`).join('') : '<li>—</li>';

  // encounters from hcRecords
  dom.hcEncounters.innerHTML = '';
  const rec = hcRecords[p.id];
  if(rec && rec.encounters && rec.encounters.length){
    rec.encounters.slice().reverse().forEach(enc => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${enc.date}</strong> — <em>${enc.type}</em> — ${enc.summary || ''}<br><small>${JSON.stringify(enc.details)}</small>`;
      dom.hcEncounters.appendChild(li);
    });
  } else {
    dom.hcEncounters.innerHTML = '<li>No hay encuentros registrados.</li>';
  }
}

// --- New Patient form: init, validation, submit, create HCDU
function initNewPatientForm(){
  const form = dom.formNewPatient;
  if(!form) return;

  // radio change handling
  form.querySelectorAll('input[name="encuentro"]').forEach(r => r.addEventListener('change', onEncuentroChange));
  // submit / clear
  form.addEventListener('submit', handleNewPatientSubmit);
  dom.btnClearNew?.addEventListener('click', () => {
    form.reset();
    clearFieldErrors(form);
    document.querySelectorAll('.form-conditional').forEach(el=> el.classList.add('hidden'));
    document.getElementById('enc-ambulatoria').classList.remove('hidden');
  });

  // initial state
  document.getElementById('enc-ambulatoria').classList.remove('hidden');
}

function onEncuentroChange(e){
  const val = e.target.value;
  const mapping = {
    ambulatoria: 'enc-ambulatoria',
    internacion: 'enc-internacion',
    laboratorio: 'enc-laboratorio',
    imagenes: 'enc-imagenes',
    kinesiologia: 'enc-kinesiologia',
    otros: '' // none
  };
  document.querySelectorAll('.form-conditional').forEach(el=> el.classList.add('hidden'));
  const id = mapping[val];
  if(id) {
    const el = document.getElementById(id);
    if(el) el.classList.remove('hidden');
  }
}

// validate fields and show inline messages
function validateNewPatientForm(form){
  clearFieldErrors(form);
  const errors = [];
  const name = form.nombre.value.trim();
  const dni = form.dni.value.trim();
  // Nombre required
  if(!name){
    setFieldError('np-nombre','El nombre es obligatorio');
    errors.push('nombre');
  }
  // DNI required / numeric length
  if(!dni){
    setFieldError('np-dni','El DNI es obligatorio');
    errors.push('dni');
  } else {
    const cleaned = dni.replace(/\D/g,'');
    if(cleaned.length < 6){
      setFieldError('np-dni','DNI inválido (mínimo 6 dígitos)');
      errors.push('dni');
    }
  }
  // Fecha de nacimiento: si existe, no puede ser futura
  const dob = form.dob.value;
  if(dob){
    const d = new Date(dob);
    const now = new Date();
    if(d > now){
      setFieldError('np-dob','Fecha de nacimiento no puede ser futura');
      errors.push('dob');
    }
  }
  return errors;
}

function setFieldError(fieldId, message){
  const el = document.getElementById(fieldId);
  if(!el) return;
  const errorNode = document.querySelector(`.field-error[data-for="${fieldId}"]`);
  if(errorNode) errorNode.textContent = message;
  el.classList.add('field-invalid');
}

function clearFieldErrors(form){
  form.querySelectorAll('.field-error').forEach(n => n.textContent = '');
  form.querySelectorAll('.field-invalid').forEach(i => i.classList.remove('field-invalid'));
}

// submit handler: create patient and initial HCDU encounter
function handleNewPatientSubmit(ev){
  ev.preventDefault();
  const form = ev.target;
  const errs = validateNewPatientForm(form);
  if(errs.length){
    // focus first invalid
    const first = form.querySelector('.field-invalid');
    if(first) first.focus();
    notify('Corregir los campos marcados', 2200);
    return;
  }

  // Build patient object
  const newId = (patients.length ? Math.max(...patients.map(p=>p.id)) : 0) + 1;
  const nombre = form.nombre.value.trim();
  const dni = form.dni.value.replace(/\D/g,'').trim();
  const age = calculateAge(form.dob.value);
  const allergies = form.alergias.value.trim() ? [form.alergias.value.trim()] : [];
  const meds = form.meds.value.trim() ? [form.meds.value.trim()] : [];
  const summary = form.motivo?.value?.trim() || '';

  const paciente = {
    id: newId,
    name: nombre,
    dni: dni,
    age: age,
    last: new Date().toISOString().slice(0,10),
    summary: summary,
    allergies: allergies,
    meds: meds
  };

  // add to patients list
  patients.unshift(paciente);

  // Create initial HCDU record and encounter (depending on type)
  const encuentroType = form.querySelector('input[name="encuentro"]:checked')?.value || 'ambulatoria';
  const encounter = { id: Date.now(), type: encuentroType, date: new Date().toISOString().slice(0,10), summary: summary, details: {} };

  // populate encounter details based on type
  switch(encuentroType){
    case 'ambulatoria':
      encounter.details = { motivo: form.motivo?.value || '', medico: form.medico?.value || '' };
      break;
    case 'internacion':
      encounter.details = { ingreso: form.ingreso?.value || '', efector: form.efector?.value || '', diagnostico: form.diagnostico?.value || '' };
      break;
    case 'laboratorio':
      encounter.details = { tipo: form.labtipo?.value || '', indicacion: form.labindicacion?.value || '' };
      break;
    case 'imagenes':
      encounter.details = { tipo: form.imgtipo?.value || '', indicacion: form.imgindic?.value || '' };
      break;
    case 'kinesiologia':
      encounter.details = { motivo: form.kinemotivo?.value || '', sesiones: form.kinesesiones?.value || '' };
      break;
    default:
      encounter.details = {};
  }

  hcRecords[newId] = { patientId: newId, encounters: [encounter] };

  // UI updates
  populatePatientsTable(patients);
  populateSelect();
  renderRecent();
  notify('Paciente creado y registrado en la HCDU', 2200);

  // reset form
  form.reset();
  clearFieldErrors(form);
  document.querySelectorAll('.form-conditional').forEach(el=> el.classList.add('hidden'));
  document.getElementById('enc-ambulatoria').classList.remove('hidden');

  // optionally show the new patient's HCDU
  setTimeout(()=> viewPatient(newId), 700);
}

// utility: calculate age from dob (YYYY-MM-DD)
function calculateAge(dob){
  if(!dob) return '';
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if(m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// --- KPIs simple rendering (kept for completeness)
function renderKpis(){
  const setKpi = (elId, textId, value, target) => {
    const el = document.getElementById(elId);
    const text = document.getElementById(textId);
    if(!el || !text) return;
    const pctOfTarget = Math.min(100, Math.round((value/target)*100));
    el.style.width = pctOfTarget + '%';
    text.textContent = value + '%';
  };
  setKpi('kpi-consultas', 'kpi-consultas-text', kpiState.consultas, 60);
  setKpi('kpi-prestadores', 'kpi-prestadores-text', kpiState.prestadores, 70);
  setKpi('kpi-duplicados', 'kpi-duplicados-text', kpiState.duplicados, 25);
}

// --- Search / filter / CSV (existing)
function filterPatients(){
  const q = dom.patientFilter.value.trim().toLowerCase();
  if(!q) {
    populatePatientsTable(patients);
    return;
  }
  const results = patients.filter(p => p.name.toLowerCase().includes(q) || p.dni.toLowerCase().includes(q));
  if(results.length === 0){
    dom.patientsTbody.innerHTML = '<tr><td colspan="5">No se encontraron afiliados</td></tr>';
    return;
  }
  populatePatientsTable(results);
}

function globalSearch(){
  const q = dom.globalSearch.value.trim().toLowerCase();
  if(!q) return notify('Ingrese término de búsqueda',1800);
  const found = patients.find(p => p.name.toLowerCase().includes(q) || p.dni.toLowerCase().includes(q));
  if(found){
    viewPatient(found.id);
    notify(`Afiliado encontrado: ${found.name}`,2000);
  } else notify('No se encontraron afiliados',2000);
}

function exportCSV(){
  const rows = [
    ['id','Afiliado','Tipo','Estado','Fecha'],
    ...authorizations.map(a=>[a.id,a.patient,a.type,a.status,a.date])
  ];
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'autorizaciones.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  notify('CSV exportado',2000);
}

// --- Notifications
function notify(msg, time=1800){
  dom.toast.textContent = msg;
  dom.toast.classList.remove('hidden');
  setTimeout(()=> dom.toast.classList.add('hidden'), time);
}
