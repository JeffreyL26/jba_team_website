/**
 * oHRganize installer download (Cloudflare Pages Function)
 *
 * GET -> for requests with a valid tester session cookie, redirects to a
 *        short-lived presigned R2 URL (10 min). The download then streams
 *        directly from R2 storage at full speed instead of being piped
 *        through this Worker (which throttles large files heavily).
 *        Anyone without a session is sent to the tester login page.
 *
 * Needs the secrets R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (an R2 API token
 * with Object Read permission on the bucket). If they are missing, falls back
 * to streaming through the RELEASES binding (slow, but works).
 */

import { verifyCookie } from './tester-login.js';

const ACCOUNT_ID = '9ba41a3e9f1a260309e64d295e0701cc';
/* Kept from the HRMONIC era on purpose: R2 buckets cannot be renamed in place,
   and the name is never shown to users. Renaming means creating a new bucket,
   copying the object over and updating this line plus wrangler.toml. */
const BUCKET = 'hrmonic-releases';
const OBJECT_KEY = 'oHRganize-Setup-1.0.0.exe';
const FILENAME = 'oHRganize-Setup-1.0.0.exe';
const URL_TTL_SECONDS = 600;

const enc = new TextEncoder();

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function hmac(keyBytes, text) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', key, enc.encode(text));
}

/* strict RFC 3986 encoding as required by SigV4 */
function rfc3986(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/* AWS Signature V4 presigned GET URL for the R2 S3 endpoint */
async function presignedUrl(env) {
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${BUCKET}/${OBJECT_KEY}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;

  const params = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${env.R2_ACCESS_KEY_ID}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(URL_TTL_SECONDS)],
    ['X-Amz-SignedHeaders', 'host'],
    ['response-content-disposition', `attachment; filename="${FILENAME}"`],
  ];
  const query = params
    .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
    .sort()
    .join('&');

  const canonicalRequest =
    `GET\n${path}\n${query}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
  const stringToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256Hex(canonicalRequest)}`;

  let key = enc.encode(`AWS4${env.R2_SECRET_ACCESS_KEY}`);
  for (const part of [dateStamp, 'auto', 's3', 'aws4_request']) {
    key = await hmac(key, part);
  }
  const signature = hex(await hmac(key, stringToSign));

  return `https://${host}${path}?${query}&X-Amz-Signature=${signature}`;
}

export async function onRequestGet({ request, env }) {
  const email = await verifyCookie(request, env);
  if (!email) {
    return Response.redirect(new URL('/ohrganize-testers.html', request.url), 302);
  }

  /* fast path: redirect to a presigned R2 URL, download bypasses the Worker */
  if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
    return Response.redirect(await presignedUrl(env), 302);
  }

  /* fallback: stream through the binding (slow for a ~100 MB file) */
  if (!env.RELEASES) {
    return new Response('Download storage is not configured.', { status: 500 });
  }
  const object = await env.RELEASES.get(OBJECT_KEY);
  if (!object) {
    return new Response('Installer not found.', { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${FILENAME}"`);
  headers.set('Content-Length', String(object.size));
  headers.set('Cache-Control', 'no-store');
  headers.set('ETag', object.httpEtag);
  return new Response(object.body, { headers });
}
