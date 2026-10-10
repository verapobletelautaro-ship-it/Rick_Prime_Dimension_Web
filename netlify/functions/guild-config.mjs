import { json, getAdminGuild, configStore, sameOrigin, validSnowflake } from "./_utils.mjs";

function normalize(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Configuración inválida");
  const prefix = typeof body.prefix === "string" ? body.prefix.trim() : ".";
  if (!prefix || prefix.length > 5 || /\s/.test(prefix)) throw new Error("El prefijo debe tener de 1 a 5 caracteres y no contener espacios");
  const welcome = body.welcome_channel_id ?? null;
  const logs = body.log_channel_id ?? null;
  if (welcome !== null && !validSnowflake(welcome)) throw new Error("ID de canal de bienvenida inválido");
  if (logs !== null && !validSnowflake(logs)) throw new Error("ID de canal de registros inválido");
  return {
    prefix,
    welcome_channel_id: welcome,
    log_channel_id: logs,
    welcome_enabled: body.welcome_enabled === true,
    logs_enabled: body.logs_enabled === true,
    antispam_enabled: body.antispam_enabled === true,
    updated_at: new Date().toISOString()
  };
}
export default async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) return json(405, { error: "Método no permitido" });
  if (event.httpMethod === "POST" && !sameOrigin(event)) return json(403, { error: "Origen no permitido" });
  const guildId = event.queryStringParameters?.guild_id;
  const auth = await getAdminGuild(event, guildId);
  if (auth.error) return json(auth.status, { error: auth.error });
  const store = configStore();
  const key = `guild:${guildId}`;
  if (event.httpMethod === "GET") {
    const config = await store.get(key, { type: "json" });
    return json(200, { guild: { id: auth.guild.id, name: auth.guild.name }, config: config || {
      prefix: ".", welcome_channel_id: null, log_channel_id: null,
      welcome_enabled: true, logs_enabled: true, antispam_enabled: false
    } });
  }
  try {
    const body = JSON.parse(event.body || "{}");
    const config = normalize(body);
    await store.setJSON(key, { guild_id: guildId, guild_name: auth.guild.name, ...config });
    return json(200, { ok: true, config });
  } catch (e) { return json(400, { error: e.message || "JSON inválido" }); }
};
