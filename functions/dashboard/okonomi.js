// Cloudflare Pages Function — skjermet proxy for økonomi på /dashboard/okonomi.
//
// Økonomidata (faktiske utbetalinger) skal kun være tilgjengelig for styret.
// Denne ruta leser innlogget e-post fra Cloudflare Access og sjekker mot
// styre-lista i miljøvariabelen STYRE_EMAILS (se functions/_lib/access.js).
// Bare styre slipper gjennom til Apps Script — andre får 403, så dataene
// sendes aldri til ikke-styre. /api avviser de samme handlingene, så dette
// er eneste vei inn.
//
// Egen rute (ikke felles /api) gjør at økonomi senere enkelt kan løftes til
// en helt egen Cloudflare Access-applikasjon med egen tilgangsliste, slik
// /fotball er skilt ut i dag.

import { readRequest, forwardToAppsScript, jsonResponse } from '../_lib/proxy.js';
import { whoIs } from '../_lib/access.js';

// Ruta er for økonomi og ingenting annet — styret bruker /api til resten.
const TILLATT = /^(dashOkonomi|dashImportOkonomi|dashVipps)/;

export async function onRequest(context) {
  const { request, env } = context;
  const req = await readRequest(request);
  const who = await whoIs(request, env);

  // Identitet/tilgang — ingen økonomidata, alltid ok (frontend bruker dette
  // til å vise/skjule Økonomi-fanen og styre-knappene).
  if (req.action === 'whoami') {
    return jsonResponse({ ok: true, email: who.email, isStyre: who.isStyre, configured: who.configured });
  }

  if (!who.isStyre) return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  if (!TILLATT.test(req.action)) return jsonResponse({ ok: false, error: 'ukjent økonomi-handling' }, 400);

  return forwardToAppsScript(req, request.method, env);
}
