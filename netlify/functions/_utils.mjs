import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const SESSION_COOKIE = "rp_session";
export const STATE_COOKIE = "rp_oauth_state";
export const sessionStore = () => getStore("rick-prime-sessions");
export const configStore = () => getStore("rick-prime-guild-configs");

export function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
    body: JSON.stringify(body)
  };
}
export function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
export function parseCookies(event) {
  const raw = event.headers?.cookie || event.headers?.Cookie || "";
  return Object.fromEntries(raw.split(";").map(s => s.trim()).filter(Boolean).map(s => {
    const i = s.indexOf("="); return [s.slice(0, i), s.slice(i + 1)];
  }));
}
export function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
export function constantTimeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
export function validSnowflake(value) {
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}
export function sameOrigin(event) {
  const origin = event.headers?.origin;
  if (!origin) return false;
  try {
    const requestHost = event.headers?.["x-forwarded-host"] || event.headers?.host;
    return new URL(origin).host === requestHost;
  } catch { return false; }
}
export async function getSession(event) {
  const id = parseCookies(event)[SESSION_COOKIE];
  if (!id || !/^[A-Za-z0-9_-]{40,60}$/.test(id)) return null;
  const session = await sessionStore().get(id, { type: "json" });
  if (!session || session.expires_at < Date.now()) {
    if (session) await sessionStore().delete(id);
    return null;
  }
  return { id, ...session };
}
export async function getAdminGuild(event, guildId) {
  if (!validSnowflake(guildId)) return { error: "ID de servidor inválido", status: 400 };
  const session = await getSession(event);
  if (!session) return { error: "Inicia sesión con Discord primero", status: 401 };
  const r = await fetch("https://discord.com/api/v10/users/@me/guilds?with_counts=false", {
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  if (!r.ok) return { error: "No se pudo verificar tu acceso con Discord. Vuelve a iniciar sesión.", status: 401 };
  const guilds = await r.json();
  const guild = guilds.find(g => g.id === guildId);
  const perms = BigInt(guild?.permissions || "0");
  const admin = (perms & 0x8n) === 0x8n;
  const manageGuild = (perms & 0x20n) === 0x20n;
  if (!guild || (!admin && !manageGuild)) return { error: "No tienes permisos para administrar este servidor", status: 403 };
  return { session, guild };
}
