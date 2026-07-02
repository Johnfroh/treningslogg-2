// Cloudflare Pages Function — proxy mot Apps Script.
// PWA-en på iOS blokkerer cross-origin-kall til script.google.com
// (ITP + redirect-håndtering). Ved å rute via /api/ blir alt
// same-origin og slipper gjennom.

import { proxyToAppsScript } from './_lib/proxy.js';

export async function onRequest(context) {
  return proxyToAppsScript(context.request, context.env);
}
