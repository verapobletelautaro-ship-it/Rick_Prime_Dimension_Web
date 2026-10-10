import { json, env, constantTimeEqual, configStore } from "./_utils.mjs";
export default async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Método no permitido" });
  const auth = event.headers?.authorization || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let expected;
  try { expected = env("DASHBOARD_SYNC_TOKEN"); } catch (e) { return json(500, { error: e.message }); }
  if (!constantTimeEqual(supplied, expected)) return json(401, { error: "No autorizado" });
  try {
    const store = configStore();
    const result = await store.list({ prefix: "guild:" });
    const configs = [];
    for (const item of result.blobs || []) {
      const config = await store.get(item.key, { type: "json" });
      if (config?.guild_id) configs.push(config);
    }
    return json(200, { configs, fetched_at: new Date().toISOString() });
  } catch { return json(500, { error: "No se pudieron leer las configuraciones" }); }
};
