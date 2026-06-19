// Cloudflare Pages Function — skjermet proxy for økonomi på /dashboard/okonomi.
//
// Økonomidata (faktiske utbetalinger) skal kun være tilgjengelig for styret.
// Denne ruta leser innlogget e-post fra Cloudflare Access-headeren og
// sjekker mot styre-lista i miljøvariabelen STYRE_EMAILS (komma/mellomrom-
// separert). Bare styre slipper gjennom til Apps Script — andre får 403,
// så dataene sendes aldri til ikke-styre.
//
// Egen rute (ikke felles /api) gjør at økonomi senere enkelt kan løftes til
// en helt egen Cloudflare Access-applikasjon med egen tilgangsliste, slik
// /fotball er skilt ut i dag.
//
// Konfig i Cloudflare Pages → Settings → Environment variables:
//   STYRE_EMAILS = "kasserer@klubb.no, leder@klubb.no"
// Er den tom, er økonomi skjult for alle (trygg standard).
//
// Valgfri herding — kryptografisk verifisering av Access-JWT:
//   ACCESS_TEAM_DOMAIN = "https://<team>.cloudflareaccess.com"
//   ACCESS_AUD = "<application audience tag>"  (valgfritt, ekstra sjekk)
// Settes disse, stoles kun JWT-er med gyldig signatur. Uten dem brukes
// e-post-header / udekodet claim (som i dag).

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1b40xgzhTyPuDjF0uuGPqr9pyYfEyS0OmLtei1Pjqihpadnz2XtwGixgZISpXNiUY/exec';

function styreList(env) {
  return String((env && env.STYRE_EMAILS) || '')
    .split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

// Hent innlogget e-post. Cloudflare Pages videresender ikke alltid
// convenience-headeren Cf-Access-Authenticated-User-Email til Functions,
// så vi leser primært e-posten fra Access-JWT-en (Cf-Access-Jwt-Assertion
// eller CF_Authorization-cookien). JWT-en settes kun av Cloudflare Access.
function decodeJwtEmail(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return '';
    let p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    p += '==='.slice((p.length + 3) % 4);
    const obj = JSON.parse(atob(p));
    return String(obj.email || obj.identity || obj.sub || '');
  } catch (e) { return ''; }
}
function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}

function b64urlToBytes(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  s += '==='.slice((s.length + 3) % 4);
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Kryptografisk verifisering av Access-JWT (opt-in). Henter Cloudflare Access
// sine offentlige nøkler og sjekker RS256-signatur + exp (+ aud hvis satt).
// Slås på ved å sette ACCESS_TEAM_DOMAIN (f.eks. https://<team>.cloudflareaccess.com)
// — da stoles kun verifiserte tokens. Returnerer e-post, eller '' ved feil.
async function verifyJwtEmail(token, env) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return '';
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((parts[0].length + 3) % 4)));
    const certsUrl = String(env.ACCESS_TEAM_DOMAIN).replace(/\/+$/, '') + '/cdn-cgi/access/certs';
    const certs = await (await fetch(certsUrl, { cf: { cacheTtl: 3600 } })).json();
    const jwk = (certs.keys || []).find(k => k.kid === header.kid);
    if (!jwk) return '';
    const key = await crypto.subtle.importKey('jwk', jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), data);
    if (!ok) return '';
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((parts[1].length + 3) % 4)));
    if (payload.exp && Date.now() / 1000 > payload.exp) return '';
    if (env.ACCESS_AUD && !((payload.aud || []).indexOf(env.ACCESS_AUD) !== -1)) return '';
    return String(payload.email || '');
  } catch (e) { return ''; }
}

async function getEmail(request, env) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion') || readCookie(request, 'CF_Authorization');
  // Verifisering påslått: stol KUN på verifisert JWT.
  if (env && env.ACCESS_TEAM_DOMAIN) {
    return jwt ? await verifyJwtEmail(jwt, env) : '';
  }
  // Ellers: header (edge-injisert av Access) eller udekodet JWT-claim.
  const header = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (header) return header;
  return jwt ? decodeJwtEmail(jwt) : '';
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const email = await getEmail(request, env);
  const list = styreList(env);
  const isStyre = !!email && list.indexOf(email.toLowerCase()) !== -1;

  // Identitet/tilgang — ingen økonomidata, alltid ok (frontend bruker dette
  // til å vise/skjule Økonomi-fanen).
  if (url.searchParams.get('action') === 'whoami') {
    return json({ ok: true, email: email, isStyre: isStyre, configured: list.length > 0 });
  }

  // Alt annet (lese/skrive økonomi) krever styre-tilgang.
  if (!isStyre) return json({ ok: false, error: 'forbidden' }, 403);

  // Proxy videre til Apps Script (samme mønster som functions/api.js).
  const upstream = new URL(APPS_SCRIPT_URL);
  url.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const init = { method: request.method, headers: {}, redirect: 'follow' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
    const ct = request.headers.get('Content-Type');
    if (ct) init.headers['Content-Type'] = ct;
  }

  let response;
  try {
    response = await fetch(upstream.toString(), init);
  } catch (err) {
    return json({ ok: false, error: 'proxy fetch feilet: ' + err.message }, 502);
  }

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
