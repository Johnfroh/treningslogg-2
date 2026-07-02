// Delt proxy-hjelper: videresender en request (query + ev. body) til Apps
// Script og returnerer svaret. Brukes av /api, /fotball/api og
// /dashboard/okonomi — «_lib» rutes ikke av Pages (understrek-prefiks).
//
// APPS_SCRIPT_URL kan overstyres i Cloudflare Pages → Settings →
// Environment variables. Da er en ny Apps Script-deploy-ID en
// konfig-endring ett sted — ikke en kodeendring i tre filer.

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1b40xgzhTyPuDjF0uuGPqr9pyYfEyS0OmLtei1Pjqihpadnz2XtwGixgZISpXNiUY/exec';

export function appsScriptUrl(env) {
  return (env && env.APPS_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL;
}

export async function proxyToAppsScript(request, env) {
  const url = new URL(request.url);
  const upstream = new URL(appsScriptUrl(env));
  url.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const init = {
    method: request.method,
    headers: {},
    redirect: 'follow', // Apps Script returnerer 302 → script.googleusercontent.com
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
    const ct = request.headers.get('Content-Type');
    if (ct) init.headers['Content-Type'] = ct;
  }

  let response;
  try {
    response = await fetch(upstream.toString(), init);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'proxy fetch feilet: ' + err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
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
