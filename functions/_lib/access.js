// Delt tilgangssjekk: hvem er innlogget (Cloudflare Access), og står
// e-posten på styre-lista? Brukes av /api og /dashboard/okonomi.
//
// Konfig i Cloudflare Pages → Settings → Environment variables:
//   STYRE_EMAILS = "kasserer@klubb.no, leder@klubb.no"
// Er den tom, er styre-handlinger stengt for alle (trygg standard).
//
// Valgfri herding — kryptografisk verifisering av Access-JWT:
//   ACCESS_TEAM_DOMAIN = "https://<team>.cloudflareaccess.com"
//   ACCESS_AUD = "<application audience tag>"  (valgfritt, ekstra sjekk)
// Settes disse, stoles kun JWT-er med gyldig signatur. Uten dem brukes
// e-post-header / udekodet claim.

export function styreList(env) {
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
// Returnerer e-post, eller '' ved feil.
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

export async function getEmail(request, env) {
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

export async function whoIs(request, env) {
  const email = await getEmail(request, env);
  const list = styreList(env);
  return { email, isStyre: !!email && list.indexOf(email.toLowerCase()) !== -1, configured: list.length > 0 };
}
