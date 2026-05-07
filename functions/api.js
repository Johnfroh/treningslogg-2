// Cloudflare Pages Function — proxy mot Apps Script.
// PWA-en på iOS blokkerer cross-origin-kall til script.google.com
// (ITP + redirect-håndtering). Ved å rute via /api/ blir alt
// same-origin og slipper gjennom.

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1b40xgzhTyPuDjF0uuGPqr9pyYfEyS0OmLtei1Pjqihpadnz2XtwGixgZISpXNiUY/exec';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Bygg upstream URL og forward alle query-parametere
  const upstream = new URL(APPS_SCRIPT_URL);
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
