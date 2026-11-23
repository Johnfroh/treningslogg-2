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
      var navn = src ? new URL(src, location.href).pathname : 'inline-' + (i + 1) + '.jsx';
      var innhold = src ? hent(src) : Promise.resolve(t.textContent);
      return { babel: t.type === 'text/babel', navn: navn, innhold: innhold };
    });
    jobber.reduce(function (forrige, j) {
      return forrige.then(function () { return j.innhold; }).then(function (kode) {
        var ut = j.babel ? window.Babel.transform(kode, babelValg(j.navn)).code : kode;
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
