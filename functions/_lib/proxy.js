// Delt proxy-hjelper: videresender en request (query + ev. body) til Apps
// Script og returnerer svaret. Brukes av /api, /fotball/api og
// /dashboard/okonomi — «_lib» rutes ikke av Pages (understrek-prefiks).
//
// Konfig i Cloudflare Pages → Settings → Environment variables:
//   APPS_SCRIPT_TOKEN  (påkrevd, type «Secret») — samme verdi som
//     SHARED_TOKEN i Script Properties i Apps Script. Nøkkelen finnes KUN
//     der og her: proxyen legger den på, så den står aldri i repoet eller
//     i nettleseren. Mangler den, svarer proxyen 500 i stedet for å prøve.
//   APPS_SCRIPT_URL    (valgfri) — overstyrer deploy-adressen under. Adressen
//     er ikke hemmelig; uten nøkkelen svarer Apps Script bare «unauthorized».

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1b40xgzhTyPuDjF0uuGPqr9pyYfEyS0OmLtei1Pjqihpadnz2XtwGixgZISpXNiUY/exec';

export function appsScriptUrl(env) {
  return (env && env.APPS_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL;
}

export function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Les requesten én gang: body kan bare leses én gang, og rutene må vite
// hvilken handling det gjelder før de bestemmer om den slipper gjennom.
// Samme prioritet som handle() i Code.gs: query først, så body.
export async function readRequest(request) {
  const url = new URL(request.url);
  let bodyText = null;
  let body = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    bodyText = await request.text();
    try { body = JSON.parse(bodyText) || {}; } catch (e) { body = {}; }
  }
  const action = String(url.searchParams.get('action') || body.action || '');
  return { url, bodyText, action, contentType: request.headers.get('Content-Type') };
}

// bruker: innlogget e-post fra Cloudflare Access (whoIs), eller ''. Sendes
// som _bruker og er det Apps Script lagrer som «endret av» — en verdi
// klienten selv sender under samme navn blir alltid fjernet først.
export async function forwardToAppsScript(req, method, env, bruker) {
  const token = env && env.APPS_SCRIPT_TOKEN;
  if (!token) {
    return jsonResponse({ ok: false, error: 'APPS_SCRIPT_TOKEN mangler i Cloudflare-miljøet' }, 500);
  }
  const upstream = new URL(appsScriptUrl(env));
  req.url.searchParams.forEach((v, k) => { if (k !== 'token' && k !== '_bruker') upstream.searchParams.set(k, v); });
  if (bruker) upstream.searchParams.set('_bruker', String(bruker).toLowerCase());
  // Code.gs leser query-token før body-token, så denne vinner uansett hva
  // klienten har lagt i body.
  upstream.searchParams.set('token', token);

  const init = {
    method,
    headers: {},
    redirect: 'follow', // Apps Script returnerer 302 → script.googleusercontent.com
  };
  if (req.bodyText != null) {
    init.body = req.bodyText;
    if (req.contentType) init.headers['Content-Type'] = req.contentType;
  }

  let response;
  try {
    response = await fetch(upstream.toString(), init);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'proxy fetch feilet: ' + err.message }, 502);
  }

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
