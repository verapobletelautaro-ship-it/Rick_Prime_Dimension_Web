import { env, randomToken, cookie, clearCookie, json, parseCookies, STATE_COOKIE, SESSION_COOKIE, sessionStore, constantTimeEqual } from "./_utils.mjs";

export default async (event) => {
  const params = new URLSearchParams(event.rawQuery || "");
  const code = params.get("code");
  const state = params.get("state");
  const savedState = parseCookies(event)[STATE_COOKIE];
  if (!code || !state || !savedState || !constantTimeEqual(state, savedState)) {
    return { statusCode: 302, headers: { Location: "/?auth=failed", "Set-Cookie": clearCookie(STATE_COOKIE), "Cache-Control": "no-store" }, body: "" };
  }
  try {
    const form = new URLSearchParams({
      client_id: env("DISCORD_CLIENT_ID"),
      client_secret: env("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: env("DISCORD_REDIRECT_URI")
    });
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) throw new Error("Discord no pudo validar la autorización.");
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    const user = await userRes.json();
    if (!userRes.ok || !user.id) throw new Error("No se pudo verificar la cuenta de Discord.");
    const id = randomToken(32);
    await sessionStore().setJSON(id, {
      user: { id: user.id, username: user.username, global_name: user.global_name || null, avatar: user.avatar || null },
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      expires_at: Date.now() + 8 * 60 * 60 * 1000
    });
    return {
      statusCode: 302,
      headers: {
        Location: "/#panel",
        "Set-Cookie": [cookie(SESSION_COOKIE, id, 8 * 60 * 60), clearCookie(STATE_COOKIE)],
        "Cache-Control": "no-store"
      },
      body: ""
    };
  } catch (e) {
    return { statusCode: 302, headers: { Location: `/?auth=error#panel`, "Set-Cookie": clearCookie(STATE_COOKIE), "Cache-Control": "no-store" }, body: "" };
  }
};
