import { json, parseCookies, clearCookie, SESSION_COOKIE, sessionStore, sameOrigin } from "./_utils.mjs";
export default async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });
  if (!sameOrigin(event)) return json(403, { error: "Origen no permitido" });
  const id = parseCookies(event)[SESSION_COOKIE];
  if (id && /^[A-Za-z0-9_-]{40,60}$/.test(id)) await sessionStore().delete(id);
  return json(200, { ok: true }, { "Set-Cookie": clearCookie(SESSION_COOKIE) });
};
