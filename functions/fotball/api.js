// Cloudflare Pages Function — proxy mot Apps Script for /fotball-appen.
// Egen rute (i stedet for å gjenbruke /api) slik at fotball-brukere kun
// trenger Cloudflare Access-tilgang til /fotball/* — /api ligger bak
// trener-applikasjonens tilgangsliste.

import { proxyToAppsScript } from '../_lib/proxy.js';

export async function onRequest(context) {
  return proxyToAppsScript(context.request, context.env);
}
