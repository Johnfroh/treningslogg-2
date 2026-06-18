// dashboard/api.js
// Datalag for klubbdashboardet. ÉN kilde til sannhet for hvor data hentes.
//
// Fase 1 (nå): leser anonymiserte demo-data fra data/*.json slik at hele
//   UI-en kan kjøres og vurderes uten backend.
// Fase 2/3: bytt funksjonskroppene under til kall mot /api (Google Sheets via
//   Apps Script — samme proxy som trener-appen, bak samme Cloudflare Access).
//   Resten av appen er uendret så lenge signaturene holdes like.
//
// Personvern: maskMember() håndheves her, slik at mindreårige aldri når
// frontend med annet enn fornavn — uansett hvilken kilde dataene kommer fra.

window.DASH_API = (function () {
  async function getJSON(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(path + ' feilet: ' + res.status);
    return res.json();
  }

  // ─── Personvern: maskering av mindreårige ──────────────────────────
  // Barn vises kun med fornavn, uten bakgrunnsdata (kontakt, adresse,
  // fødselsdato, foresatte). Belte/gradering og oppmøte beholdes.
  function isMinor(m) {
    return m.minor === true
      || m.kategori === 'Junior' || m.kategori === 'Knøtte'
      || (m.alder != null && m.alder < 16);
  }
  function maskMember(m) {
    if (!isMinor(m)) return { ...m, minor: false };
    const fornavn = m.fornavn || String(m.navn || '').split(/\s+/)[0] || 'Medlem';
    return {
      ...m,
      minor: true,
      fornavn,
      etternavn: '',
      navn: fornavn,
      epost: '',
      mobil: '',
      adresse: '',
      postnr: '',
      poststed: '',
      fodselsdato: null,
      foresatte: [],
    };
  }
  function maskMembers(list) { return (list || []).map(maskMember); }

  return {
    // Aggregerte KPI-er (oppmøte, kohort, økonomi-estimat …)
    fetchKpis() { return getJSON('data/kpis.json'); },
    // Medlemsregister — alltid maskert for mindreårige.
    fetchMembers() { return getJSON('data/members.json').then(d => maskMembers(d.members)); },
    // Faktiske månedlige økonomitall.
    fetchOkonomi() { return getJSON('data/okonomi.json').then(d => d.months || {}); },
    // Eksponert så import/roster-flyten kan maskere på samme måte (Fase 2).
    maskMembers,
    isMinor,
  };
})();
