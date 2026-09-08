const crypto = require('crypto');

const COOKIE_NAME = 'pixl_admin';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function makeToken(secret) {
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(secret, String(exp))}`;
}

function verifyToken(secret, token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [exp, sig] = parts;
  if (!exp || !sig || Date.now() > Number(exp)) return false;
  const expected = sign(secret, exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getCookie(event, name) {
  const header = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function isAuthed(event) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return verifyToken(secret, getCookie(event, COOKIE_NAME));
}

function setCookieHeader(token, maxAgeSeconds) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

module.exports = { makeToken, verifyToken, isAuthed, setCookieHeader, COOKIE_NAME, TTL_MS };
