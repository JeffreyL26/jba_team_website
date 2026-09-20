/**
 * oHRganize tester login (Cloudflare Pages Function)
 *
 * POST   {email, password}  -> sets a signed, HttpOnly session cookie (12 h)
 * GET                       -> 200 if the session cookie is valid, else 401
 * DELETE                    -> clears the session cookie
 *
 * Passwords are stored as SHA-256 hashes only. The cookie is HMAC-signed with
 * the TESTER_SECRET environment variable (set via `wrangler pages secret put`).
 */

const COOKIE = 'ohrganize_tester';
const SESSION_SECONDS = 12 * 60 * 60;

/* email -> sha256(password) as lowercase hex */
const USERS = {
  'bianka.simon@hrmonic.com':
    'ed711875593db383ee520262851b15a7e4796cc38e69f44f44a004d434208206',
};

const enc = new TextEncoder();

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function b64urlEncode(text) {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(text) {
  return atob(text.replace(/-/g, '+').replace(/_/g, '/'));
}

function getSecret(env) {
  // Fallback keeps local `wrangler pages dev` working without a .dev.vars file.
  return env.TESTER_SECRET || 'dev-only-secret-change-me';
}

export async function makeToken(env, email) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${b64urlEncode(email)}.${exp}`;
  const sig = await hmacHex(getSecret(env), payload);
  return `${payload}.${sig}`;
}

export async function verifyCookie(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return null;

  const parts = match[1].split('.');
  if (parts.length !== 3) return null;
  const [emailB64, expStr, sig] = parts;

  const expectedSig = await hmacHex(getSecret(env), `${emailB64}.${expStr}`);
  if (sig !== expectedSig) return null;
  if (parseInt(expStr, 10) < Math.floor(Date.now() / 1000)) return null;

  try {
    const email = b64urlDecode(emailB64);
    return USERS[email] ? email : null;
  } catch {
    return null;
  }
}

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'invalid request' });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const storedHash = USERS[email];
  const passwordHash = await sha256Hex(password);

  if (!storedHash || storedHash !== passwordHash) {
    return json(401, { error: 'wrong email or password' });
  }

  const token = await makeToken(env, email);
  return json(200, { ok: true }, {
    'Set-Cookie':
      `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`,
  });
}

export async function onRequestGet({ request, env }) {
  const email = await verifyCookie(request, env);
  return email ? json(200, { ok: true, email }) : json(401, { error: 'not signed in' });
}

export async function onRequestDelete() {
  return json(200, { ok: true }, {
    'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  });
}
