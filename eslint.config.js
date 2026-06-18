// Flat-config for ESLint 9+. Ingen package.json / npm install nødvendig —
// kjør via `eslint treningslogg-live/app/` med global eslint, eller
// `npx eslint treningslogg-live/app/`.
//
// Tre miljøer:
//   - treningslogg-live/**: nettleser-JSX, lastet via <script> (script-scope)
//   - functions/**: Cloudflare Pages Function (ES-module worker)
//   - **/*.gs: Apps Script (Rhino-lignende, egne globaler)

const browserGlobals = {
  window: 'readonly', document: 'readonly', console: 'readonly',
  fetch: 'readonly', Response: 'readonly', Request: 'readonly', Headers: 'readonly',
  URL: 'readonly', URLSearchParams: 'readonly',
  localStorage: 'readonly', sessionStorage: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly',
  requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
  alert: 'readonly', confirm: 'readonly', prompt: 'readonly',
  navigator: 'readonly', location: 'readonly', history: 'readonly',
  File: 'readonly', FileReader: 'readonly', Blob: 'readonly', FormData: 'readonly',
  crypto: 'readonly',
  Event: 'readonly', KeyboardEvent: 'readonly', MouseEvent: 'readonly',
  HTMLElement: 'readonly', Element: 'readonly', Node: 'readonly',
  ResizeObserver: 'readonly', MutationObserver: 'readonly', IntersectionObserver: 'readonly',
  getComputedStyle: 'readonly',
};

// Top-level konstanter/funksjoner fra shared.js, data.js og api.js. Disse er
// reelt script-scope globals fordi <script>-tags i index.html/desktop.html
// laster filene i samme globale namespace. ESLint kan ikke se på tvers, så
// vi enumererer dem her.
const projectGlobals = {
  // Tredjeparts-libs lastet via CDN
  React: 'readonly',
  ReactDOM: 'readonly',
  XLSX: 'readonly',
  // data.js
  TL_DATA: 'readonly',
  // api.js
  TL_API: 'readonly',
  // shared.js — tema
  STEEL_FONT: 'readonly',
  M: 'readonly', M_GROUP: 'readonly', M_TAG_COLOR: 'readonly',
  PERIOD_OPTIONS: 'readonly',
  // shared.js — util
  pad: 'readonly', ymdM: 'readonly', parseYmdM: 'readonly',
  sameMonth: 'readonly', slugifyTag: 'readonly', countTagUse: 'readonly',
  expandRecurring: 'readonly',
  NOW: 'readonly', TODAY_M: 'readonly',
  NORWAY_MONTHS: 'readonly', NORWAY_DAYS_SHORT: 'readonly',
  NORWAY_DAYS_LONG: 'readonly', NORWAY_DAYS_INITIAL: 'readonly',
  // shared.js — compute
  computeDashboard: 'readonly', computeMemberStats: 'readonly',
  // App-entry-komponenter (rendres fra HTML mount-block)
  MobileApp: 'writable',
  DesktopApp: 'writable',
  // tweaks-panel.jsx eksponerer disse via Object.assign(window, ...)
  useTweaks: 'readonly', TweaksPanel: 'readonly',
  TweakSection: 'readonly', TweakRow: 'readonly',
  TweakSlider: 'readonly', TweakToggle: 'readonly',
  TweakRadio: 'readonly', TweakSelect: 'readonly',
  TweakText: 'readonly', TweakNumber: 'readonly',
  TweakColor: 'readonly', TweakButton: 'readonly',
};

const sharedRules = {
  'no-undef': 'error',
  'no-unused-vars': ['warn', {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  }],
  'no-mixed-operators': ['warn', {
    groups: [
      ['&&', '||'],
      ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
    ],
    allowSamePrecedence: false,
  }],
  eqeqeq: ['warn', 'smart'],
  // 'no-implicit-globals' er bevisst AV: prosjektet er script-scope uten bundler,
  // top-level funksjoner og konstanter eksponeres globalt på tvers av <script>-tags.
  'no-var': 'warn',
  'prefer-const': 'warn',
};

module.exports = [
  {
    ignores: ['**/node_modules/**', '**/icons/**', '**/*.png', '**/*.webmanifest'],
  },
  {
    files: ['treningslogg-live/**/*.{js,jsx}', 'treningslogg-live/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...browserGlobals, ...projectGlobals },
    },
    rules: sharedRules,
  },
  {
    // Klubbdashboardet (/dashboard) — egne kryss-fil-globaler eksponert via
    // window/Object.assign, samt Web-API-er brukt av import-parserne. Disse
    // merges med den generelle treningslogg-live-blokka over.
    files: ['treningslogg-live/dashboard/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        // Web-API-er (xlsx/okonomi-parsing + tweaks-panel)
        TextDecoder: 'readonly', TextEncoder: 'readonly', DecompressionStream: 'readonly',
        CustomEvent: 'readonly',
        // api.js
        DASH_API: 'readonly',
        // dashboard-shared.jsx
        useKpis: 'readonly', deriveCharts: 'readonly',
        fmtN: 'readonly', fmtKr: 'readonly', fmtPct: 'readonly', WD: 'readonly',
        HBar: 'readonly', Spark: 'readonly', Donut: 'readonly',
        Heatmap: 'readonly', CohortBar: 'readonly',
        // belt-system.jsx
        BELT_META: 'readonly', ADULT_BELTS: 'readonly', JUNIOR_BELTS: 'readonly',
        ALL_BELTS: 'readonly', maxStripes: 'readonly', beltMeta: 'readonly',
        isJuniorBelt: 'readonly', beltLadder: 'readonly', nextBelt: 'readonly',
        BeltGraphic: 'readonly', BeltChip: 'readonly',
        // members-store.jsx
        MembersProvider: 'readonly', useMembers: 'readonly', membersToCSV: 'readonly',
        gradingLogToCSV: 'readonly', downloadText: 'readonly', diffRoster: 'readonly',
        // xlsx-import.jsx / import-ui.jsx
        parseMemberFile: 'readonly', ImportModal: 'readonly',
        // okonomi-import.jsx
        parseOkonomiFile: 'readonly', OkonomiImportModal: 'readonly',
        monthLabel: 'readonly', MND_NO: 'readonly',
        // register-profile.jsx
        GradeDialog: 'readonly', MemberProfile: 'readonly', Timeline: 'readonly',
        Stepper: 'readonly', fmtDate: 'readonly', tenure: 'readonly',
        initials: 'readonly', INSTRUKTORER: 'readonly',
        // register-app.jsx
        Register: 'readonly',
        // daylight-app.jsx (window.KPI / window.Tile)
        KPI: 'readonly', Tile: 'readonly',
      },
    },
    rules: sharedRules,
  },
  {
    files: ['functions/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        fetch: 'readonly', Response: 'readonly', Request: 'readonly',
        URL: 'readonly', console: 'readonly', atob: 'readonly',
      },
    },
    rules: sharedRules,
  },
  {
    files: ['**/*.gs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        SpreadsheetApp: 'readonly',
        ContentService: 'readonly',
        Logger: 'readonly',
        Utilities: 'readonly',
      },
    },
    rules: sharedRules,
  },
];
