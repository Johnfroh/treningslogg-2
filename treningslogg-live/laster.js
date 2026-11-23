// laster.js — henter appens egne skript FERSKE ved hver sidelasting.
//
// Hvorfor: Babel standalone og vanlige <script src> følger nettleserens
// cache. Etter en deploy har brukere fått en blanding av gamle og nye filer
// (f.eks. ny register-profile.jsx sammen med gammel member-dash.jsx), og da
// krasjer appen til den nye koden går ut fra funksjoner som ikke finnes.
// Ctrl+F5 hjalp, men det kan vi ikke forvente at alle vet.
//
// Hvordan: skriptene hentes med fetch(..., { cache: 'no-cache' }). Da spør
// nettleseren alltid serveren om fila er endret. Uendret = kort 304-svar fra
// cachen, endret = ny fil. Ingen versjonsnumre å huske på ved deploy.
//
// Bruk i HTML (etter babel.min.js):
//   <script src="/laster.js?v=1"></script>
//   <script type="text/x-fersk" src="app/api.js"></script>   ← vanlig JS
//   <script type="text/babel" src="app/mobile.jsx"></script> ← JSX
//   <script type="text/babel"> …inline JSX… </script>
// Alle kjøres i dokumentrekkefølge, som før. type="text/x-fersk" gjør at
// nettleseren selv ikke laster fila (ukjent type) — det gjør vi her.
//
// Oversatt kode lagres i nettleseren (IndexedDB), nøklet på et fingeravtrykk
// av kildeteksten. Uendret fil → ferdig kode rett fra lageret, uten Babel.
// Babel-oversettelsen tok ~3,5 s for dashboardet på en rask maskin, og må
// ellers gjøres på nytt ved hver eneste sidelasting. Endret fil → nytt
// fingeravtrykk → oversettes på nytt. Ingen versjonsnumre å huske på.
//
// Endrer du denne fila: bump ?v= i index.html, desktop.html og
// dashboard/index.html, ellers kan nettleseren holde på den gamle.
(function () {
  if (!window.Babel) { console.error('laster.js: Babel er ikke lastet'); return; }
  // Vi tar over Babels egen innlasting (som bruker cachen).
  window.Babel.disableScriptTags();

  // Samme innstillinger som Babel standalone bruker for <script type="text/babel">.
  function babelValg(filnavn) {
    return {
      filename: filnavn,
      presets: ['react', 'env'],
      plugins: ['transform-class-properties', 'transform-object-rest-spread', 'transform-flow-strip-types'],
      sourceMaps: 'inline',
      sourceFileName: filnavn,
    };
  }

  // Bumpes hvis babelValg() endres — da må all lagret kode oversettes på nytt.
  var VALG_VERSJON = '1';

  // cyrb53: rask 53-bits fingeravtrykk av en tekst. Ikke kryptografisk —
  // skal bare oppdage at en fil er endret.
  function avtrykk(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
  }

  // Lageret. Alt her er «beste forsøk»: privat vindu, full disk eller
  // blokkert lagring gir bare null — da oversettes alt som før.
  var lager = new Promise(function (ok) {
    try {
      var req = window.indexedDB.open('tl-laster', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('kode'); };
      req.onsuccess = function () { ok(req.result); };
      req.onerror = req.onblocked = function () { ok(null); };
    } catch (e) { ok(null); }
  });
  function lesLager(nokkel) {
    return lager.then(function (db) {
      if (!db) return null;
      return new Promise(function (ok) {
        try {
          var r = db.transaction('kode', 'readonly').objectStore('kode').get(nokkel);
          r.onsuccess = function () { ok(r.result || null); };
          r.onerror = function () { ok(null); };
        } catch (e) { ok(null); }
      });
    });
  }
  function skrivLager(nokkel, verdi) {
    lager.then(function (db) {
      if (!db) return;
      try { db.transaction('kode', 'readwrite').objectStore('kode').put(verdi, nokkel); } catch (e) { /* ikke viktig */ }
    });
  }

  // JSX → JS, fra lageret når kilden er uendret.
  function oversett(kode, navn) {
    var h = avtrykk(VALG_VERSJON + '|' + (window.Babel.version || '') + '|' + kode);
    return lesLager(navn).then(function (lagret) {
      if (lagret && lagret.h === h) return lagret.c;
      var ut = window.Babel.transform(kode, babelValg(navn)).code;
      skrivLager(navn, { h: h, c: ut });
      return ut;
    });
  }

  function hent(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('fikk ' + r.status);
      return r.text();
    });
  }

  function kjor(kode, navn) {
    var el = document.createElement('script');
    el.text = kode + '\n//# sourceURL=' + navn;
    document.head.appendChild(el);
  }

  // Liten stripe nederst — ikke fullskjerm, resten av appen kan fortsatt virke.
  function visFeil(tekst) {
    var el = document.getElementById('__tl_lastefeil');
    if (!el) {
      el = document.createElement('div');
      el.id = '__tl_lastefeil';
      el.setAttribute('role', 'alert');
      el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:10000;padding:10px 14px;' +
        'border-radius:10px;background:#2B2A3C;color:#fff;font:13px/1.4 system-ui,sans-serif;' +
        'box-shadow:0 6px 20px rgba(0,0,0,.25)';
      document.body.appendChild(el);
    }
    el.textContent = tekst;
  }

  function start() {
    var tags = Array.prototype.slice.call(
      document.querySelectorAll('script[type="text/babel"], script[type="text/x-fersk"]'));
    // Alle filer hentes parallelt, men kjøres i rekkefølge.
    var jobber = tags.map(function (t, i) {
      var src = t.getAttribute('src');
      // Inline-skript nøkles på siden de står i — index.html og desktop.html
      // har hvert sitt.
      var navn = src ? new URL(src, location.href).pathname : location.pathname + '#inline-' + (i + 1) + '.jsx';
      var innhold = src ? hent(src) : Promise.resolve(t.textContent);
      return { babel: t.type === 'text/babel', navn: navn, innhold: innhold };
    });
    jobber.reduce(function (forrige, j) {
      return forrige.then(function () { return j.innhold; }).then(function (kode) {
        return j.babel ? oversett(kode, j.navn) : kode;
      }).then(function (ut) {
        kjor(ut, j.navn);
      }).catch(function (e) {
        // Én fil som feiler skal ikke stoppe resten — samme som Babel selv.
        console.error('laster.js: ' + j.navn + ' feilet:', e);
        visFeil('Kunne ikke laste ' + j.navn + ' (' + ((e && e.message) || e) + '). Last siden på nytt.');
      });
    }, Promise.resolve());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
