/* ============================================================
   HEADLESS SMOKE TEST — Roots Administrator console (Setup 3).
   Serves the repo over localhost, drives the pages in jsdom:
     1. statics (admin files exist, sw precache)
     2. permissions engine sanity
     3. admin login: wrong password rejected / success writes session
     4. dashboard renders (nav, bell, overview) under session
     5. approve application -> institution/grant/subscription/audit
        + institutional workspace provisional banner hidden
     6. suspend user via confirm+reason -> suspension stored
     7. suspended institutional login blocked (B1 hook)
     8. auditor role gating (locked nav, no approve action)
     9. workspace export mirrors into roots_admin_export_log
   Run: node tools/smoke-admin.js
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '..', 'node_modules', 'jsdom'));
const { webcrypto } = require('crypto');

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
    vc.on('error', () => {});
    const dom = new JSDOM(html, {
      url: 'http://127.0.0.1:' + server.address().port + '/' + urlPath.replace(/^\/+/, ''),
      resources: 'usable',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(window) {
        try {
          Object.defineProperty(window, 'crypto', { value: { subtle: webcrypto.subtle, getRandomValues: window.crypto.getRandomValues.bind(window.crypto) } });
          window.TextEncoder = window.TextEncoder || TextEncoder;
          window.TextDecoder = window.TextDecoder || TextDecoder;
        } catch (e) {}
        window.scrollTo = () => {};
        if (!window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:test';
        if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};
        if (seed) for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, JSON.stringify(v));
      }
    });
    dom.pageErrors = pageErrors;
    dom.window.addEventListener('load', () => setTimeout(() => resolve(dom), 120));
    setTimeout(() => reject(new Error('timeout loading ' + urlPath)), 20000);
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

async function sha256hex(s) {
  const buf = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.prototype.map.call(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- fabricated institutional application + account ---------- */
const APP_ID = 'ROOTS-INST-000901';
const ORG = 'National Archives of Zimbabwe';
const ADMIN_NAME = 'Tendai Moyo';
function fabricateApp(status) {
  return {
    applicationId: APP_ID,
    status: status,
    submittedAt: new Date().toISOString(),
    typeCode: 'GOVERNMENT',
    organisation: { name: ORG, shortName: 'NAZ', whatsappCountry: 'ZW', whatsapp: '0772123456', email: 'info@naz.org.zw' },
    purpose: ['Digitisation'],
    purposeDescription: 'Digitising family history records for public research access.',
    location: { country: 'ZW', region: 'Harare Province', district: 'Harare', city: 'Harare' },
    geographicScope: { level: 'scopeNational' },
    dataAccess: { PEOPLE: true, LINEAGE: true },
    modules: ['CORE', 'RESEARCH_SUITE'],
    primaryAdmin: { name: ADMIN_NAME, whatsappCountry: 'ZW', whatsapp: '0773111222', jobTitle: 'Lead Archivist' },
    staff: []
  };
}
const SUSP_KEY = APP_ID + '|' + ADMIN_NAME.toLowerCase();

const listening = new Promise((res) => (server.address() ? res() : server.on('listening', res)));
(async () => {
  await listening;

  /* ================= TEST 1 — statics ================= */
  ['admin/admin-permissions.js', 'admin/admin-data.js', 'admin/admin.css',
    'admin/admin-login.html', 'admin/admin-login.js', 'admin/admin.html', 'admin/admin.js']
    .forEach((f) => check('file exists: ' + f, fs.existsSync(path.join(ROOT, f))));
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  check('sw cache bumped to roots-v12', /CACHE\s*=\s*'roots-v12'/.test(sw));
  const urls = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1].slice(2)).filter(Boolean);
  const missingSw = urls.filter((u) => !fs.existsSync(path.join(ROOT, u)));
  check('sw.js URLS all exist (' + urls.length + ' entries)', missingSw.length === 0, missingSw.join(', '));

  /* ================= TEST 2 — permissions engine ================= */
  const permDom = await loadPage('/admin/admin-login.html');
  const wp = permDom.window;
  check('RootsAdminPerms exposed', !!wp.RootsAdminPerms && typeof wp.RootsAdminPerms.hasAdminPermission === 'function');
  if (wp.RootsAdminPerms) {
    const total = Object.keys(wp.RootsAdminPerms.PERMISSIONS).length;
    const superPerms = wp.RootsAdminPerms.permissionsForRole('Super Administrator');
    check('SUPER_ADMIN mapped to ALL centrally', superPerms.length === total, superPerms.length + '/' + total);
    check('auditor cannot approve applications', wp.RootsAdminPerms.hasAdminPermission('admin.applications.approve', { role: 'Auditor' }) === false);
    check('auditor can read audit log', wp.RootsAdminPerms.hasAdminPermission('admin.audit.read', { role: 'Auditor' }) === true);
    check('no session -> no permission', wp.RootsAdminPerms.hasAdminPermission('admin.audit.read') === false);
  }
  check('no page JS errors (login statics)', permDom.pageErrors.length === 0, permDom.pageErrors.join(' | '));
  wp.close();

  /* ---------- shared seeds ---------- */
  const appUnderReview = fabricateApp('UNDER REVIEW');
  const accountSeed = {
    applicationId: APP_ID, institutionName: ORG, typeCode: 'GOVERNMENT',
    adminName: ADMIN_NAME, adminWhatsappDigits: '0773111222', adminWhatsappFull: '2630773111222',
    authHash: await sha256hex('roots::inst::test1234'), status: 'ACTIVE', createdAt: new Date().toISOString()
  };
  const SUPER_SESS = { adminId: 'ADM-00001', name: 'Roots Super Admin', role: 'Super Administrator', signInAt: new Date().toISOString() };
  const AUDITOR_SESS = { adminId: 'ADM-00005', name: 'Quiet Auditor', role: 'Auditor', signInAt: new Date().toISOString() };
  const INST_APP_KEYS = ['roots_institutional_applications', 'roots_institutional_accounts'];

  async function adminLoginAttempt(nameV, waV, pwV) {
    const dom = await loadPage('/admin/admin-login.html');
    const w = dom.window, d = w.document;
    await until(() => d.getElementById('adminLoginForm') && w.localStorage.getItem('roots_admin_accounts'), 10000, 'admin accounts seeded');
    type(d.getElementById('adminLoginName'), nameV);
    type(d.getElementById('adminLoginWhatsapp'), waV);
    type(d.getElementById('adminLoginPassword'), pwV);
    d.getElementById('adminLoginForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    return { dom, w, d };
  }

  /* ================= TEST 3 — wrong password rejected ================= */
  const bad = await adminLoginAttempt('Roots Super Admin', '0770000001', 'wrongpass');
  await until(() => bad.d.getElementById('adminLoginError').style.display === 'block', 8000, 'login error shown');
  check('wrong password rejected', /unable to sign in|try again/i.test(bad.d.getElementById('adminLoginError').textContent), bad.d.getElementById('adminLoginError').textContent);
  check('no session written on bad admin auth', bad.w.localStorage.getItem('roots_admin_session') === null);
  check('no page JS errors (admin bad login)', bad.dom.pageErrors.length === 0, bad.dom.pageErrors.join(' | '));
  bad.w.close();

  /* ================= TEST 4 — success writes session ================= */
  const good = await adminLoginAttempt('Roots Super Admin', '0770000001', 'super2026');
  const sessRaw = await new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const v = good.w.localStorage.getItem('roots_admin_session');
      if (v) { clearInterval(iv); resolve(v); }
      else if (Date.now() - t0 > 8000) { clearInterval(iv); resolve(null); }
    }, 60);
  });
  check('session written on admin login', !!sessRaw);
  if (sessRaw) {
    const s = JSON.parse(sessRaw);
    check('admin session fields', s.name === 'Roots Super Admin' && s.role === 'Super Administrator' && !!s.adminId);
  }
  check('no page JS errors (admin login)', good.dom.pageErrors.length === 0, good.dom.pageErrors.join(' | '));
  good.w.close();

  /* ================= TEST 5-6 — dashboard + approve flow ================= */
  const dashSeed = {
    roots_admin_session: SUPER_SESS,
    roots_institutional_applications: [appUnderReview],
    roots_institutional_accounts: [accountSeed]
  };
  const adm = await loadPage('/admin/admin.html', dashSeed);
  const aw = adm.window, ad = aw.document;

  await until(() => ad.querySelectorAll('#adminNav button').length === 16, 15000, 'nav built');
  check('all 16 views in nav', ad.querySelectorAll('#adminNav button').length === 16);
  check('user chip shows admin identity', ad.getElementById('adminUserChip').textContent.includes('Roots Super Admin'));
  const bellTotal = parseInt(ad.getElementById('adminBellCount').textContent || '0', 10);
  check('bell shows pending work (>=1)', bellTotal >= 1, 'bell=' + bellTotal);
  check('overview renders needs-attention panel', ad.getElementById('adminView').textContent.includes('Needs attention'));
  check('no page JS errors (dashboard)', adm.pageErrors.length === 0, adm.pageErrors.join(' | '));

  // Applications view -> open detail -> approve form -> submit
  aw.location.hash = '#/applications';
  await until(() => [...ad.querySelectorAll('#appTable tr.rowlink')].some((tr) => tr.textContent.includes(APP_ID)), 5000, 'app row rendered');
  [...ad.querySelectorAll('#appTable tr.rowlink')].filter((tr) => tr.textContent.includes(APP_ID))[0].click();
  await until(() => ad.getElementById('adminPanelBox').classList.contains('show') &&
    [...ad.querySelectorAll('#adminPanelBody button[data-a]')].some((b) => b.dataset.a === 'approve'), 5000, 'approve action visible');
  check('detail panel shows organisation', ad.getElementById('adminPanelBody').textContent.includes(ORG));
  [...ad.querySelectorAll('#adminPanelBody button[data-a]')].filter((b) => b.dataset.a === 'approve')[0].click();
  await until(() => ad.getElementById('apprGo'), 5000, 'approve form rendered');
  ad.getElementById('apprNote').value = 'Verified against government gazette.';
  ad.getElementById('apprGo').click();

  // Storage side effects (§65-66)
  let instId = null;
  try {
    await until(() => {
      const apps = JSON.parse(aw.localStorage.getItem('roots_institutional_applications'));
      if (!apps || apps[0].status !== 'ACTIVE') return false;
      const insts = JSON.parse(aw.localStorage.getItem('roots_admin_institutions') || '[]');
      const inst = insts.filter((x) => x.sourceApplicationId === APP_ID)[0];
      if (!inst || inst.verificationStatus !== 'VERIFIED' || inst.status !== 'ACTIVE') return false;
      instId = inst.institutionId;
      return true;
    }, 6000, 'institution created VERIFIED');
    check('application flipped to ACTIVE', true);
    check('institution created VERIFIED + ACTIVE (' + instId + ')', !!instId);
  } catch (e) { check('approve side effects (institution)', false, e.message); }
  try {
    const grants = JSON.parse(aw.localStorage.getItem('roots_admin_grants'));
    check('access grant created ACTIVE', grants.some((g) => g.applicationId === APP_ID && g.status === 'ACTIVE' && g.approvedModules.indexOf('CORE') !== -1));
  } catch (e) { check('access grant created', false, e.message); }
  try {
    const subs = JSON.parse(aw.localStorage.getItem('roots_admin_subscriptions'));
    check('subscription activated', subs.some((s) => s.status === 'ACTIVE' && s.modules.indexOf('CORE') !== -1 && s.institutionId === instId));
  } catch (e) { check('subscription activated', false, e.message); }
  try {
    const audit = JSON.parse(aw.localStorage.getItem('roots_admin_audit'));
    check('audit has APPROVE_INSTITUTION', audit.some((a) => a.action === 'APPROVE_INSTITUTION' && a.targetId === APP_ID && a.result === 'SUCCESS'));
    check('audit has GRANT_ACCESS + ACTIVATE_SUBSCRIPTION', audit.some((a) => a.action === 'GRANT_ACCESS') && audit.some((a) => a.action === 'ACTIVATE_SUBSCRIPTION'));
  } catch (e) { check('audit entries', false, e.message); }

  /* ================= TEST 9 (same dom later) — prepared state for suspend ================= */
  const activeApps = JSON.parse(aw.localStorage.getItem('roots_institutional_applications'));

  /* ================= TEST 7 — workspace banner hidden after approval + export ping ================= */
  const wsSeed = {
    roots_institutional_applications: activeApps,
    roots_institutional_accounts: [accountSeed],
    roots_institutional_session: {
      applicationId: APP_ID, institutionName: ORG, typeCode: 'GOVERNMENT',
      adminName: ADMIN_NAME, role: 'ADMINISTRATOR', signInAt: new Date().toISOString()
    },
    /* §46: notices are written by the Roots Administrator console into
       shared browser storage. jsdom windows have isolated localStorage,
       so seed the exact entries notifyInstitution() writes — including
       another institution's notice, which must be filtered out. */
    roots_inst_notifications: [
      { id: 'N-ADMIN2', applicationId: 'ROOTS-INST-OTHER', type: 'application', message: 'Other institution notice — must not appear', at: new Date().toISOString(), read: false },
      { id: 'N-ADMIN1', applicationId: APP_ID, type: 'application', message: 'Your application was APPROVED. Plan Core Institutional is active.', at: new Date().toISOString(), read: false }
    ]
  };
  const wsp = await loadPage('/institutional/institutional-workspace.html', wsSeed);
  const ww = wsp.window, wd = ww.document;
  await until(() => wd.querySelectorAll('#wsView .stat-card').length > 0, 15000, 'workspace overview');
  check('provisional banner hidden after approval', wd.getElementById('wsProvisional').style.display === 'none');
  // §46 cross-console notice: own approval visible, other institutions' filtered out
  try {
    await until(() => (ww.RootsInstShell.alerts() || []).some((a) => /APPROVED/.test(a.msg || '')), 4000, 'approval notice in bell');
    check('admin approval notice reached institution bell (§46)', true);
  } catch (e) { check('admin approval notice reached institution bell (§46)', false, e.message); }
  check('other institutions\' notices filtered out (§46)',
    !(ww.RootsInstShell.alerts() || []).some((a) => /must not appear/.test(a.msg || '')));
  // Drive a real export through the new Export Centre
  ww.location.hash = '#/exports';
  await until(() => wd.getElementById('exRun'), 6000, 'export centre');
  wd.getElementById('exRun').click();
  try {
    await until(() => {
      const log = JSON.parse(ww.localStorage.getItem('roots_admin_export_log') || '[]');
      return log.some((e) => e.institution === ORG && e.user === ADMIN_NAME && e.status === 'COMPLETED');
    }, 4000, 'export logged');
    check('workspace export mirrored to roots_admin_export_log', true);
  } catch (e) { check('export ping', false, e.message); }
  check('no page JS errors (approved workspace)', wsp.pageErrors.length === 0, wsp.pageErrors.join(' | '));
  ww.close();

  /* ================= TEST 6 — suspend user via confirm + reason ================= */
  // Back in the still-open super-admin dashboard:
  ad.getElementById('adminPanelClose').click();
  aw.location.hash = '#/users';
  await until(() => [...ad.querySelectorAll('#userTable tr.rowlink')].some((tr) => tr.textContent.includes('ACCT-' + APP_ID)), 6000, 'user row rendered');
  [...ad.querySelectorAll('#userTable tr.rowlink')].filter((tr) => tr.textContent.includes('ACCT-' + APP_ID))[0].click();
  await until(() => [...ad.querySelectorAll('#adminPanelBody button')].some((b) => /suspend user/i.test(b.textContent)), 5000, 'suspend button');
  [...ad.querySelectorAll('#adminPanelBody button')].filter((b) => /suspend user/i.test(b.textContent))[0].click();
  await until(() => ad.getElementById('adminConfirmWrap').classList.contains('show'), 3000, 'confirm modal shown');

  // Reason is required (Setup 3 §54)
  ad.getElementById('adminConfirmOk').click();
  await sleep(120);
  check('confirm refuses empty reason', ad.getElementById('adminConfirmWrap').classList.contains('show'));
  type(ad.getElementById('adminConfirmReason'), 'Account under compliance review.');
  ad.getElementById('adminConfirmOk').click();
  try {
    await until(() => {
      const list = JSON.parse(aw.localStorage.getItem('roots_admin_user_suspensions') || '[]');
      return list.some((s) => s.key === SUSP_KEY && s.active === true);
    }, 4000, 'suspension stored');
    check('suspension stored with key + reason', JSON.parse(aw.localStorage.getItem('roots_admin_user_suspensions')).filter((s) => s.key === SUSP_KEY)[0].reason === 'Account under compliance review.');
  } catch (e) { check('suspension stored', false, e.message); }
  const suspAudit = JSON.parse(aw.localStorage.getItem('roots_admin_audit')).some((a) => a.action === 'SUSPEND_USER');
  check('SUSPEND_USER audited', suspAudit);

  /* ================= TEST 8 — suspended institutional login blocked ================= */
  const gateSeed = {
    roots_institutional_applications: activeApps,
    roots_institutional_accounts: [accountSeed],
    roots_admin_user_suspensions: [{ key: SUSP_KEY, applicationId: APP_ID, adminName: ADMIN_NAME, active: true, reason: 'Account under compliance review.', at: new Date().toISOString() }]
  };
  const gate = await loadPage('/institutional/institutional-login.html', gateSeed);
  const gw = gate.window, gd = gw.document;
  await until(() => gd.getElementById('institutionalLoginForm'), 8000, 'inst login form');
  type(gd.getElementById('institutionalLoginName'), ADMIN_NAME);
  type(gd.getElementById('institutionalLoginWhatsapp'), '0773111222');
  type(gd.getElementById('institutionalLoginPassword'), 'test1234');
  gd.getElementById('institutionalLoginForm').dispatchEvent(new gw.Event('submit', { bubbles: true, cancelable: true }));
  try {
    await until(() => /suspend/i.test(gd.getElementById('institutionalLoginError').textContent), 8000, 'suspension error shown');
    check('suspended credentials rejected with reason', true);
  } catch (e) { check('suspension gate error', false, e.message); }
  await sleep(700);
  check('no session written while suspended', gw.localStorage.getItem('roots_institutional_session') === null);
  check('no page JS errors (suspension gate)', gate.pageErrors.length === 0, gate.pageErrors.join(' | '));
  gw.close();

  /* ================= TEST 10 — auditor gating ================= */
  const aud = await loadPage('/admin/admin.html', {
    roots_admin_session: AUDITOR_SESS,
    roots_institutional_applications: activeApps,
    roots_institutional_accounts: [accountSeed]
  });
  const auw = aud.window, aud_ = auw.document;
  await until(() => aud_.querySelectorAll('#adminNav button').length === 16, 15000, 'auditor nav built');
  check('auditor: system view locked', /(^|\s)locked(\s|$)/.test(aud_.getElementById('adminNav-system').className));
  check('auditor: applications view readable', !/(^|\s)locked(\s|$)/.test(aud_.getElementById('adminNav-applications').className));

  auw.location.hash = '#/system';
  await sleep(150);
  check('forced #/system falls back to permitted view', !aud_.getElementById('adminView').textContent.includes('Feature flags'));

  auw.location.hash = '#/applications';
  await until(() => [...aud_.querySelectorAll('#appTabs button')].length > 0, 5000, 'auditor tabs');
  [...aud_.querySelectorAll('#appTabs button')].filter((b) => b.dataset.tab === 'ACTIVE')[0].click();
  await until(() => [...aud_.querySelectorAll('#appTable tr.rowlink')].some((tr) => tr.textContent.includes(APP_ID)), 5000, 'auditor sees approved app row');
  [...aud_.querySelectorAll('#appTable tr.rowlink')].filter((tr) => tr.textContent.includes(APP_ID))[0].click();
  await until(() => aud_.getElementById('adminPanelBox').classList.contains('show'), 5000, 'auditor detail panel');
  await sleep(120);
  check('auditor: no APPROVE action offered', ![...aud_.querySelectorAll('#adminPanelBody button[data-a]')].some((b) => b.dataset.a === 'approve'));
  check('no page JS errors (auditor)', aud.pageErrors.length === 0, aud.pageErrors.join(' | '));
  auw.close();

  /* global admin search (Setup 3 §51) */
  ad.getElementById('adminGlobalSearch').value = 'National Archives';
  ad.getElementById('adminGlobalSearch').dispatchEvent(new aw.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await until(() => ad.getElementById('adminView').textContent.includes('Search results for'), 5000, 'global search results');
  check('global search returns grouped rows', [...ad.querySelectorAll('#adminView tr.rowlink')].length >= 2,
    ad.getElementById('adminView').textContent.slice(0, 80));
  check('no page JS errors (global search)', adm.pageErrors.length === 0, adm.pageErrors.join(' | '));
  aw.close();

  console.log(failures ? '\n' + failures + ' PROBLEM(S)' : '\nALL ADMIN SMOKE CHECKS PASSED');
  server.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL smoke crashed — ' + e.stack); server.close(); process.exit(1); });
