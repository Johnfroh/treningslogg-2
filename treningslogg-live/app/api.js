// app/api.js
// Inkapsulerer all kommunikasjon med Apps Script-backenden.
// Brukes av mobile.jsx i stedet for localStorage.
//
// Konfigurasjon:
//   1. Sett ENDPOINT til din Apps Script Web App URL.
//   2. Sett TOKEN til samme verdi som SHARED_TOKEN i Code.gs.

window.TL_API = (function () {
  // ─── Konfigurasjon ──────────────────────────────────────────────
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycby1b40xgzhTyPuDjF0uuGPqr9pyYfEyS0OmLtei1Pjqihpadnz2XtwGixgZISpXNiUY/exec';
  const TOKEN    = 'bjj-Hk8nQ2wT-2026';

  // Lokal lese-cache (raskere åpning, ikke source of truth).
  const CACHE_KEY = 'treningslogg-cache-v1';
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.sessions)) return null;
      return data;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  // ─── Lavnivå-fetch ──────────────────────────────────────────────
  async function get(action, extraParams) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('action', action);
    url.searchParams.set('token', TOKEN);
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error('GET ' + action + ' failed: ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'unknown error');
    return json.data;
  }

  async function post(body) {
    // Apps Script-trick: bruk text/plain for å unngå CORS preflight.
    // Apps Script-side parser body med JSON.parse manuelt.
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, token: TOKEN }),
    });
    if (!res.ok) throw new Error('POST ' + body.action + ' failed: ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'unknown error');
    return json.data;
  }

  // ─── Public API ─────────────────────────────────────────────────

  /** Hent all initial state. Bruker cache hvis nett er treigt. */
  async function bootstrap({ preferCache = true } = {}) {
    const cached = preferCache ? readCache() : null;
    const fresh = (async () => {
      const data = await get('list');
      writeCache(data);
      return data;
    })();
    if (cached) {
      // Returner cache umiddelbart, men la fresh oppdatere bakgrunnen
      fresh.catch(err => console.warn('[api] bootstrap refresh feilet:', err.message));
      return { initial: cached, refresh: fresh };
    }
    const data = await fresh;
    return { initial: data, refresh: Promise.resolve(data) };
  }

  /** Re-hent state. Brukes ved fokus-bytte og periodisk. */
  async function refresh() {
    const data = await get('list');
    writeCache(data);
    return data;
  }

  // Sessions
  async function createSession(payload) { return post({ action: 'createSession', payload }); }
  async function updateSession(id, payload) { return post({ action: 'updateSession', id, payload }); }
  async function deleteSession(id) { return post({ action: 'deleteSession', id }); }

  // Planned
  async function createPlanned(payload) { return post({ action: 'createPlanned', payload }); }
  async function updatePlanned(id, payload) { return post({ action: 'updatePlanned', id, payload }); }
  async function deletePlanned(id) { return post({ action: 'deletePlanned', id }); }

  // Helse-sjekk
  async function ping() { return get('ping'); }

  // Lokal cache-styring (debug/reset)
  function clearLocalCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  return {
    bootstrap,
    refresh,
    createSession,
    updateSession,
    deleteSession,
    createPlanned,
    updatePlanned,
    deletePlanned,
    ping,
    clearLocalCache,
    _config: { ENDPOINT, TOKEN }, // for debugging
  };
})();
