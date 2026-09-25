// Cloudflare Pages Function — proxy mot Apps Script.
// PWA-en på iOS blokkerer cross-origin-kall til script.google.com
// (ITP + redirect-håndtering). Ved å rute via /api/ blir alt
// same-origin og slipper gjennom.
//
// Ruta ligger bak trener-applikasjonen i Cloudflare Access, men ikke alle
// handlinger er for alle trenere:
//   · økonomi går bare via /dashboard/okonomi (styre-skjermet) — aldri her
//   · handlinger som overskriver felles data krever styre-e-post

import { readRequest, forwardToAppsScript, jsonResponse } from './_lib/proxy.js';
import { whoIs } from './_lib/access.js';

const BARE_VIA_OKONOMI = /^(dashOkonomi|dashImportOkonomi|dashVipps)/;

const STYRE_HANDLINGER = new Set([
  'dashImportRoster',   // overskriver hele registeret + graderingshistorikken
  'dashImportUtmeldinger', // erstatter grunnlaget for churn
  'dashSettingsSet',
  'dashSnapshotNow',
  'dashEventAdd',
  'dashEventDelete',
]);

export async function onRequest(context) {
  const { request, env } = context;
  const req = await readRequest(request);

  if (BARE_VIA_OKONOMI.test(req.action)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  // Skriving: slå opp hvem det er, både for styre-sjekken og for «endret av».
  let who = null;
  if (request.method === 'POST' || STYRE_HANDLINGER.has(req.action)) who = await whoIs(request, env);
  if (STYRE_HANDLINGER.has(req.action) && !(who && who.isStyre)) {
    return jsonResponse({ ok: false, error: 'forbidden: kun styret' }, 403);
  }
  return forwardToAppsScript(req, request.method, env, who && who.email);
}
