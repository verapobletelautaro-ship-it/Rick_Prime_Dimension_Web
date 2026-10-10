import { json, getSession, sessionStore } from "./_utils.mjs";
export default async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Método no permitido" });
  try {
    const session = await getSession(event);
    if (!session) return json(401, { error: "No has iniciado sesión" });
    const r = await fetch("https://discord.com/api/v10/users/@me/guilds?with_counts=false", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (!r.ok) {
      await sessionStore().delete(session.id);
      return json(401, { error: "La sesión de Discord venció. Inicia sesión otra vez." });
    }
    const guilds = await r.json();
    const adminGuilds = guilds.filter(g => {
      try {
        const p = BigInt(g.permissions || "0");
        return (p & 0x8n) === 0x8n || (p & 0x20n) === 0x20n;
      } catch { return false; }
    }).map(g => ({ id: g.id, name: g.name, icon: g.icon || null }));
    return json(200, { user: session.user, guilds: adminGuilds });
  } catch { return json(500, { error: "Error interno al cargar la sesión" }); }
};
