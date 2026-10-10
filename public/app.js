const $ = (id) => document.getElementById(id);
const state = { user: null, guilds: [], selectedGuild: null };
const menuToggle = $("menuToggle");
menuToggle.addEventListener("click", () => $("nav").classList.toggle("open"));
document.querySelectorAll("#nav a").forEach(a => a.addEventListener("click", () => $("nav").classList.remove("open")));

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || `Solicitud fallida (${response.status})`);
  return data;
}
function message(text, error = false) {
  $("formMessage").textContent = text;
  $("formMessage").style.color = error ? "#ff8d8d" : "var(--green)";
}
function safeId(value) { return /^\d{17,20}$/.test(value) ? value : ""; }

async function loadConfig() {
  const id = $("guildSelect").value;
  if (!id) return;
  state.selectedGuild = id;
  message("Cargando configuración…");
  try {
    const data = await api(`/api/guild-config?guild_id=${encodeURIComponent(id)}`);
    const c = data.config || {};
    $("prefixInput").value = c.prefix ?? ".";
    $("welcomeChannel").value = c.welcome_channel_id ?? "";
    $("logChannel").value = c.log_channel_id ?? "";
    $("welcomeEnabled").checked = c.welcome_enabled !== false;
    $("logsEnabled").checked = c.logs_enabled !== false;
    $("antiSpamEnabled").checked = c.antispam_enabled === true;
    message("");
  } catch (e) { message(e.message, true); }
}
async function loadDashboard() {
  try {
    const data = await api("/api/me");
    state.user = data.user;
    state.guilds = data.guilds || [];
    $("authTitle").textContent = `ACCESO AUTORIZADO, ${String(data.user.username || "ADMINISTRADOR").toUpperCase()}.`;
    $("authDescription").textContent = "Selecciona un servidor en el que tengas permisos de administración o gestión del servidor.";
    $("loginButton").classList.add("hidden");
    $("logoutButton").classList.remove("hidden");
    $("dashboardArea").classList.remove("hidden");
    const select = $("guildSelect");
    select.replaceChildren();
    if (!state.guilds.length) {
      select.add(new Option("No se encontraron servidores administrables", ""));
      message("Comprueba que tienes permisos y que autorizaste el acceso solicitado.", true);
      return;
    }
    state.guilds.forEach(g => select.add(new Option(g.name, g.id)));
    await loadConfig();
  } catch {
    // Not signed in: keep the public landing page available.
  }
}
$("loginButton").addEventListener("click", () => { window.location.href = "/api/auth-start"; });
$("logoutButton").addEventListener("click", async () => {
  try { await api("/api/logout", { method: "POST", body: "{}" }); } catch {}
  window.location.reload();
});
$("guildSelect").addEventListener("change", loadConfig);
$("saveButton").addEventListener("click", async () => {
  const guildId = $("guildSelect").value;
  if (!guildId) return message("Selecciona un servidor.", true);
  const prefix = $("prefixInput").value.trim();
  if (!prefix || prefix.length > 5 || /\\s/.test(prefix)) return message("El prefijo debe tener entre 1 y 5 caracteres, sin espacios.", true);
  const welcome = $("welcomeChannel").value.trim();
  const logs = $("logChannel").value.trim();
  if (welcome && !safeId(welcome)) return message("El ID del canal de bienvenida debe tener entre 17 y 20 dígitos.", true);
  if (logs && !safeId(logs)) return message("El ID del canal de registros debe tener entre 17 y 20 dígitos.", true);
  const payload = {
    prefix,
    welcome_channel_id: welcome || null,
    log_channel_id: logs || null,
    welcome_enabled: $("welcomeEnabled").checked,
    logs_enabled: $("logsEnabled").checked,
    antispam_enabled: $("antiSpamEnabled").checked
  };
  $("saveButton").disabled = true;
  message("Guardando en la dimensión…");
  try {
    await api(`/api/guild-config?guild_id=${encodeURIComponent(guildId)}`, { method: "POST", body: JSON.stringify(payload) });
    message("Configuración guardada en la nube. El puente del bot debe estar conectado para sincronizarla.");
  } catch (e) { message(e.message, true); }
  finally { $("saveButton").disabled = false; }
});
loadDashboard();
