#!/usr/bin/env node
/* ============================================================
   ONE-TIME DEMO-DATA ENRICHMENT
   Enriches data/roots_family_tree_master_dataset_v2.json with
   synthetic but internally consistent Zimbabwean context so the
   institutional workspace widgets/registries show real content:
     - admin.province/district/ward/chief/headman/sabhuku/
       villageBookId/nationalId   (geography clusters)
     - kinship.mutupo/chidawo/zvidawo + oral.greeting/taboo
       drawn from lookups.js totemRegistry, assigned PER BRANCH
       so households/clans stay coherent
     - gender derived from relation semantics, remainder
       deterministically hashed (dataset had none)
     - lifecycleState across ALIVE / DECEASED_FROZEN /
       RITUAL_CLEARED / NHAKA_RESOLVED
     - kinship.houseRank by birth order within each mother
   Everything is deterministic (djb2 hash of stable keys) so
   re-runs are idempotent. Run: node tools/enrich-dataset.js
   All enriched values are SYNTHETIC demo data.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const FILE = path.join(ROOT, 'data', 'roots_family_tree_master_dataset_v2.json');
const LOOKUPS = fs.readFileSync(path.join(ROOT, 'lookups.js'), 'utf8');

/* ---- load totemRegistry without touching a browser ---- */
const sandbox = { window: {} };
vm.runInNewContext(LOOKUPS, sandbox);
const REGISTRY = sandbox.window.totemRegistry || {};
const TOTEMS = Object.keys(REGISTRY);
if (!TOTEMS.length) throw new Error('totemRegistry empty');

/* ---- djb2 hash -> uint ---- */
function hash(s) {
  let h = 5381;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}
const pick = (arr, seed) => arr[hash(seed) % arr.length];

/* ---- provinces -> plausible districts (synthetic mapping) ---- */
const GEO = {
  'Harare': ['Harare', 'Chitungwiza', 'Ruwa'],
  'Bulawayo': ['Bulawayo'],
  'Manicaland': ['Mutare', 'Chipinge', 'Makoni'],
  'Mashonaland Central': ['Bindura', 'Mount Darwin', 'Guruve'],
  'Mashonaland East': ['Marondera', 'Murehwa', 'Seke'],
  'Mashonaland West': ['Chinhoyi', 'Kariba', 'Zvimba'],
  'Masvingo': ['Masvingo', 'Chiredzi', 'Gutu'],
  'Matabeleland North': ['Hwange', 'Lupane', 'Binga'],
  'Matabeleland South': ['Gwanda', 'Beitbridge', 'Insiza'],
  'Midlands': ['Gweru', 'Kwekwe', 'Shurugwi']
};
const PROVINCES = Object.keys(GEO);
const CHIEFS = ['Chiduku', 'Nyajena', 'Svosve', 'Chiweshe', 'Nehanda', 'Mangwende', 'Chihota', 'Marange', 'Mutasa', 'Charumbira', 'Ncube', 'Lobengula', 'Dhlodhlo', 'Gampu', 'Mabhena', 'Mkwananzi'];
const HEADMEN = ['Madyira', 'Chipunza', 'Magaya', 'Nyakudya', 'Masenda', 'Zhou', 'Ndlovu', 'Sibanda'];
const SABHUKU_INITIALS = ['E.', 'T.', 'M.', 'P.', 'R.', 'C.'];

/* ---- gender derivation from relation semantics ---- */
const FEM = /(mother|daughter|sister|niece|aunt|grandmother|gogo|\bmai\b)/i;
const MASC = /(father|brother|nephew|uncle|grandfather|sekuru)/i;

function deriveGender(p) {
  const rel = String(p.relation || '');
  if (/^self$/i.test(rel.trim())) return ''; // never guess the account owner
  const f = FEM.test(rel), m = MASC.test(rel);
  if (f && !m) return 'female';
  if (m && !f) return 'male';
  return hash('gender:' + p.id) % 2 ? 'female' : 'male';
}

/* ---- main ---- */
const D = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const people = D.people;

/* branch -> totem key (clan coherence) */
const branchTotem = {};

/* parent-of index for houseRank */
const kidsOf = {};
D.relationships.forEach(r => {
  if (r.relationship === 'child-of') (kidsOf[r.to] = kidsOf[r.to] || []).push(r.from);
});

let geoN = 0, totemN = 0, genN = 0, houseN = 0;
let aliveN = 0, frozenN = 0, clearedN = 0, nhakaN = 0;

people.forEach(p => {
  /* --- gender --- */
  if (!p.gender) {
    const g = deriveGender(p);
    if (g) { p.gender = g; genN++; }
  }

  /* --- geography --- */
  const h = hash('geo:' + p.id);
  const province = PROVINCES[h % PROVINCES.length];
  const districts = GEO[province];
  const district = districts[(h >>> 3) % districts.length];
  const distCode = district.slice(0, 3).toUpperCase();
  p.admin = Object.assign({}, p.admin, {
    province: province,
    district: district,
    ward: 'Ward ' + (1 + ((h >>> 6) % 25)),
    chief: 'Chief ' + pick(CHIEFS, 'chief:' + district),
    headman: 'Headman ' + pick(HEADMEN, 'hm:' + district + ((h >>> 9) % 4)),
    sabhuku: pick(SABHUKU_INITIALS, 'sb:' + p.id) + ' ' + pick(HEADMEN, 'sb2:' + district + ((h >>> 4) % 7)),
    villageBookId: 'VB-' + distCode + '-' + (1 + ((h >>> 12) % 6)),
    nationalId: String(10 + (h % 80)) + '-' + String(100000 + ((h >>> 5) % 899999)) + 'X' + String(10 + ((h >>> 2) % 80))
  });
  geoN++;

  /* --- totem per branch (clan coherence) --- */
  const branchKey = p.branch || p.lineageCategory || 'Unbranched';
  if (!branchTotem[branchKey]) branchTotem[branchKey] = TOTEMS[hash('clan:' + branchKey) % TOTEMS.length];
  const regKey = branchTotem[branchKey];
  const reg = REGISTRY[regKey] || {};
  const paren = regKey.indexOf('(');
  const mutupo = (paren === -1 ? regKey : regKey.slice(0, paren)).trim();
  const chidawo = paren === -1 ? '' : regKey.slice(paren + 1).replace(/\)$/, '').trim();
  p.kinship = Object.assign({
    culturalSystem: 'SHONA', mukowaMatriclan: '', luzuboPatriclan: '',
    houseRank: null, lineageAnchorType: 'BIOLOGICAL_FATHER',
    customaryLineageOverrideId: null, zera: false, kuremara: false, mhosva: false,
    zvidawo: []
  }, p.kinship || {}, {
    mutupo: mutupo,
    chidawo: chidawo,
    zvidawo: (reg.zvidawo || []).slice()
  });
  p.oral = Object.assign({ guruuswaOrigin: '', praisePoem: '', greeting: '', taboo: '' }, p.oral || {}, {
    greeting: reg.greeting || '',
    taboo: reg.taboo || ''
  });
  totemN++;

  /* --- lifecycle state --- */
  const deceased = p.yearDeceased || /deceased/i.test(String(p.status || ''));
  if (deceased) {
    const yr = parseInt(String(p.yearDeceased || '').slice(0, 4), 10) ||
      parseInt((String(p.status || '').match(/\d{4}/) || [])[0], 10) || 2000;
    p.lifecycleState = yr >= 2020 ? 'DECEASED_FROZEN'
      : ['RITUAL_CLEARED', 'NHAKA_RESOLVED', 'DECEASED_FROZEN'][hash('lc:' + p.id) % 3];
  } else {
    p.lifecycleState = 'ALIVE';
  }
  if (p.lifecycleState === 'ALIVE') aliveN++;
  else if (p.lifecycleState === 'DECEASED_FROZEN') frozenN++;
  else if (p.lifecycleState === 'RITUAL_CLEARED') clearedN++;
  else nhakaN++;
});

/* --- houseRank: birth order within each mother with >=2 children --- */
Object.keys(kidsOf).forEach(motherId => {
  const mother = people.find(x => x.id === motherId);
  if (!mother || mother.gender !== 'female') return;
  const kids = kidsOf[motherId]
    .map(id => people.find(x => x.id === id))
    .filter(Boolean)
    .sort((a, b) => String(a.dateOfBirth || '').localeCompare(String(b.dateOfBirth || '')));
  if (kids.length >= 2) {
    kids.forEach((k, i) => { k.kinship.houseRank = i + 1; houseN++; });
  }
});

if (!/\+ synthetic-demo enrichment/.test(String(D.version || ''))) {
  D.version = String(D.version || '') + ' + synthetic-demo enrichment (geo/totem/lifecycle/gender)';
}

fs.writeFileSync(FILE, JSON.stringify(D, null, 2), 'utf8');
console.log('enriched', people.length, 'people:',
  '\n  geography:', geoN, '| totems:', totemN, '| gender assigned:', genN, '| houseRank set:', houseN,
  '\n  lifecycle: ALIVE', aliveN, '/ FROZEN', frozenN, '/ CLEARED', clearedN, '/ NHAKA', nhakaN,
  '\n  clans (branches):', Object.keys(branchTotem).length,
  '| village books:', new Set(people.map(p => p.admin.villageBookId)).size);
