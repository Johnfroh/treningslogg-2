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
function getEmail(request) {
  const header = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (header) return header;
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion') || readCookie(request, 'CF_Authorization');
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

  const email = getEmail(request);
  const list = styreList(env);
  const isStyre = !!email && list.indexOf(email.toLowerCase()) !== -1;

  // Identitet/tilgang — ingen økonomidata, alltid ok (frontend bruker dette
  // til å vise/skjule Økonomi-fanen). Inkluderer diagnostikk som viser hvilke
  // Access-spor som faktisk når funksjonen (kun header-navn, ingen verdier).
  if (url.searchParams.get('action') === 'whoami') {
    const cookie = request.headers.get('Cookie') || '';
    const cfHeaders = [];
    request.headers.forEach((v, k) => { if (k.toLowerCase().indexOf('cf-') === 0) cfHeaders.push(k); });
    return json({
      ok: true, email: email, isStyre: isStyre, configured: list.length > 0,
      debug: {
        emailHeader: !!request.headers.get('Cf-Access-Authenticated-User-Email'),
        jwtHeader: !!request.headers.get('Cf-Access-Jwt-Assertion'),
        cfAuthCookie: cookie.indexOf('CF_Authorization=') !== -1,
        cfHeaders: cfHeaders,
      },
    });
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
