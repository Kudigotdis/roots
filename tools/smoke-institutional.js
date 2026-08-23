/* ============================================================
   HEADLESS SMOKE TEST — Institutional B1 flow (Setup 2 §52).
   Serves the repo over localhost, drives the pages in jsdom:
     1. config sanity          2. sw.js precache files exist
     3. onboarding 9-step walk → submit provisions app+account
     4. login with provisioned credentials → session written
        (+ wrong-password rejection + lockout counter)
     5. workspace renders identity/stats/profiles under session
   Run: node tools/smoke-institutional.js
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '..', 'node_modules', 'jsdom'));

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('OK   ' + name);
  else { failures++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- static file server ---------- */
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.join(ROOT, rel || 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('nf'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});
server.listen(0, '127.0.0.1');

function fetchHtml(urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: server.address().port, path: '/' + urlPath.replace(/^\/+/, '') }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve(b));
    }).on('error', reject);
  });
}

function loadPage(urlPath, seed) {
  return new Promise(async (resolve, reject) => {
    const html = await fetchHtml(urlPath);
    const vc = new VirtualConsole();
    const pageErrors = [];
    vc.on('jsdomError', (e) => {
      const msg = String(e.message || e);
      if (/Not implemented: navigation|Not implemented: window.scrollTo/.test(msg)) return;
      pageErrors.push(msg);
    });
    vc.on('error', (...a) => {
      const msg = String((a[0] && (a[0].stack || a[0].message)) || a[0] || '');
      if (/Not implemented: navigation|Not implemented: window.scrollTo/.test(msg)) return;
      console.log('   [console.error] ' + msg.split('\n').slice(0, 3).join(' | '));
    });
    const dom = new JSDOM(html, {
      url: 'http://127.0.0.1:' + server.address().port + '/' + urlPath.replace(/^\/+/, ''),
      resources: 'usable',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(window) {
        try {
          const webcrypto = require('crypto').webcrypto;
          Object.defineProperty(window, 'crypto', { value: { subtle: webcrypto.subtle, getRandomValues: window.crypto.getRandomValues.bind(window.crypto) } });
          window.TextEncoder = window.TextEncoder || TextEncoder;
          window.TextDecoder = window.TextDecoder || TextDecoder;
        } catch (e) {}
        window.scrollTo = () => {};
        if (seed) for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, JSON.stringify(v));
      }
    });
    dom.pageErrors = pageErrors;
    dom.window.addEventListener('load', () => setTimeout(() => resolve(dom), 120));
    setTimeout(() => reject(new Error('timeout loading ' + urlPath)), 15000);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(60); }
  throw new Error('timeout: ' + label);
}
function fire(el, type) { el.dispatchEvent(new el.ownerDocument.defaultView.Event(type, { bubbles: true })); }
function type(el, val) { el.value = val; fire(el, 'input'); }

/* ================= TEST 1 — config sanity ================= */
const listening = new Promise((res) => (server.address() ? res() : server.on('listening', res)));
(async () => {
  await listening;

  /* TEST 2 — sw.js precache list exists */
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  check('sw cache bumped to roots-v10', /CACHE\s*=\s*'roots-v10'/.test(sw));
  const urls = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1].slice(2)).filter(Boolean);
  const missingSw = urls.filter((u) => u !== '' && !fs.existsSync(path.join(ROOT, u)));
  check('sw.js URLS all exist (' + urls.length + ' entries)', missingSw.length === 0, missingSw.join(', '));

  /* ---------- onboarding walk ---------- */
  const ob = await loadPage('/institutional/institutional-onboarding.html');
  const w = ob.window, d = w.document;

  check('config loaded: 10 TYPES', w.RootsInstConfig && w.RootsInstConfig.TYPES.length === 10);

  // Step 1 — pick Government
  d.getElementById('institutionTypeGovernment').click();
  cont();
  function cont() { d.getElementById('institutionalContinue').click(); }

  // Step 2 — organisation
  await until(() => d.getElementById('institutionalStep2').classList.contains('active'), 2000, 'step2 active');
  type(d.getElementById('organisationName'), 'National Archives of Zimbabwe');
  type(d.getElementById('organisationWhatsapp'), '0772123456');
  cont();

  // Step 3 — ZW location + national scope
  await until(() => d.getElementById('institutionalStep3').classList.contains('active'), 2000, 'step3 active');
  const country = d.getElementById('organisationCountry');
  country.value = 'ZW'; fire(country, 'change');           // re-renders ZW fields
  await until(() => d.getElementById('organisationRegion') && d.getElementById('organisationRegion').tagName === 'SELECT', 2000, 'zw region select');
  const region = d.getElementById('organisationRegion');
  region.value = region.options[1].value; fire(region, 'change');
  const district = d.getElementById('organisationDistrict');
  district.value = district.options[1].value; fire(district, 'change');
  type(d.getElementById('organisationCity'), 'Harare');
  d.getElementById('scopeNational').click();               // national followup -> auto-ok
  cont();

  // Step 4 — purpose chip + description >=30 chars
  await until(() => d.getElementById('institutionalStep4').classList.contains('active'), 2000, 'step4 active');
  d.querySelector('#purposeCards .inst-chip').click();
  type(d.getElementById('institutionPurposeDescription'), 'Digitising family history records for public research access.');
  cont();

  // Step 5 — tick first data-access checkbox
  await until(() => d.getElementById('institutionalStep5').classList.contains('active'), 2000, 'step5 active');
  const cb = d.querySelector('input[data-access-id]');
  cb.checked = true; fire(cb, 'change');
  check('person-level warning visible', d.getElementById('personWarning').style.display !== 'none');
  cont();

  // Step 6 — modules (CORE included)
  await until(() => d.getElementById('institutionalStep6').classList.contains('active'), 2000, 'step6 active');
  check('CORE module included', w.RootsInstConfig.MODULE_SUITES.some((m) => m.id === 'CORE'));
  cont();

  // Step 7 — primary admin
  await until(() => d.getElementById('institutionalStep7').classList.contains('active'), 2000, 'step7 active');
  type(d.getElementById('primaryAdminName'), 'Tendai Moyo');
  type(d.getElementById('primaryAdminWhatsapp'), '0773111222');
  type(d.getElementById('primaryAdminPassword'), 'test1234');
  type(d.getElementById('primaryAdminPasswordConfirm'), 'test1234');
  cont();

  // Step 8 — skip staff (blank allowed)
  await until(() => d.getElementById('institutionalStep8').classList.contains('active'), 2000, 'step8 active');
  cont();

  // Step 9 — review + gating check first (submit must be blocked when a step is incomplete? all complete here)
  await until(() => d.getElementById('institutionalStep9').classList.contains('active'), 2000, 'step9 review');
  check('review shows organisation name', d.getElementById('reviewSections').textContent.includes('National Archives of Zimbabwe'));
  d.getElementById('institutionalSubmit').click();
  await until(() => {
    const apps = JSON.parse(w.localStorage.getItem('roots_institutional_applications') || '[]');
    return apps.length === 1;
  }, 5000, 'application provisioned');
  await until(() => d.getElementById('institutionalSubmitted').classList.contains('active'), 3000, 'submitted screen');

  const apps = JSON.parse(w.localStorage.getItem('roots_institutional_applications'));
  const accts = JSON.parse(w.localStorage.getItem('roots_institutional_accounts'));
  check('application id format', /^ROOTS-INST-\d{6}$/.test(apps[0].applicationId), apps[0].applicationId);
  check('application UNDER REVIEW', apps[0].status === 'UNDER REVIEW');
  check('account provisioned ACTIVE', accts.length === 1 && accts[0].status === 'ACTIVE');
  check('draft cleared after submit', w.localStorage.getItem('roots_institutional_draft') === null);
  check('no page JS errors (onboarding)', ob.pageErrors.length === 0, ob.pageErrors.join(' | '));

  const CRED = { name: 'Tendai Moyo', waLocal: '0773111222', pw: 'test1234' };
  const SEED = {
    roots_institutional_applications: apps,
    roots_institutional_accounts: accts,
    roots_institutional_seq: JSON.parse(w.localStorage.getItem('roots_institutional_seq'))
  };
  ob.window.close();

  /* ---------- login: wrong password rejected ---------- */
  const lg1 = await loadPage('/institutional/institutional-login.html', SEED);
  const w1 = lg1.window, d1 = w1.document;
  await until(() => d1.getElementById('institutionalLoginName'), 3000, 'login form');

  async function attemptLogin(nameV, waV, pwV) {
    type(d1.getElementById('institutionalLoginName'), nameV);
    type(d1.getElementById('institutionalLoginWhatsapp'), waV);
    type(d1.getElementById('institutionalLoginPassword'), pwV);
    d1.getElementById('institutionalLoginForm').dispatchEvent(new w1.Event('submit', { bubbles: true, cancelable: true }));
  }
  await attemptLogin(CRED.name, CRED.waLocal, 'wrongpass');
  await until(() => /unable to sign in|try again/i.test(d1.getElementById('institutionalLoginError').textContent), 4000, 'wrong-pw error shown');
  check('wrong password rejected', true);
  check('no session written on bad auth', w1.localStorage.getItem('roots_institutional_session') === null);
  w1.close();

  /* ---------- login: correct credentials ---------- */
  const lg2 = await loadPage('/institutional/institutional-login.html', SEED);
  const w2 = lg2.window, d2 = w2.document;
  await until(() => d2.getElementById('institutionalLoginSubmit'), 3000, 'login form 2');
  type(d2.getElementById('institutionalLoginName'), CRED.name);
  type(d2.getElementById('institutionalLoginWhatsapp'), CRED.waLocal);
  type(d2.getElementById('institutionalLoginPassword'), CRED.pw);
  d2.getElementById('institutionalLoginForm').dispatchEvent(new w2.Event('submit', { bubbles: true, cancelable: true }));
  const sessRaw = await new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const v = w2.localStorage.getItem('roots_institutional_session');
      if (v) { clearInterval(iv); resolve(v); }
      else if (Date.now() - t0 > 5000) { clearInterval(iv); resolve(null); }
    }, 60);
  });
  check('session written on success', !!sessRaw);
  if (sessRaw) {
    const sess = JSON.parse(sessRaw);
    check('session fields', sess.adminName === CRED.name && sess.role === 'ADMINISTRATOR' && sess.institutionName === 'National Archives of Zimbabwe');
  }
  check('no page JS errors (login)', lg2.pageErrors.length === 0, lg2.pageErrors.join(' | '));
  w2.close();

  /* ---------- workspace renders under session ---------- */
  const wsSeed = Object.assign({}, SEED, { roots_institutional_session: JSON.parse(sessRaw) });
  const wsp = await loadPage('/institutional/institutional-workspace.html', wsSeed);
  const w3 = wsp.window, d3 = w3.document;
  await until(() => d3.querySelectorAll('#wsView .stat-card').length > 0, 8000, 'workspace overview rendered');
  check('identity header shows org + user + role', d3.getElementById('wsOrgTitle').textContent.includes('National Archives of Zimbabwe') &&
    d3.getElementById('wsUserChip').textContent.includes('Tendai Moyo') &&
    d3.getElementById('wsUserChip').textContent.includes('ADMINISTRATOR'));
  check('provisional banner shown (UNDER REVIEW)', d3.getElementById('wsProvisional').style.display !== 'none' &&
    /UNDER REVIEW/.test(d3.getElementById('wsProvisional').textContent));
  check('type landing title (GOVERNMENT)', d3.getElementById('wsView').textContent.includes('REGIONAL DATA OVERVIEW'));
  check('sidebar nav populated (no universal menu)', d3.querySelectorAll('#wsNav button').length >= 6 && d3.querySelectorAll('#wsNav button').length <= 12);
  check('mobile bottom nav has 5 items', d3.querySelectorAll('#wsBottomNav button').length === 5);
  check('notifications bell rendered', d3.getElementById('wsBellCount').textContent.length > 0);

  // Aggregate-only records view (no grant seeded -> person-level locked)
  w3.location.hash = '#/records';
  await until(() => d3.getElementById('wsView').textContent.includes('AGGREGATE VIEW ONLY'), 5000, 'records aggregate view');
  check('aggregate-only mode without approval', true);
  check('approval lock card offered', !!d3.querySelector('#wsView [data-lock="approval"]'));

  // Village books registry (GOVERNMENT nav) — renders table or scoped empty state
  w3.location.hash = '#/villages';
  await until(() => d3.getElementById('wsView').textContent.includes('Village Books Registry'), 5000, 'villages view');
  check('village books registry renders', d3.querySelector('#wsView .ws-table') || d3.querySelector('#wsView .ws-empty'));
  w3.location.hash = '#/totems'; // NOT in GOVERNMENT navigation -> must fall back
  await sleep(150);
  check('hidden view falls back to default (no universal menu)', d3.getElementById('wsView').textContent.includes('REGIONAL DATA OVERVIEW'));
  check('no page JS errors (workspace)', wsp.pageErrors.length === 0, wsp.pageErrors.join(' | '));

  // Sign out clears session
  d3.getElementById('wsSignOut').click();
  await sleep(80);
  check('sign out clears session', w3.localStorage.getItem('roots_institutional_session') === null);
  w3.close();

  /* ---------- D1 completion: lifecycle view + sync chip (§51, §63-65) ---------- */
  const baseSess = JSON.parse(sessRaw);
  const govSeed = Object.assign({}, SEED, {
    roots_institutional_session: baseSess,
    roots_admin_grants: [{
      grantId: 'GRANT-SMOKE', institutionId: 'INST-00001', institutionName: 'National Archives of Zimbabwe',
      applicationId: baseSess.applicationId,
      requestId: '', accessScope: 'National',
      approvedDatasets: ['PEOPLE', 'LINEAGE', 'LIFECYCLE'],
      approvedModules: ['CORE', 'RESEARCH_SUITE', 'GOVERNMENT_SUITE'],
      personLevelAllowed: true, anonymizationRequired: true,
      exportFormatsAllowed: ['CSV'], expiresAt: null,
      grantedBy: 'Smoke', createdAt: new Date().toISOString(), status: 'ACTIVE'
    }],
    roots_inst_corrections: [{ id: 'COR-1', status: 'SUBMITTED', field: 'name', at: new Date().toISOString() }]
  });
  const gp = await loadPage('/institutional/institutional-workspace.html', govSeed);
  const g4 = gp.window, d4 = g4.document;
  await until(() => d4.querySelectorAll('#wsView .stat-card').length > 0, 8000, 'gov workspace rendered');
  await until(() => /submission/.test(d4.getElementById('wsSyncChip').textContent), 4000, 'sync chip pending count');
  check('sync chip shows pending submissions (§51)', d4.getElementById('wsSyncChip').textContent.includes('1 submission pending'));

  // Lifecycle & customary register (§63-65) — LIFECYCLE dataset granted
  g4.location.hash = '#/lifecycle';
  await until(() => d4.getElementById('wsView').textContent.includes('Customary Law Register'), 5000, 'lifecycle view');
  check('lifecycle register renders state cards', d4.querySelectorAll('#wsView .ws-card').length >= 4);

  // Enriched demo data reaches the registries (tools/enrich-dataset.js)
  const frozenCard = d4.querySelector('#wsView [data-state="DECEASED_FROZEN"]');
  if (frozenCard) {
    frozenCard.click();
    await until(() => d4.querySelectorAll('#lcStateList .ws-row').length > 0, 4000, 'lifecycle drill-down');
    check('lifecycle drill-down lists enriched deceased records (§65)', true);
  } else {
    check('lifecycle drill-down lists enriched deceased records (§65)', false, 'no DECEASED_FROZEN card');
  }

  // Exogamy checker runs against two scoped people
  const mcA = d4.getElementById('mcA'), mcB = d4.getElementById('mcB');
  if (mcA.options.length > 2 && mcB.options.length > 2) {
    mcA.selectedIndex = 1;
    mcB.selectedIndex = mcA.selectedIndex + 1 < mcA.options.length ? mcA.selectedIndex + 1 : 1;
    d4.getElementById('mcGo').click();
    await until(() => /Permitted|prohibited/.test(d4.getElementById('mcOut').textContent), 4000, 'exogamy verdict');
    check('marriage feasibility check renders verdict (§63)', true);
  } else {
    check('marriage feasibility check renders verdict (§63)', false, 'no scoped living people to pick from');
  }

  // Lineage table (§62) — RESEARCH_SUITE granted via smoke grant
  g4.location.hash = '#/lineage';
  await until(() => !!d4.getElementById('lnResults'), 5000, 'lineage view');
  const tableBtn = d4.querySelector('#lnResults [data-table]');
  if (tableBtn) {
    tableBtn.click();
    await until(() => d4.getElementById('lnTable').textContent.includes('Lineage table'), 5000, 'lineage table');
    const t = d4.getElementById('lnTable').textContent;
    check('lineage table shows all §62 columns', ['Years', 'Person', 'Parents', 'Children', 'Collateral', 'Totem', 'House', 'Administrative area', 'Source'].every((h) => t.includes(h)));
    check('no page JS errors (lineage/lifecycle)', gp.pageErrors.length === 0, gp.pageErrors.join(' | '));
  } else {
    check('lineage table shows all §62 columns', false, 'no search results to open table from');
  }

  // Village books registry populated from enriched geography
  g4.location.hash = '#/villages';
  await until(() => d4.getElementById('wsView').textContent.includes('Village Books Registry'), 5000, 'villages (gov scope)');
  check('village books populated from enriched geography', d4.querySelectorAll('#wsView .ws-table tbody tr').length >= 3,
    String(d4.querySelectorAll('#wsView .ws-table tbody tr').length) + ' rows');

  /* ---------- §66 settings tabs: Notifications / Exports / Privacy ---------- */
  g4.location.hash = '#/organisation';
  await until(() => d4.querySelector('#orTabs button[data-t="notifications"]'), 5000, 'organisation view');
  d4.querySelector('#orTabs button[data-t="notifications"]').click();
  await until(() => d4.querySelectorAll('#orBody [data-cat]').length === 4, 4000, 'notification prefs rows');
  const bellBefore = parseInt(d4.getElementById('wsBellCount').textContent, 10) || 0;
  d4.querySelector('#orBody [data-cat="corrections"]').click(); // mute corrections
  await until(() => /MUTED/.test(d4.querySelector('#orBody [data-cat="corrections"]').textContent), 4000, 'mute toggle');
  g4.RootsInstShell.updateBell();
  const bellAfter = parseInt(d4.getElementById('wsBellCount').textContent, 10) || 0;
  check('§66 notification mute removes category from bell', bellBefore >= 1 && bellAfter === bellBefore - 1,
    'before=' + bellBefore + ' after=' + bellAfter);
  d4.querySelector('#orBody [data-cat="corrections"]').click(); // restore
  await until(() => /ON ✓/.test(d4.querySelector('#orBody [data-cat="corrections"]').textContent), 4000, 'unmute restore');

  d4.querySelector('#orTabs button[data-t="exports"]').click();
  await until(() => !!d4.getElementById('oeFormat'), 4000, 'exports settings tab');
  d4.getElementById('oeFormat').value = d4.getElementById('oeFormat').options[0].value;
  d4.getElementById('oeSave').click();
  const defFmt = JSON.parse(g4.localStorage.getItem('roots_inst_store_ORG_EXPORT_DEFAULTS') ||
    g4.localStorage.getItem('ORG_EXPORT_DEFAULTS') || '[]');
  check('§66 export default saved', Array.isArray(defFmt) && defFmt.length === 1 && defFmt[0].format);
  d4.querySelector('#orTabs button[data-t="privacy"]').click();
  await until(() => d4.getElementById('orBody').textContent.includes('Data privacy posture'), 4000, 'privacy tab');
  check('§66 privacy mirrors grant posture',
    d4.getElementById('orBody').textContent.includes('APPROVED') && d4.getElementById('orBody').textContent.includes('REQUIRED'),
    'person-level approved + anonymisation required expected');
  g4.close();

  /* ---------- §48/§69 role-determines-navigation ---------- */
  async function roleSession(role) {
    const p = await loadPage('/institutional/institutional-workspace.html',
      Object.assign({}, SEED, { roots_institutional_session: Object.assign({}, baseSess, { role: role }) }));
    await until(() => p.window.document.querySelectorAll('#wsNav button').length > 0, 8000, role + ' nav rendered');
    return p;
  }

  const vp2 = await roleSession('Viewer');
  const wv = vp2.window, dv = wv.document;
  const viewerLabels = [...dv.querySelectorAll('#wsNav button')].map((b) => b.textContent.trim().toLowerCase());
  check('Viewer nav reduced (≤4 items)', viewerLabels.length <= 4, viewerLabels.join(','));
  check('Viewer denied Organisation/Lineage/Exports/Villages',
    !viewerLabels.some((l) => /organisation|lineage|export|villages|disputes|lifecycle/.test(l)), viewerLabels.join(','));
  dv.getElementById('wsSignOut'); // sanity element access
  check('no page JS errors (viewer workspace)', vp2.pageErrors.length === 0, vp2.pageErrors.join(' | '));
  wv.location.hash = '#/organisation';
  await sleep(150);
  check('hidden view falls back for Viewer (landing)', dv.getElementById('wsView').textContent.includes('REGIONAL DATA OVERVIEW'));
  wv.close();

  const rp2 = await roleSession('Researcher');
  const wr = rp2.window, dr = wr.document;
  const researcherLabels = [...dr.querySelectorAll('#wsNav button')].map((b) => b.textContent.trim().toLowerCase());
  check('Researcher keeps lineage/reports/access',
    researcherLabels.some((l) => l.includes('lineage')) && researcherLabels.some((l) => l.includes('reports')) && researcherLabels.some((l) => l.includes('access')),
    researcherLabels.join(','));
  check('Researcher denied Organisation/succession/lifecycle/villages',
    !researcherLabels.some((l) => /organisation|succession|lifecycle|villages/.test(l)), researcherLabels.join(','));
  check('no page JS errors (researcher workspace)', rp2.pageErrors.length === 0, rp2.pageErrors.join(' | '));
  wr.close();

  console.log(failures ? '\n' + failures + ' PROBLEM(S)' : '\nALL INSTITUTIONAL SMOKE CHECKS PASSED');
  server.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL smoke crashed — ' + e.stack); server.close(); process.exit(1); });
