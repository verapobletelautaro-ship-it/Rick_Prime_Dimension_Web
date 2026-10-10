import { env, randomToken, cookie, json, STATE_COOKIE } from "./_utils.mjs";

export default async () => {
  try {
    const state = randomToken(24);
    const params = new URLSearchParams({
      client_id: env("DISCORD_CLIENT_ID"),
      redirect_uri: env("DISCORD_REDIRECT_URI"),
      response_type: "code",
      scope: "identify guilds",
      state
    });
    return {
      statusCode: 302,
      headers: {
        Location: `https://discord.com/oauth2/authorize?${params}`,
        "Set-Cookie": cookie(STATE_COOKIE, state, 600),
        "Cache-Control": "no-store"
      },
      body: ""
    };
  } catch (e) { return json(500, { error: e.message }); }
}
