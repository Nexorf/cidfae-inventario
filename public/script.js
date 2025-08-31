/* ===========================
   CIDFAE Inventario - Frontend
   Script unificado (MongoDB)
   =========================== */

// ---------- Config ----------
const APP_TITLE = "CIDFAE Inventario";

const API_BASE =
    (typeof document !== "undefined" &&
        document.querySelector('meta[name="api-base"]')?.content) ||
    "/api";
const TOKEN_KEY = "cidfae_token";

// ---------- Estado ----------
let currentUser = null;
let specimens = [];
let batches = [];
let currentBatch = null;
let specimenCounter = 1;

// ---------- DOM ----------
const loginScreen = document.getElementById("loginScreen");
const mainApp = document.getElementById("mainApp");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const menuItems = document.querySelectorAll(".menu-item");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("pageTitle");
const currentUserSpan = document.getElementById("currentUser");
const brandTitle = document.getElementById("brandTitle");
const brandLogo = document.getElementById("brandLogo");

// Modal Probeta
const specimenModal = document.getElementById("specimenModal");
const specimenForm = document.getElementById("specimenForm");
const closeSpecimenModalBtn = document.getElementById("closeSpecimenModal");
const cancelSpecimenBtn = document.getElementById("cancelSpecimen");

const specimenIdInput = document.getElementById("specimenId");
const spOrden = document.getElementById("spOrden");
const spFecha = document.getElementById("spFecha");
const spOrientacion = document.getElementById("spOrientacion");
const spDescripcion = document.getElementById("spDescripcion");
const spEnsayo = document.getElementById("spEnsayo");
const spTipoFibra = document.getElementById("spTipoFibra");
const spTipoResina = document.getElementById("spTipoResina");
const spFuerzaMaxima = document.getElementById("spFuerzaMaxima");
const spModuloElasticidad = document.getElementById("spModuloElasticidad");
const spCuradoTempHum = document.getElementById("spCuradoTempHum");

// Modales
const batchModal = document.getElementById("batchModal");
const batchForm = document.getElementById("batchForm");
const closeBatchModal = document.getElementById("closeBatchModal");
const cancelBatch = document.getElementById("cancelBatch");
const addBatchBtn = document.getElementById("addBatchBtn");
const addSpecimenBtn = document.getElementById("addSpecimenBtn");
const specimensFormBody = document.getElementById("specimensFormBody");

// Búsqueda
const searchBtn = document.getElementById("searchBtn");
const searchContainer = document.getElementById("searchContainer");
const searchInput = document.getElementById("searchInput");
const executeSearch = document.getElementById("executeSearch");
const clearSearch = document.getElementById("clearSearch");

// Tablas
const specimensTableBody = document.getElementById("specimensTableBody");
const batchesGrid = document.getElementById("batchesGrid");

// Confirmación
const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancel = document.getElementById("confirmCancel");
const confirmAccept = document.getElementById("confirmAccept");

// Dashboard simples (sin “ensayos recientes”)
const totalSpecimens = document.getElementById("totalSpecimens");
const totalBatches = document.getElementById("totalBatches");
const activityList = document.getElementById("activityList");

// CSV
const exportCsvBtn = document.getElementById("exportCsvBtn");

const PLACEHOLDERS = {
    orden: "Ej: 001",
    fecha: "AAAA-MM-DD",
    orientacion: "Ej: 0°, 45°, 90°",
    descripcion: "Ej: Probeta de fibra de vidrio UD 0°",
    ensayo: "Ej: Tracción ASTM D3039",
    tipoFibra: "Ej: E-glass / Carbono T700",
    fuerzaMaxima: "Ej: 25.30 (kN)",
    moduloElasticidad: "Ej: 135000 (MPa)",
    tipoResina: "Ej: Epoxi 2000",
    curadoTempHum: "Ej: 24h @ 23°C, 50%RH",
};

// ===== User Activity (mejorado) =====
const ACTIVITY_KEY = "cidfae_activity";
const ACTIVITY_PAGE_SIZE = 10;

const ACTIVITY_TYPES = {
    login:   { label: "Inicio de sesión", icon: "fa-sign-in-alt", color: "#2563eb" },
    logout:  { label: "Cierre de sesión", icon: "fa-sign-out-alt", color: "#334155" },
    batch:   { label: "Lotes",            icon: "fa-layer-group", color: "#10b981" },
    specimen:{ label: "Probetas",         icon: "fa-vial",        color: "#f59e0b" },
    update:  { label: "Actualización",    icon: "fa-pen",         color: "#7c3aed" },
    delete:  { label: "Eliminación",      icon: "fa-trash",       color: "#ef4444" },
    export:  { label: "Exportación",      icon: "fa-file-csv",    color: "#0ea5e9" },
    other:   { label: "Otro",             icon: "fa-info",        color: "#64748b" },
};

function loadActivity() {
    try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); }
    catch { return []; }
}
function saveActivity(list) {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(-500))); // guarda máx 500
}
function timeAgo(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const diff = (Date.now() - d.getTime())/1000;
    const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
    if (diff < 60) return rtf.format(-Math.round(diff), "second");
    if (diff < 3600) return rtf.format(-Math.round(diff/60), "minute");
    if (diff < 86400) return rtf.format(-Math.round(diff/3600), "hour");
    return rtf.format(-Math.round(diff/86400), "day");
}
function isToday(d){ d=new Date(d); const n=new Date(); return d.toDateString()===n.toDateString(); }
function isYesterday(d){ d=new Date(d); const y=new Date(); y.setDate(y.getDate()-1); return d.toDateString()===y.toDateString(); }

function iconBadge(type){
    const meta = ACTIVITY_TYPES[type] || ACTIVITY_TYPES.other;
    return `<div class="activity-icon" style="background:${meta.color}"><i class="fas ${meta.icon}"></i></div>`;
}

function linkHtml(link){
    if (!link) return "";
    // link: { label, action, id }
    const { label, action, id } = link;
    return `<button type="button" class="btn btn-link"
                  data-action="${action}" data-id="${id ?? ""}">
            ${label || "Abrir"}
          </button>`;
}

/**
 * Registra un evento y redibuja el feed.
 * @param {Object} e { type, title, message, user, entity, link, meta }
 * - type: "login"|"batch"|"specimen"|"update"|"delete"|"export"|"other"
 * - entity: { kind:"batch|specimen", id, name }
 * - link: { label, onClick } -> e.g. {label:"Ver lote", onClick:"viewBatch('123')"}
 */
function addActivityEx(e){
    const list = loadActivity();
    const item = {
        id: crypto?.randomUUID?.() || String(Date.now()),
        ts: new Date().toISOString(),
        type: e.type || "other",
        title: e.title || "",
        message: e.message || "",
        user: e.user || currentUser || "Usuario",
        entity: e.entity || null,
        link: e.link || null,
        meta: e.meta || null
    };
    list.push(item);
    saveActivity(list);
    renderActivityFeed();
    showToast(item.title || ACTIVITY_TYPES[item.type].label || "Actividad registrada");
}

// feed del dashboard (agrupado)
function renderActivityFeed(){
    const cont = document.getElementById("activityList");
    if (!cont) return;
    cont.innerHTML = "";
    const list = loadActivity().slice().reverse(); // recientes primero
    const latest = list.slice(0, 12);

    const groups = { hoy: [], ayer: [], anteriores: [] };
    latest.forEach(it=>{
        if (isToday(it.ts)) groups.hoy.push(it);
        else if (isYesterday(it.ts)) groups.ayer.push(it);
        else groups.anteriores.push(it);
    });

    const addGroup = (title, items) => {
        if (!items.length) return;
        const h = document.createElement("div");
        h.className = "group-title";
        h.textContent = title;
        cont.appendChild(h);
        items.forEach(it=>{
            const meta = ACTIVITY_TYPES[it.type] || ACTIVITY_TYPES.other;
            const el = document.createElement("div");
            el.className = "activity-item";
            el.innerHTML = `
        ${iconBadge(it.type)}
        <div class="activity-content">
          <h4>${it.title || meta.label}</h4>
          <div class="activity-meta">
            <span>${timeAgo(it.ts)}</span> ·
            <span>${it.user}</span> ·
            <span>${meta.label}</span>
            ${it.entity ? ` · <span>${it.entity.kind}: <strong>${it.entity.name || it.entity.id}</strong></span>` : ""}
          </div>
          <div>${it.message || ""}</div>
          <div style="margin-top:6px;">${linkHtml(it.link)}</div>
        </div>
      `;
            cont.appendChild(el);
        });
    };

    addGroup("Hoy", groups.hoy);
    addGroup("Ayer", groups.ayer);
    addGroup("Anteriores", groups.anteriores);
    if (!latest.length){
        cont.innerHTML = `<div class="activity-item"><div>Sin actividad aún.</div></div>`;
    }
}

// ===== Modal: historial con filtro y paginación =====
let activityPage = 1;
function applyActivityFilters(){
    const q = (document.getElementById("activitySearch").value || "").toLowerCase().trim();
    const type = document.getElementById("activityTypeFilter").value || "";
    const all = loadActivity().slice().reverse();
    return all.filter(a=>{
        const t = (a.type||"");
        if (type && t!==type) return false;
        if (!q) return true;
        const hay = [
            a.title, a.message, a.user,
            a.entity?.id, a.entity?.name, a.entity?.kind,
            a.meta ? JSON.stringify(a.meta) : ""
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
    });
}
function renderActivityTable(){
    const tbody = document.getElementById("activityTableBody");
    const pageInfo = document.getElementById("activityPageInfo");
    if (!tbody) return;
    const data = applyActivityFilters();
    const totalPages = Math.max(1, Math.ceil(data.length/ACTIVITY_PAGE_SIZE));
    activityPage = Math.min(activityPage, totalPages);
    const start = (activityPage-1)*ACTIVITY_PAGE_SIZE;
    const slice = data.slice(start, start+ACTIVITY_PAGE_SIZE);

    tbody.innerHTML = slice.map(a=>{
        const meta = ACTIVITY_TYPES[a.type] || ACTIVITY_TYPES.other;
        const dt = new Date(a.ts);
        const link = a.link
            ? `<button type="button" class="btn btn-link"
             data-action="${a.link.action || ""}"
             data-id="${a.link.id ?? ""}">
       ${a.link.label || "Abrir"}
     </button>`
            : "";

        return `<tr>
  <td title="${dt.toLocaleString()}">${timeAgo(a.ts)}</td>
  <td>${a.title || meta.label}</td>
  <td>${a.user}</td>
  <td><span class="badge" style="background:${meta.color}; color:#fff; padding:2px 8px; border-radius:999px;">${meta.label}</span></td>
  <td>${a.message || ""}</td>
  <td>${link}</td>
</tr>`;
    }).join("");

    if (pageInfo) pageInfo.textContent = `Página ${activityPage} de ${totalPages}`;
}
function exportActivityCsv(){
    const headers = ["Fecha/Hora","Relativo","Tipo","Usuario","Título","Mensaje","Entidad","Entidad ID"];
    const rows = applyActivityFilters().map(a=>{
        const meta = ACTIVITY_TYPES[a.type] || ACTIVITY_TYPES.other;
        const ent = a.entity ? `${a.entity.kind} ${a.entity.name||""}`.trim() : "";
        const cells = [
            new Date(a.ts).toLocaleString("es-ES"),
            timeAgo(a.ts),
            meta.label,
            a.user,
            a.title||"",
            (a.message||"").replace(/\r?\n|\r/g," "),
            ent,
            a.entity?.id || ""
        ].map(v => `"${String(v).replace(/"/g,'""')}"`);
        return cells.join(";");
    });
    const csv = "\uFEFF" + [headers.map(h=>`"${h}"`).join(";"), ...rows].join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `actividad_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Toast simple
function showToast(text){
    const el = document.createElement("div");
    el.className = "toast"; el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(()=> el.classList.add("show"));
    setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=>el.remove(), 250); }, 2000);
}


// ---------- Helpers ----------
function setBranding() {
    document.title = APP_TITLE;
    if (brandTitle) brandTitle.textContent = APP_TITLE;

    // Cargar logo CIDFAE (intenta cidfae-logo.png, luego logo.png, luego fae-logo.png)
    if (brandLogo) {
        const tryImages = ["images/cidfae-logo.png", "images/logo.png", "images/fae-logo.png"];
        let idx = 0;
        const tryNext = () => {
            if (idx >= tryImages.length) return;
            const src = tryImages[idx++];
            const img = new Image();
            img.onload = () => (brandLogo.src = src);
            img.onerror = tryNext;
            img.src = src;
            brandLogo.alt = "CIDFAE";
            brandLogo.title = "CIDFAE";
        };
        tryNext();
    }

    // Remover UI sin funcionalidad
    const recentTestsCard = document.getElementById("recentTestsCard");
    if (recentTestsCard) recentTestsCard.style.display = "none";

    // Quitar pestaña "reportes"
    document.querySelectorAll('[data-view="reports"], #reportsTab, #reportsMenuItem').forEach(el => {
        el.style.display = "none";
    });
}

function authHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? {Authorization: `Bearer ${token}`} : {};
}

async function handleUnauthorized(res) {
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        currentUser = null;
        if (mainApp) mainApp.style.display = "none";
        if (loginScreen) loginScreen.style.display = "flex";
        throw new Error("No autorizado");
    }
}

async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, {headers: {...authHeaders()}});
    if (!res.ok) {
        await handleUnauthorized(res);
        throw new Error(await res.text());
    }
    return res.json();
}

async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {"Content-Type": "application/json", ...authHeaders()},
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        await handleUnauthorized(res);
        throw new Error(await res.text());
    }
    return res.json();
}

async function apiPut(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json", ...authHeaders()},
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        await handleUnauthorized(res);
        throw new Error(await res.text());
    }
    return res.json();
}

async function apiDelete(path) {
    const res = await fetch(`${API_BASE}${path}`, {method: "DELETE", headers: {...authHeaders()}});
    if (!res.ok) {
        await handleUnauthorized(res);
        throw new Error(await res.text());
    }
    return res.json();
}

// ---------- App ----------
document.addEventListener("DOMContentLoaded", async () => {
    setBranding();
    initializeApp();

    // Autologin si hay token
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        try {
            const meRes = await apiGet("/auth/me");
            const me = meRes.user || meRes.data || meRes;
            currentUser = me.username;
            if (currentUserSpan) currentUserSpan.textContent = currentUser;
            if (loginScreen) loginScreen.style.display = "none";
            if (mainApp) mainApp.style.display = "flex";
            await refreshDataFromAPI();
            switchView("dashboard");
            updateDashboardStats();
            addActivityEx({
                type: "login",
                title: "Inicio de sesión",
                message: `Usuario ${currentUser} ha iniciado sesión`,
                user: currentUser
            });
            return;
        } catch {
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    // Sin token
    if (loginScreen) loginScreen.style.display = "flex";
    if (mainApp) mainApp.style.display = "none";
});

function initializeApp() {
    loginForm?.addEventListener("submit", handleLogin);
    logoutBtn?.addEventListener("click", handleLogout);

    menuItems.forEach((item) => {
        item.addEventListener("click", () => {
            const viewName = item.dataset.view;
            switchView(viewName);
            menuItems.forEach((mi) => mi.classList.remove("active"));
            item.classList.add("active");
        });
    });

    addBatchBtn?.addEventListener("click", () => openBatchModal());
    closeBatchModal?.addEventListener("click", closeBatchModalHandler);
    cancelBatch?.addEventListener("click", closeBatchModalHandler);
    batchForm?.addEventListener("submit", handleBatchSubmit);
    addSpecimenBtn?.addEventListener("click", addSpecimenRow);

    closeSpecimenModalBtn?.addEventListener("click", () => specimenModal?.classList.remove("active"));
    cancelSpecimenBtn?.addEventListener("click", () => specimenModal?.classList.remove("active"));
    specimenForm?.addEventListener("submit", handleSpecimenSubmit);

    searchBtn?.addEventListener("click", toggleSearch);
    executeSearch?.addEventListener("click", performSearch);
    clearSearch?.addEventListener("click", clearSearchHandler);
    searchInput?.addEventListener("keypress", (e) => e.key === "Enter" && performSearch());

    confirmCancel?.addEventListener("click", () => confirmModal?.classList.remove("active"));

    const sidebarToggle = document.querySelector(".sidebar-toggle");
    const sidebar = document.querySelector(".sidebar");
    if (sidebarToggle && sidebar) sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("active"));

    exportCsvBtn?.addEventListener("click", exportVisibleSpecimensToCsv);

    // feed inicial
    renderActivityFeed();

// modal historial
    document.getElementById("openActivityModal")?.addEventListener("click", ()=>{
        document.getElementById("activityModal")?.classList.add("active");
        activityPage = 1;
        renderActivityTable();
    });
    document.getElementById("closeActivityModal")?.addEventListener("click", ()=>{
        document.getElementById("activityModal")?.classList.remove("active");
    });
    document.getElementById("activitySearch")?.addEventListener("input", ()=>{ activityPage = 1; renderActivityTable(); });
    document.getElementById("activityTypeFilter")?.addEventListener("change", ()=>{ activityPage = 1; renderActivityTable(); });
    document.getElementById("activityPrev")?.addEventListener("click", ()=>{ activityPage = Math.max(1, activityPage-1); renderActivityTable(); });
    document.getElementById("activityNext")?.addEventListener("click", ()=>{ activityPage = activityPage+1; renderActivityTable(); });
    document.getElementById("exportActivityCsv")?.addEventListener("click", exportActivityCsv);

// limpiar local
    document.getElementById("clearActivityBtn")?.addEventListener("click", ()=>{
        if (confirm("¿Borrar historial local de actividad?")) {
            localStorage.removeItem(ACTIVITY_KEY);
            renderActivityFeed();
        }
    });

}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    if (!username || !password) return alert("Ingrese usuario y contraseña.");

    try {
        const data = await apiPost("/auth/login", {username, password});
        localStorage.setItem(TOKEN_KEY, data.token);
        currentUser = (data.user && (data.user.fullName || data.user.username)) || username;
        if (currentUserSpan) currentUserSpan.textContent = currentUser;
        if (loginScreen) loginScreen.style.display = "none";
        if (mainApp) mainApp.style.display = "flex";
        addActivity("Inicio de sesión", `Usuario ${currentUser} ha iniciado sesión`);
        await refreshDataFromAPI();
        switchView("dashboard");
        updateDashboardStats();
    } catch {
        alert("Credenciales inválidas.");
    }
}

function handleLogout() {
    if (!confirm("¿Está seguro de cerrar sesión?")) return;
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    loginForm?.reset();
    menuItems.forEach((i) => i.classList.remove("active"));
    menuItems[0]?.classList.add("active");
    if (loginScreen) loginScreen.style.display = "flex";
    if (mainApp) mainApp.style.display = "none";
}

// ---------- Carga / sincronización con API ----------
async function refreshDataFromAPI() {
    // /api/batches => { success, data, count }
    const bRes = await apiGet("/batches");
    const bArr = bRes.data || [];
    batches = bArr.map((b) => ({
        id: b._id,
        name: b.name,
        date: b.date,
        description: b.description,
        specimen_count: b.specimen_count || 0,
    }));

    // /api/specimens => { success, data, pagination }
    const sRes = await apiGet("/specimens");
    const sArr = sRes.data || [];
    specimens = sArr.map((s) => ({
        id: s._id,
        batchId: s.batch,            // ObjectId
        batch_name: s.batch_name,    // string (servidor lo provee)
        orden: s.orden,
        fecha: s.fecha,
        orientacion: s.orientacion,
        descripcion: s.descripcion,
        ensayo: s.ensayo,
        tipo_fibra: s.tipo_fibra,
        fuerza_maxima: s.fuerza_maxima,
        modulo_elasticidad: s.modulo_elasticidad,
        tipo_resina: s.tipo_resina,
        curado_temp_hum: s.curado_temp_hum,
    }));

    specimenCounter = specimens.length + 1;
}

// ---------- Vistas ----------
function switchView(viewName) {
    views.forEach((v) => v.classList.remove("active"));
    const targetView = document.getElementById(`${viewName}View`);
    if (!targetView) return;
    targetView.classList.add("active");

    const titles = {
        dashboard: "Dashboard",
        specimens: "Gestión de Probetas",
        batches: "Gestión de Lotes",
    };
    if (pageTitle) pageTitle.textContent = titles[viewName] || "Dashboard";

    if (viewName === "specimens") loadSpecimensTable();
    if (viewName === "batches") loadBatchesGrid();
    if (viewName === "dashboard") updateDashboardStats();
}

// ---------- Modal Lote ----------
function openBatchModal(batch = null, readOnly = false) {
    currentBatch = batch;
    const modalTitle = document.getElementById("batchModalTitle");
    if (modalTitle) modalTitle.textContent = batch ? (readOnly ? "Visualizar Lote de Probetas" : "Editar Lote de Probetas") : "Nuevo Lote de Probetas";

    batchForm?.reset();
    if (specimensFormBody) specimensFormBody.innerHTML = "";

    if (batch) {
        document.getElementById("batchName").value = batch.name || "";
        document.getElementById("batchDate").value = (batch.date || "").toString().slice(0, 10);
        document.getElementById("batchDescription").value = batch.description || "";
        (batch.specimens || []).forEach((sp) =>
            addSpecimenRow(
                {
                    orden: sp.orden,
                    fecha: (sp.fecha || "").toString().slice(0, 10),
                    orientacion: sp.orientacion,
                    descripcion: sp.descripcion,
                    ensayo: sp.ensayo,
                    tipoFibra: sp.tipo_fibra,
                    fuerzaMaxima: sp.fuerza_maxima,
                    moduloElasticidad: sp.modulo_elasticidad,
                    tipoResina: sp.tipo_resina,
                    curadoTempHum: sp.curado_temp_hum,
                },
                readOnly
            )
        );
    } else {
        addSpecimenRow(null, readOnly);
    }

    // Deshabilitar si es visualización
    if (batchForm) {
        Array.from(batchForm.elements).forEach((el) => {
            if (["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(el.tagName)) {
                if (readOnly) {
                    if (el.type === "submit") el.style.display = "none";
                    else if (el.id === "cancelBatch") el.textContent = "Cerrar";
                    else if (el.type !== "button") el.setAttribute("disabled", "disabled");
                } else {
                    if (el.type === "submit") el.style.display = "";
                    if (el.id === "cancelBatch") el.textContent = "Cancelar";
                    el.removeAttribute("disabled");
                }
            }
        });
    }

    batchModal?.classList.add("active");
}

function closeBatchModalHandler() {
    batchModal?.classList.remove("active");
    currentBatch = null;
    batchForm?.reset();
    if (specimensFormBody) specimensFormBody.innerHTML = "";
}

function openSpecimenModal(sp) {
    if (!sp) return;
    specimenIdInput.value = sp.id;
    spOrden.value = sp.orden ?? "";
    spFecha.value = (sp.fecha ? new Date(sp.fecha).toISOString().slice(0,10) : "");
    spOrientacion.value = sp.orientacion ?? "";
    spDescripcion.value = sp.descripcion ?? "";
    spEnsayo.value = sp.ensayo ?? "";
    spTipoFibra.value = sp.tipo_fibra ?? sp.tipoFibra ?? "";
    spTipoResina.value = sp.tipo_resina ?? sp.tipoResina ?? "";
    spFuerzaMaxima.value = sp.fuerza_maxima ?? sp.fuerzaMaxima ?? "";
    spModuloElasticidad.value = sp.modulo_elasticidad ?? sp.moduloElasticidad ?? "";
    spCuradoTempHum.value = sp.curado_temp_hum ?? sp.curadoTempHum ?? "";
    specimenModal?.classList.add("active");
}

async function handleSpecimenSubmit(e) {
    e.preventDefault();
    const id = specimenIdInput.value;
    if (!id) return;

    const body = {
        orden: Number(spOrden.value),
        fecha: spFecha.value,
        orientacion: spOrientacion.value,
        descripcion: spDescripcion.value,
        ensayo: spEnsayo.value,
        tipo_fibra: spTipoFibra.value,
        tipo_resina: spTipoResina.value,
        fuerza_maxima: spFuerzaMaxima.value ? Number(spFuerzaMaxima.value) : null,
        modulo_elasticidad: spModuloElasticidad.value ? Number(spModuloElasticidad.value) : null,
        curado_temp_hum: spCuradoTempHum.value,
    };

    await apiPut(`/specimens/${id}`, body);
    specimenModal?.classList.remove("active");
    await refreshDataFromAPI();
    loadSpecimensTable();
    updateDashboardStats();
    addActivity("Probeta actualizada", `Se actualizó la probeta #${body.orden ?? ""}`);
    alert("Probeta guardada con éxito");

    addActivityEx({
        type: "specimen",
        title: "Probeta actualizada",
        message: `Se actualizó la probeta #${body.orden ?? ""}`,
        user: currentUser,
        entity: { kind:"probeta", id },
        link: { label: "Ver probeta", action: "edit-specimen", id }
    });

}


function addSpecimenRow(specimen = null, readOnly = false) {
    if (!specimensFormBody) return;
    const row = document.createElement("tr");
    row.className = "specimen-row";

    const specimenData = specimen || {
        orden: specimenCounter++,
        fecha: new Date().toISOString().split("T")[0],
        orientacion: "",
        descripcion: "",
        ensayo: "",
        tipoFibra: "",
        fuerzaMaxima: "",
        moduloElasticidad: "",
        tipoResina: "",
        curadoTempHum: "",
    };

    row.innerHTML = `
  <td><input ${readOnly ? "disabled" : ""} type="text" name="orden" placeholder="${PLACEHOLDERS.orden}" value="${specimen ? specimenData.orden ?? "" : ""}" required></td>
  <td><input ${readOnly ? "disabled" : ""} type="date" name="fecha" placeholder="${PLACEHOLDERS.fecha}" value="${specimen ? specimenData.fecha ?? "" : ""}" required></td>
  <td><input ${readOnly ? "disabled" : ""} type="text" name="orientacion" placeholder="${PLACEHOLDERS.orientacion}" value="${specimenData.orientacion ?? ""}"></td>
  <td><textarea ${readOnly ? "disabled" : ""} name="descripcion" rows="2" placeholder="${PLACEHOLDERS.descripcion}">${specimenData.descripcion ?? ""}</textarea></td>
  <td><input ${readOnly ? "disabled" : ""} type="text" name="ensayo" placeholder="${PLACEHOLDERS.ensayo}" value="${specimenData.ensayo ?? ""}"></td>
  <td><input ${readOnly ? "disabled" : ""} type="text" name="tipoFibra" placeholder="${PLACEHOLDERS.tipoFibra}" value="${specimenData.tipoFibra ?? ""}"></td>
  <td><input ${readOnly ? "disabled" : ""} type="number" step="0.01" name="fuerzaMaxima" placeholder="${PLACEHOLDERS.fuerzaMaxima}" value="${specimenData.fuerzaMaxima ?? ""}"></td>
  <td><input ${readOnly ? "disabled" : ""} type="number" step="0.01" name="moduloElasticidad" placeholder="${PLACEHOLDERS.moduloElasticidad}" value="${specimenData.moduloElasticidad ?? ""}"></td>
  <td><input ${readOnly ? "disabled" : ""} type="text" name="tipoResina" placeholder="${PLACEHOLDERS.tipoResina}" value="${specimenData.tipoResina ?? ""}"></td>
  <td><input ${readOnly ? "disabled" : ""} type="text" name="curadoTempHum" placeholder="${PLACEHOLDERS.curadoTempHum}" value="${specimenData.curadoTempHum ?? ""}"></td>
  <td> ... </td>
`;
    specimensFormBody.appendChild(row);
}

function removeSpecimenRow(btn) {
    btn.closest("tr")?.remove();
}

async function handleBatchSubmit(e) {
    e.preventDefault();
    const formData = new FormData(batchForm);
    const batchData = {
        name: formData.get("batchName"),
        date: formData.get("batchDate"),
        description: formData.get("batchDescription"),
        specimens: [],
    };

    specimensFormBody.querySelectorAll(".specimen-row").forEach((row) => {
        const inputs = row.querySelectorAll("input, textarea");
        const sp = {};
        inputs.forEach((i) => (sp[i.name] = i.value));
        batchData.specimens.push(sp);
    });

    if (currentBatch?.id) {
        await apiPut(`/batches/${currentBatch.id}`, batchData);
        addActivity("Lote actualizado", `Lote "${batchData.name}" actualizado`);
    } else {
        await apiPost(`/batches`, batchData);
        addActivity("Nuevo lote", `Lote "${batchData.name}" creado con ${batchData.specimens.length} probetas`);
    }

    await refreshDataFromAPI();
    closeBatchModalHandler();
    updateDashboardStats();
    alert("Guardado con éxito");

    addActivityEx({
        type: "batch",
        title: currentBatch?.id ? "Lote actualizado" : "Nuevo lote",
        message: `Lote "${batchData.name}" ${currentBatch?.id ? "actualizado" : `creado con ${batchData.specimens.length} probetas`}`,
        user: currentUser,
        entity: { kind:"lote", id: currentBatch?.id || "(nuevo)", name: batchData.name },
        link: currentBatch?.id
            ? { label: "Ver lote", action: "view-batch", id: currentBatch.id }
            : null
    });
}


// ---------- Tablas ----------
function loadSpecimensTable(filtered = null) {
    if (!specimensTableBody) return;
    const empty = document.getElementById("specimensEmpty");
    specimensTableBody.innerHTML = "";

    const data = filtered ?? specimens;

    if (!data || data.length === 0) {
        if (empty) empty.style.display = "block";
        return;
    } else if (empty) {
        empty.style.display = "none";
    }

    data.forEach((s) => {
        const loteNombre = s.batch_name || batches.find((b) => String(b.id) === String(s.batchId))?.name || `(ID ${s.batchId})`;
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${s.orden ?? ""}</td>
      <td>${loteNombre}</td>
      <td>${formatDate(s.fecha)}</td>
      <td>${s.orientacion ?? ""}</td>
      <td title="${s.descripcion ?? ""}">${truncateText(s.descripcion ?? "", 30)}</td>
      <td>${s.ensayo ?? ""}</td>
      <td>${s.tipo_fibra ?? ""}</td>
      <td>${s.fuerza_maxima ?? ""}</td>
      <td>${s.modulo_elasticidad ?? ""}</td>
      <td>${s.tipo_resina ?? ""}</td>
      <td title="${s.curado_temp_hum ?? ""}">${truncateText(s.curado_temp_hum ?? "", 20)}</td>
      <td>
  <div class="action-buttons">
    <button class="action-btn edit" title="Editar"
            type="button"
            data-action="edit-specimen"
            data-id="${s.id}">
      <i class="fas fa-pen"></i>
    </button>
    <button class="action-btn delete" title="Eliminar"
            type="button"
            data-action="delete-specimen"
            data-id="${s.id}">
      <i class="fas fa-trash"></i>
    </button>
  </div>
</td>`;
        specimensTableBody.appendChild(row);
    });
}


// === EDITAR LOTE: cargar y abrir modal en modo edición ===
async function editBatch(batchId) {
    // Trae el lote con sus probetas
    const res = await apiGet(`/batches/${batchId}`);
    const d = res.data || res;

    const batch = {
        id: d._id,
        name: d.name,
        date: d.date,
        description: d.description,
        specimens: (d.specimens || []).map(sp => ({
            ...sp,
            tipo_fibra: sp.tipo_fibra,
            fuerza_maxima: sp.fuerza_maxima,
            modulo_elasticidad: sp.modulo_elasticidad,
            tipo_resina: sp.tipo_resina,
            curado_temp_hum: sp.curado_temp_hum,
        })),
    };

    // 👇 abre el mismo modal pero editable
    openBatchModal(batch, false);
}

// (opcional) deja viewBatch igual, solo explícito que abre en readOnly
async function viewBatch(batchId) {
    const res = await apiGet(`/batches/${batchId}`);
    const d = res.data || res;
    const batch = {
        id: d._id,
        name: d.name,
        date: d.date,
        description: d.description,
        specimens: (d.specimens || []).map(sp => ({
            ...sp,
            tipo_fibra: sp.tipo_fibra,
            fuerza_maxima: sp.fuerza_maxima,
            modulo_elasticidad: sp.modulo_elasticidad,
            tipo_resina: sp.tipo_resina,
            curado_temp_hum: sp.curado_temp_hum,
        })),
    };
    openBatchModal(batch, true);
}

function loadBatchesGrid() {
    if (!batchesGrid) return;
    batchesGrid.innerHTML = "";
    batches.forEach((b) => {
        const card = document.createElement("div");
        card.className = "batch-card";
        card.innerHTML = `
  <h3>${b.name}</h3>
  <p>${b.description || "Sin descripción"}</p>
  <div class="batch-stats">
    <div class="batch-stat"><div class="number">${b.specimen_count ?? 0}</div><div class="label">Probetas</div></div>
    <div class="batch-stat"><div class="number">${formatDate(b.date)}</div><div class="label">Fecha</div></div>
  </div>
  <div class="batch-actions">
  <button class="btn btn-primary" type="button"
          data-action="view-batch" data-id="${b.id}">
    <i class="fas fa-eye"></i> Visualizar
  </button>
  <button class="btn btn-warning" type="button"
          data-action="edit-batch" data-id="${b.id}">
    <i class="fas fa-pen"></i> Editar
  </button>
  <button class="btn btn-danger" type="button"
          data-action="delete-batch" data-id="${b.id}">
    <i class="fas fa-trash"></i> Eliminar
  </button>
</div>
`;
        batchesGrid.appendChild(card);
    });
}


// ---------- Acciones ----------
function editSpecimen(specimenId) {
    const sp = specimens.find((s) => String(s.id) === String(specimenId));
    if (!sp) return;
    // Abrimos el lote al que pertenece (visualización)
    const b = batches.find((x) => String(x.id) === String(sp.batchId));
    if (b) viewBatch(b.id);
}


async function deleteBatch(batchId) {
    showConfirmation("Eliminar Lote", "Esto también eliminará las probetas asociadas.", async () => {
        await apiDelete(`/batches/${batchId}`);
        await refreshDataFromAPI();
        loadBatchesGrid();
        updateDashboardStats();
        addActivity("Lote eliminado", "Se eliminó un lote");
    });
}

async function deleteSpecimen(specimenId) {
    showConfirmation("Eliminar Probeta", "¿Eliminar esta probeta?", async () => {
        await apiDelete(`/specimens/${specimenId}`);
        await refreshDataFromAPI();
        loadSpecimensTable();
        updateDashboardStats();
        addActivity("Probeta eliminada", "Se eliminó una probeta");
    });
    addActivityEx({
        type: "delete",
        title: "Lote eliminado",
        message: "Se eliminó un lote",
        user: currentUser,
        entity: { kind:"lote", id: batchId }
    });

}

// ---------- Búsqueda + CSV ----------
function toggleSearch() {
    if (!searchContainer) return;
    const visible = searchContainer.style.display !== "none";
    searchContainer.style.display = visible ? "none" : "block";
    if (!visible) searchInput?.focus();
}

function performSearch() {
    const q = (searchInput?.value || "").toLowerCase().trim();
    if (!q) return loadSpecimensTable();
    const filtered = specimens.filter((s) =>
        [
            s.orden,
            s.batch_name,
            s.orientacion,
            s.descripcion,
            s.ensayo,
            s.tipo_fibra,
            s.fuerza_maxima,
            s.modulo_elasticidad,
            s.tipo_resina,
            s.curado_temp_hum,
            formatDate(s.fecha),
        ]
            .filter(Boolean)
            .some((v) => v.toString().toLowerCase().includes(q))
    );
    loadSpecimensTable(filtered);
}

function clearSearchHandler() {
    if (searchInput) searchInput.value = "";
    loadSpecimensTable();
    if (searchContainer) searchContainer.style.display = "none";
}

function exportVisibleSpecimensToCsv() {
    const headers = [
        "Orden",
        "Lote",
        "Fecha",
        "Orientación",
        "Descripción",
        "Ensayo",
        "Tipo Fibra",
        "Fuerza Máx.",
        "Módulo Elast.",
        "Tipo Resina",
        "Curado/Temp/Hum",
    ];

    // delimitador ; ayuda a Excel en es-ES / es-EC
    const DELIM = ";";

    // 2) Sanitizador de celdas CSV
    const cell = (v) =>
        `"${(v ?? "")
            .toString()
            .replace(/"/g, '""')          // escapa comillas
            .replace(/\r?\n|\r/g, " ")    // quita saltos de línea
        }"`;

    // 3) Toma los datos desde specimens (no desde el DOM truncado)
    const rows = (specimens || []).map((s) => {
        const loteNombre =
            s.batch_name ||
            (batches.find((b) => String(b.id) === String(s.batchId))?.name) ||
            `(ID ${s.batchId})`;

        return [
            cell(s.orden ?? ""),
            cell(loteNombre),
            cell(formatDate(s.fecha)),              // dd/mm/aaaa local
            cell(s.orientacion ?? ""),
            cell(s.descripcion ?? ""),
            cell(s.ensayo ?? ""),
            cell(s.tipo_fibra ?? ""),
            cell(s.fuerza_maxima ?? ""),
            cell(s.modulo_elasticidad ?? ""),
            cell(s.tipo_resina ?? ""),
            cell(s.curado_temp_hum ?? ""),
        ].join(DELIM);
    });

    // 4) Une todo y antepone BOM UTF-8 para Excel
    const csv = "\uFEFF" + [
        headers.map(cell).join(DELIM),
        ...rows
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `probetas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addActivityEx({
        type: "export",
        title: "Exportación de probetas",
        message: "Se exportó la tabla visible a CSV",
        user: currentUser
    });
}


// ---------- Confirmación ----------
function showConfirmation(title, message, onConfirm) {
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    if (confirmAccept)
        confirmAccept.onclick = async () => {
            await onConfirm();
            confirmModal?.classList.remove("active");
        };
    confirmModal?.classList.add("active");
}

// ---------- Dashboard ----------
function updateDashboardStats() {
    if (totalSpecimens) totalSpecimens.textContent = specimens.length;
    if (totalBatches) totalBatches.textContent = batches.length;
}

function addActivity(title, description) {
    if (!activityList) return;
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `<h4>${title}</h4><p>${description} - ${new Date().toLocaleString("es-ES")}</p>`;
    activityList.insertBefore(item, activityList.firstChild);
    while (activityList.children.length > 5) activityList.removeChild(activityList.lastChild);
}

// ---------- Utils ----------
function formatDate(s) {
    const d = new Date(s);
    return isNaN(d) ? (s || "") : d.toLocaleDateString("es-ES");
}

function truncateText(t, n) {
    t = t || "";
    return t.length <= n ? t : t.substring(0, n) + "...";
}


specimensTableBody?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "edit-specimen") {
        const sp = specimens.find((x) => String(x.id) === String(id));
        if (sp) openSpecimenModal(sp);
    }
    if (action === "delete-specimen") {
        deleteSpecimen(id);
    }
})

batchesGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "view-batch") return viewBatch(id);
    if (action === "edit-batch") return editBatch(id);
    if (action === "delete-batch") return deleteBatch(id);
});

document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
        case "view-batch": return viewBatch(id);
        case "edit-batch": return editBatch(id);
        case "delete-batch": return deleteBatch(id);
        case "edit-specimen": {
            const sp = specimens.find((x) => String(x.id) === String(id));
            if (sp) openSpecimenModal(sp);
            return;
        }
        case "delete-specimen": return deleteSpecimen(id);
        default: return;
    }
});
