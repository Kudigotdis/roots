/* ============================================================
   INSTITUTIONAL WORKSPACE SHELL (Setup 4 §1-4, §48-52).
   Post-login flow: session -> institution -> membership -> role
   -> permissions -> grants -> modules -> type-specific shell.
   Builds navigation from the institution's effective access,
   never showing a giant universal menu (§61).
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  var CFG = window.RootsInstConfig;
  var KEYS = CFG.KEYS;
  var Store = window.RootsInstStore;
  var AccessLib = window.RootsInstAccess;
  var WSC = window.RootsInstWorkspaceConfig;

  /* ---------- session guard ---------- */
  var session = Store.currentSession();
  if (!session || !session.institutionName) {
    location.replace('institutional-login.html');
    return;
  }

  try {
    if (window.RootsData && typeof RootsData.upgradeAll === 'function') RootsData.upgradeAll();
  } catch (e) {}

  var access = AccessLib.compute(session);
  if (!access) { location.replace('institutional-login.html'); return; }

  var typeCfg = WSC.configForType(access.institutionType);
  var typeInfo = CFG.typeByCode(access.institutionType);

  /* ---------- tiny helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function toast(msg) {
    var t = $('wsToast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function downloadBlob(content, filename, mime, prefix) {
    var blob = new Blob([(prefix || '') + content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  function csv(filename, headers, rows) {
    var body = headers.join(',') + '\n' + rows.map(function (r) {
      return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    downloadBlob(body, filename, 'text/csv;charset=utf-8', '\uFEFF');
  }

  /* ---------- context handed to every view ---------- */
  var ctx = {
    access: access,
    session: session,
    typeCfg: typeCfg,
    typeInfo: typeInfo,
    esc: esc,
    el: el,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    toast: toast,
    csv: csv,
    downloadBlob: downloadBlob,
    go: function (id) { location.hash = '#/' + id; },
    lockCard: lockCard
  };
  window.RootsInstShell = {
    ctx: ctx,
    refreshNav: buildNavAndBottom,
    route: route,
    alerts: computeAlerts,
    updateBell: updateBell,
    renderSync: renderSync
  };

  /* ---------- lock states (§49) — not errors, plan/approval states ---------- */
  function lockCard(kind, moduleId) {
    if (kind === 'plan') {
      return '<div class="ws-lock"><div class="ws-lock-icon">🔒</div>' +
        '<b>' + esc(moduleId || 'This module') + '</b>' +
        '<p>Not included in your current plan (' + esc(access.planName) + ').</p>' +
        '<button class="ws-btn" data-lock="plan">VIEW PLAN</button></div>';
    }
    return '<div class="ws-lock"><div class="ws-lock-icon">🛡️</div>' +
      '<b>PERSON-LEVEL DATA</b><p>Approval required from the Roots Administrator.</p>' +
      '<button class="ws-btn" data-lock="approval">REQUEST ACCESS</button></div>';
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-lock]') : null;
    if (!b) return;
    if (b.dataset.lock === 'plan') { ctx.go('access'); }
    else { ctx.go('access'); }
  });

  /* ---------- header identity (§4) ---------- */
  /* ---------- first-login welcome summary (Setup 4, gap G1) ---------- */
  (function welcomeGate() {
    var seen = Store.get('WELCOME_SEEN');
    /* normalise: Store.get defaults to [] and old runs may have stored an array */
    if (!seen || typeof seen !== 'object' || Array.isArray(seen)) seen = {};
    var orgKey = session.institutionId || session.applicationId || session.institutionName;
    if (seen[orgKey]) return;
    function wrow(k, vHtml) {
      return '<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.08);font-size:.82rem;">' +
        '<span style="min-width:140px;opacity:.65;">' + esc(k) + '</span><span>' + vHtml + '</span></div>';
    }
    var ds = access.datasets || [];
    var chips = ds.length
      ? ds.map(function (d) {
          return '<span style="display:inline-block;padding:2px 8px;margin:1px;border-radius:10px;background:rgba(0,0,0,.07);font-size:.72rem;">' + esc(d) + '</span>';
        }).join(' ')
      : '<span class="sub">None yet - request access in Access Centre.</span>';
    var ov = el(
      '<div id="wsWelcome" style="position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(20,24,18,.72);z-index:80;display:flex;align-items:center;justify-content:center;padding:16px;">' +
      '<div class="ws-panel" style="max-width:520px;width:100%;margin:0;">' +
      '<h3 style="margin-top:0;">Welcome to your workspace</h3>' +
      '<p class="sub" style="margin-top:-6px;">' + esc(access.institutionName) + ' &middot; ' + esc(typeInfo ? typeInfo.title : access.institutionType) + '</p>' +
      wrow('Signed in as', esc(session.adminName) + ' &middot; ' + esc(session.role || 'ADMINISTRATOR')) +
      wrow('Geographic scope', esc(access.scopeLabel)) +
      wrow('Plan', esc(access.planName) + (access.provisional ? ' <em>(provisional)</em>' : '')) +
      wrow('Person-level data', access.personLevelAllowed
        ? 'ALLOWED'
        : 'NOT ALLOWED' + (access.anonymizationRequired ? ' &middot; anonymised exports only' : '')) +
      wrow('Approved datasets', chips) +
      '<button class="ws-btn" id="wsWelcomeGo" style="margin-top:14px;width:100%;">ENTER WORKSPACE</button>' +
      '</div></div>');
    document.body.appendChild(ov);
    ov.querySelector('#wsWelcomeGo').addEventListener('click', function () {
      seen[orgKey] = new Date().toISOString();
      Store.set('WELCOME_SEEN', seen);
      Store.logOrgAudit('WELCOME_ACK', 'Session', session.adminName, {});
      ov.remove();
      toast('Signed in. Use the side menu to explore your workspace.');
    });
  })();

  (function renderIdentity() {
    $('wsOrgTitle').textContent = access.institutionName;
    $('wsOrgType').textContent = (typeInfo ? typeInfo.title : access.institutionType) + ' Workspace';
    $('wsUserChip').innerHTML =
      '<div class="av">' + esc((session.adminName || '?').slice(0, 1).toUpperCase()) + '</div>' +
      '<div class="who"><b>' + esc(session.adminName) + '</b>' +
      '<span>' + esc(session.role || 'ADMINISTRATOR') + ' · Scope: ' + esc(access.scopeLabel) + '</span></div>';
    $('wsPlanChip').textContent = access.planName;
    $('wsScopeChip').textContent = access.scopeLabel;

    if (access.provisional) {
      $('wsProvisional').textContent = '⏳ Provisional access — application ' + (session.applicationId || '') +
        ' is UNDER REVIEW. Formal approval will unlock additional modules.';
      $('wsProvisional').style.display = '';
    } else {
      $('wsProvisional').style.display = 'none';
    }
    if (access.accessStatus === 'SUSPENDED') {
      $('wsProvisional').textContent = '⛔ This account is suspended by the Roots Administrator.';
      $('wsProvisional').style.display = '';
    }
  })();

  /* ---------- offline / sync status (§50-51) ---------- */
  function pendingSubmissions() {
    var corr = Store.get('CORRECTIONS').filter(function (c) { return c.status === 'SUBMITTED'; }).length;
    var reqs = Store.readJson('roots_admin_access_requests', []).filter(function (r) {
      return r.status === 'PENDING' && r.applicationId === session.applicationId;
    }).length;
    return corr + reqs;
  }
  function renderSync() {
    var last = localStorage.getItem(Store.KEYS.LAST_SYNC) || '';
    var pending = pendingSubmissions();
    var pend = pending ? ' · ' + pending + ' submission' + (pending === 1 ? '' : 's') + ' pending' : '';
    if (navigator.onLine) {
      $('wsSyncChip').innerHTML = 'ONLINE · synced just now' + pend;
    } else {
      $('wsSyncChip').innerHTML = 'OFFLINE · last sync ' + esc(last ? fmtDateTime(last) : '—') + pend;
    }
  }
  window.addEventListener('online', renderSync);
  window.addEventListener('offline', renderSync);
  try { localStorage.setItem(Store.KEYS.LAST_SYNC, new Date().toISOString()); } catch (e) {}
  renderSync();

  /* ---------- notifications (§46, §52) — notices only, no chat ---------- */
  function computeAlerts() {
    var muted = Store.get('ORG_NOTIF_SETTINGS')[0] || {}; /* §66 per-workspace mute prefs */
    var out = [];
    var disputes = (window.PEOPLE || []).filter(function (p) { return p.sync && p.sync._disputed; }).length;
    if (disputes && muted.disputes !== false) out.push({ icon: '⚖️', msg: disputes + ' record(s) require review', go: 'disputes' });
    if (access.grantExpiry) {
      var days = Math.ceil((new Date(access.grantExpiry) - Date.now()) / 864e5);
      if (days > 0 && days <= 30 && muted.access !== false) out.push({ icon: '⏳', msg: 'Dataset access expires in ' + days + ' day(s)', go: 'access' });
      if (days <= 0 && muted.access !== false) out.push({ icon: '⛔', msg: 'Dataset access has expired', go: 'access' });
    }
    var corr = Store.get('CORRECTIONS').filter(function (c) { return c.status === 'SUBMITTED'; }).length;
    if (corr && muted.corrections !== false) out.push({ icon: '📝', msg: corr + ' data correction(s) submitted for review', go: access.can('inst.corrections.submit') ? 'records' : 'overview' });
    Store.get('NOTIFICATIONS').forEach(function (n) {
      if (n.applicationId && n.applicationId !== session.applicationId) return;
      if (muted.notices !== false) out.push({ icon: '🔔', msg: n.message, at: n.at });
    });
    return out;
  }

  $('wsBell').addEventListener('click', function () {
    var pop = $('wsNotifPop');
    var items = computeAlerts();
    pop.innerHTML = items.length
      ? items.map(function (a, i) {
        return '<button class="ws-notif-item" data-i="' + i + '"' + (a.go ? ' data-go="' + a.go + '"' : '') + '>' +
          '<b>' + a.icon + '</b> ' + esc(a.msg) + (a.at ? '<span class="when">' + esc(fmtDateTime(a.at)) + '</span>' : '') + '</button>';
      }).join('')
      : '<div class="ws-empty" style="padding:18px;">No notifications.</div>';
    pop.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { ctx.go(b.dataset.go); pop.classList.remove('open'); });
    });
    pop.classList.toggle('open');
  });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest || (!ev.target.closest('#wsNotifPop') && !ev.target.closest('#wsBell'))) {
      $('wsNotifPop').classList.remove('open');
    }
  });
  function updateBell() {
    var n = computeAlerts().length;
    $('wsBellCount').textContent = n;
    $('wsBellCount').style.display = n ? '' : 'none';
  }

  /* ---------- sign out ---------- */
  $('wsSignOut').addEventListener('click', function () {
    Store.logOrgAudit('SIGN_OUT', 'Session', session.adminName, {});
    try { localStorage.removeItem(KEYS.SESSION); } catch (e) {}
    location.href = 'institutional-login.html';
  });

  /* ---------- navigation (§48, §61) ---------- */
  function viewsById() {
    var map = {};
    window.RootsInstViews.forEach(function (v) { map[v.id] = v; });
    return map;
  }
  function visibleNav() {
    var map = viewsById();
    var out = [];
    typeCfg.navigation.forEach(function (id) {
      var v = map[id];
      if (!v) return;
      if (!access.can(v.perm || 'inst.overview')) return; /* hidden entirely (§48) */
      out.push(v);
    });
    return out;
  }
  function buildNavAndBottom() {
    var vis = visibleNav();
    var nav = $('wsNav');
    nav.innerHTML = '';
    vis.forEach(function (v) {
      var lockedModule = v.module && !access.hasModule(v.module);
      var b = el('<button type="button" id="wsNav-' + v.id + '" class="' + (lockedModule ? 'locked' : '') + '">' +
        '<span class="ico">' + v.icon + '</span>' + esc(v.label) + '</button>');
      b.addEventListener('click', function () {
        ctx.go(v.id);
        $('wsSidebar').classList.remove('open');
      });
      nav.appendChild(b);
    });

    /* Mobile bottom nav (§3): home, search, reports, contextual, org. */
    var bottomIds = ['overview', 'records', 'reports'];
    var extras = ['totems', 'projects', 'exports', 'lineage', 'collections'];
    for (var i = 0; i < extras.length && bottomIds.length < 4; i++) {
      if (vis.some(function (v) { return v.id === extras[i]; })) bottomIds.push(extras[i]);
    }
    bottomIds.push(vis.some(function (v) { return v.id === 'organisation'; }) ? 'organisation' : 'access');
    var bottom = $('wsBottomNav');
    bottom.innerHTML = '';
    bottomIds.forEach(function (id) {
      var v = viewsById()[id];
      if (!v) return;
      var b = el('<button type="button" data-bottom="' + v.id + '" title="' + esc(v.label) + '">' + v.icon + '</button>');
      b.addEventListener('click', function () { ctx.go(v.id); });
      bottom.appendChild(b);
    });
  }

  $('wsMenuBtn').addEventListener('click', function () {
    $('wsSidebar').classList.toggle('open');
  });

  /* ---------- router ---------- */
  function currentViewId() {
    var id = (location.hash || '').replace(/^#\//, '');
    if (!id) return typeCfg.defaultView;
    var vis = visibleNav();
    for (var i = 0; i < vis.length; i++) if (vis[i].id === id) return id;
    return typeCfg.defaultView;
  }
  window.addEventListener('hashchange', route);
  function route() {
    var id = currentViewId();
    var v = viewsById()[id];
    var host = $('wsView');
    host.innerHTML = '';
    document.querySelectorAll('#wsNav button').forEach(function (b) { b.classList.remove('active'); });
    var navBtn = $('wsNav-' + id);
    if (navBtn) navBtn.classList.add('active');
    document.querySelectorAll('[data-bottom]').forEach(function (b) { b.classList.toggle('active', b.dataset.bottom === id); });

    if (!v) { host.innerHTML = '<div class="ws-empty">Unknown workspace.</div>'; return; }

    if (!access.can(v.perm || 'inst.overview')) {
      host.innerHTML = '<div class="ws-empty">This area is not part of your role.</div>';
      return;
    }
    if (v.module && !access.hasModule(v.module) &&
      !(v.altModule && access.hasModule(v.altModule))) {
      host.innerHTML = lockCard('plan', v.moduleTitle || v.module);
      return;
    }
    try { v.render(host, ctx); }
    catch (err) {
      host.innerHTML = '<div class="ws-empty">Something went wrong rendering this view.</div>';
      if (window.console && console.error) console.error(err);
    }
    window.scrollTo(0, 0);
  }

  /* ---------- boot ---------- */
  buildNavAndBottom();
  updateBell();
  route();
})();
