// Cloudflare Pages Function — proxy mot Apps Script for /fotball-appen.
// Egen rute (i stedet for å gjenbruke /api) slik at fotball-brukere kun
// trenger Cloudflare Access-tilgang til /fotball/* — /api ligger bak
// trener-applikasjonens tilgangsliste.
//
// Fotball-brukerne står på en annen tilgangsliste enn trenerne. Ruta slipper
// derfor bare gjennom fotball-appens egne handlinger (Bygg motoren) — ikke
// medlemsregister, oppmøte eller økonomi.

import { readRequest, forwardToAppsScript, jsonResponse } from '../_lib/proxy.js';

const TILLATT = new Set(['bmList', 'bmCreate', 'bmDelete', 'bmSetSetting', 'bmSetWeekGoal']);

export async function onRequest(context) {
  const req = await readRequest(context.request);
  if (!TILLATT.has(req.action)) return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  return forwardToAppsScript(req, context.request.method, context.env);
}
