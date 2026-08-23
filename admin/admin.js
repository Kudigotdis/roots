/* ============================================================
   ROOTS ADMINISTRATOR — console (Setup 3 §8-72).
   Single shell, hash-routed views, permission-gated actions,
   side-panel review workflows, confirmation + reason on danger,
   full audit trail. Demo/local storage backend.
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  var Store = window.RootsAdminStore;
  var Perms = window.RootsAdminPerms;
  var CFG = window.RootsInstConfig || {};
  var KEYS = Store.KEYS;

  /* ---------- boot ---------- */
  Store.seed();
  var session = Store.currentSession();
  if (!session) { location.replace('admin-login.html'); return; }
  try {
    if (window.RootsData && typeof RootsData.upgradeAll === 'function') RootsData.upgradeAll();
  } catch (e) {}

  /* ---------- tiny dom helpers ---------- */
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
  var BADGE_MAP = {
    ACTIVE: 'ok', VERIFIED: 'ok', APPROVED: 'ok', COMPLETED: 'ok', RESOLVED: 'ok',
    TRIAL: 'info', UNDER_REVIEW: 'warn', PENDING: 'warn', 'PENDING_APPROVAL': 'warn', NEEDS_INFORMATION: 'warn',
    SUSPENDED: 'bad', EXPIRED: 'bad', REJECTED: 'bad', CANCELLED: 'bad', PAST_DUE: 'bad'
  };
  function badge(status) {
    var s = String(status || '—').replace(/_/g, ' ');
    return '<span class="adm-badge ' + (BADGE_MAP[String(status).toUpperCase()] || 'dim') + '">' + esc(s) + '</span>';
  }
  function toast(msg) {
    var t = $('adminToast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function emptyState(icon, title, sub) {
    return '<div class="adm-empty"><span class="big">' + icon + '</span><b>' + esc(title) + '</b><br>' + esc(sub || '') + '</div>';
  }

  /* ---------- permission guard ---------- */
  function guard(permission, fn) {
    return function () {
      if (!Perms.hasAdminPermission(permission)) {
        Store.logAdminAction('PERMISSION_DENIED', 'Permission', permission, { result: 'FAILED' });
        toast('⛔ Your role (' + session.role + ') is not permitted to do this.');
        return;
      }
      return fn.apply(null, arguments);
    };
  }

  /* ---------- side panel ---------- */
  function openPanel(title, meta, bodyHtml) {
    $('adminPanelTitle').textContent = title;
    $('adminPanelMeta').textContent = meta || '';
    $('adminPanelBody').innerHTML = bodyHtml;
    $('adminPanelBox').classList.add('show');
    $('adminPanelOverlay').classList.add('show');
  }
  function closePanel() {
    $('adminPanelBox').classList.remove('show');
    $('adminPanelOverlay').classList.remove('show');
  }
  $('adminPanelClose').addEventListener('click', closePanel);
  $('adminPanelOverlay').addEventListener('click', closePanel);

  /* ---------- confirm modal (danger actions need reason, §54) ---------- */
  var confirmResolver = null;
  function confirmAction(title, descLines, okLabel) {
    $('adminConfirmTitle').textContent = title;
    $('adminConfirmDesc').textContent = descLines.join('\n');
    $('adminConfirmOk').textContent = okLabel || 'CONFIRM';
    $('adminConfirmReason').value = '';
    $('adminConfirmWrap').classList.add('show');
    return new Promise(function (resolve) { confirmResolver = resolve; });
  }
  $('adminConfirmCancel').addEventListener('click', function () {
    $('adminConfirmWrap').classList.remove('show');
    if (confirmResolver) confirmResolver({ ok: false, reason: '' });
    confirmResolver = null;
  });
  $('adminConfirmOk').addEventListener('click', function () {
    var reason = $('adminConfirmReason').value.trim();
    if (!reason) { toast('A reason is required for high-impact actions.'); return; }
    $('adminConfirmWrap').classList.remove('show');
    if (confirmResolver) confirmResolver({ ok: true, reason: reason });
    confirmResolver = null;
  });

  /* ---------- csv helper (Setup 3 §71) ---------- */
  function downloadCsv(filename, headers, rows) {
    var csv = headers.join(',') + '\n' + rows.map(function (r) {
      return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  /* ============================================================
     VIEW REGISTRY
     ============================================================ */
  var P = Perms.PERMISSIONS;
  var VIEWS = [
    { id: 'overview', label: 'Overview', icon: '📊', perm: P.DASHBOARD_VIEW, render: renderOverview },
    { id: 'institutions', label: 'Institutions', icon: '🏛️', perm: P.INSTITUTIONS_READ, render: renderInstitutions },
    { id: 'applications', label: 'Applications', icon: '📥', perm: P.APPLICATIONS_READ, render: renderApplications, countKey: 'pendingApplications' },
    { id: 'users', label: 'Users', icon: '👥', perm: P.USERS_READ, render: renderUsers },
    { id: 'access', label: 'Access Requests', icon: '🔑', perm: P.ACCESS_READ, render: renderAccess, countKey: 'accessRequests' },
    { id: 'products', label: 'Products', icon: '📦', perm: P.PRODUCTS_READ, render: renderProducts },
    { id: 'subscriptions', label: 'Subscriptions', icon: '💳', perm: P.SUBSCRIPTIONS_READ, render: renderSubscriptions },
    { id: 'datasets', label: 'Dataset Governance', icon: '🗂️', perm: P.SYSTEM_MANAGE, render: renderDatasets },
    { id: 'disputes', label: 'Dispute Centre', icon: '⚖️', perm: P.DISPUTES_READ, render: renderDisputes, countKey: 'disputes' },
    { id: 'imports', label: 'Import Centre', icon: '📥', perm: P.IMPORTS_READ, render: renderImports },
    { id: 'exports', label: 'Export Centre', icon: '📤', perm: P.EXPORTS_READ, render: renderExports },
    { id: 'audit', label: 'Audit Centre', icon: '🧾', perm: P.AUDIT_READ, render: renderAudit },
    { id: 'geography', label: 'Geography', icon: '🗺️', perm: P.GEOGRAPHY_MANAGE, render: renderGeography },
    { id: 'schools', label: 'Schools', icon: '🏫', perm: P.SCHOOLS_MANAGE, render: renderSchools },
    { id: 'library', label: 'Cultural Library', icon: '📚', perm: P.LIBRARY_MANAGE, render: renderLibrary },
    { id: 'system', label: 'System Settings', icon: '⚙️', perm: P.SYSTEM_MANAGE, render: renderSystem }
  ];

  function counts() {
    return {
      pendingApplications: Store.getPendingApplicationCount(),
      accessRequests: Store.getPendingAccessRequestCount(),
      disputes: Store.getOpenDisputeCount()
    };
  }

  /* ---------- sidebar + header ---------- */
  function buildNav() {
    var c = counts();
    var ul = $('adminNav');
    ul.innerHTML = '';
    VIEWS.forEach(function (v) {
      var allowed = Perms.hasAdminPermission(v.perm);
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'adminNav-' + v.id;
      if (!allowed) b.className = 'locked';
      b.innerHTML = v.icon + ' ' + esc(v.label) +
        (allowed && v.countKey && c[v.countKey] ? ' <span class="n-count">' + c[v.countKey] + '</span>' : '');
      b.addEventListener('click', function () {
        if (!allowed) { toast('Your role does not include "' + v.label + '".'); return; }
        location.hash = '#/' + v.id;
        $('adminSidebar').classList.remove('open');
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  function buildHeader() {
    $('adminUserChip').innerHTML =
      '<div class="av">' + esc((session.name || '?').slice(0, 1).toUpperCase()) + '</div>' +
      '<div class="who"><b>' + esc(session.name) + '</b><span>' + esc(session.role) + '</span></div>';
    updateBell();
  }

  function updateBell() {
    var c = counts();
    var total = c.pendingApplications + c.accessRequests + c.disputes;
    $('adminBellCount').textContent = total;
    $('adminBellCount').style.display = total ? '' : 'none';
  }

  $('adminBell').addEventListener('click', function () {
    var pop = $('adminNotifPop');
    var c = counts();
    var rows = [
      ['pendingApplications', 'Applications', '📥', 'applications'],
      ['accessRequests', 'Data access requests', '🔑', 'access'],
      ['disputes', 'Open disputes', '⚖️', 'disputes']
    ].filter(function (r) { return c[r[0]]; });
    pop.innerHTML = rows.length
      ? rows.map(function (r) {
          return '<button class="adm-notif-item" data-go="' + r[3] + '"><b>' + r[2] + ' ' + c[r[0]] + '</b> ' + esc(r[1]) + '</button>';
        }).join('')
      : '<div class="adm-empty" style="padding:18px;">No outstanding notifications.</div>';
    pop.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = '#/' + b.dataset.go; pop.classList.remove('show'); });
    });
    pop.classList.toggle('show');
  });

  $('adminMenuBtn').addEventListener('click', function () {
    $('adminSidebar').classList.toggle('open');
  });

  $('adminLogout').addEventListener('click', function () {
    Store.logAdminAction('ADMIN_LOGOUT', 'AdminSession', session.adminId, {});
    try { localStorage.removeItem(KEYS.SESSION); } catch (e) {}
    location.replace('admin-login.html');
  });

  /* ============================================================
     ROUTER
     ============================================================ */
  function currentView() {
    var id = (location.hash || '').replace(/^#\//, '') || 'overview';
    var v = VIEWS.filter(function (x) { return x.id === id; })[0];
    if (!v || !Perms.hasAdminPermission(v.perm)) return VIEWS[0];
    return v;
  }
  window.addEventListener('hashchange', route);
  function route() {
    var v = currentView();
    VIEWS.forEach(function (x) {
      var b = $('adminNav-' + x.id);
      if (b) b.classList.toggle('active', x.id === v.id);
    });
    var host = $('adminView');
    host.innerHTML = '';
    v.render(host);
    window.scrollTo(0, 0);
  }

  function toolbarHtml(opts) {
    return '<div class="adm-toolbar">' +
      '<input type="text" class="adm-input" placeholder="Search…" style="flex:1;min-width:180px;">' +
      (opts.selects || '') + '</div>';
  }
  function bindToolbar(host, onChange) {
    var wrap = host.querySelector('.adm-toolbar');
    if (!wrap) return function () { return {}; };
    wrap.querySelectorAll('input,select').forEach(function (inp) {
      inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', onChange);
    });
    return function () {
      var vals = {};
      wrap.querySelectorAll('input,select').forEach(function (inp) { vals[inp.placeholder || inp.getAttribute('placeholder') || inp.name] = inp.value; });
      return vals;
    };
  }

  /* ============================================================
     OVERVIEW (§9-11)
     ============================================================ */
  function renderOverview(host) {
    var c = counts();
    var metrics = [
      ['Institutions', Store.getInstitutionCount(), ''],
      ['Pending applications', c.pendingApplications, c.pendingApplications ? 'alert' : ''],
      ['Active institutional users', Store.getActiveInstitutionUserCount(), ''],
      ['Access requests', c.accessRequests, c.accessRequests ? 'alert' : ''],
      ['Disputes', c.disputes, c.disputes ? 'bad' : ''],
      ['Active subscriptions', Store.getActiveSubscriptionCount(), ''],
      ['Exports this month', Store.getMonthlyExportCount(), ''],
      ['Suspended accounts', Store.getSuspendedInstitutionCount(), Store.getSuspendedInstitutionCount() ? 'bad' : '']
    ];
    host.innerHTML =
      '<div class="adm-cards">' +
      metrics.map(function (m) {
        return '<div class="adm-card ' + m[2] + '"><div class="k">' + esc(m[0]) + '</div><div class="v">' + m[1] + '</div></div>';
      }).join('') + '</div>' +
      '<div class="adm-panel"><h3>Needs attention</h3><div id="ovAttention"></div></div>' +
      '<div class="adm-panel"><h3>Recent administrative activity</h3><div id="ovActivity"></div></div>';

    var attRows = [
      [c.pendingApplications, 'institution applications awaiting review', 'applications'],
      [c.accessRequests, 'data access requests', 'access'],
      [c.disputes, 'disputed records', 'disputes'],
      [Store.readJson(KEYS.PENDING_SCHOOLS, []).filter(function (s) { return s.status === 'PENDING'; }).length, 'school submissions to verify', 'schools'],
      [Store.readJson(KEYS.SUBSCRIPTIONS, []).filter(function (s) { return s.status === 'PAST_DUE' || s.status === 'EXPIRED'; }).length, 'subscription issues', 'subscriptions'],
      [Store.getSuspendedInstitutionCount(), 'suspended organisations', 'institutions']
    ];
    var attHost = host.querySelector('#ovAttention');
    attHost.innerHTML = attRows.filter(function (r) { return r[0]; }).map(function (r) {
      return '<button class="attention-row" data-go="' + r[2] + '"><span class="num">' + r[0] + '</span> ' + esc(r[1]) + '<span class="arrow">→</span></button>';
    }).join('') || emptyState('✅', 'Nothing needs attention', 'All queues are clear.');
    attHost.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = '#/' + b.dataset.go; });
    });

    var log = Store.readJson(KEYS.AUDIT, []).slice(0, 8);
    host.querySelector('#ovActivity').innerHTML = log.length
      ? '<div class="adm-tablewrap"><table class="adm-table"><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Result</th></tr></thead><tbody>' +
        log.map(function (a) {
          return '<tr><td class="mono">' + fmtDateTime(a.createdAt) + '</td><td>' + esc(a.adminName) + '</td><td>' + esc(a.action) + '</td><td class="mono">' + esc(a.targetId) + '</td><td>' + (a.result === 'SUCCESS' ? '<span class="adm-badge ok">SUCCESS</span>' : '<span class="adm-badge bad">FAILED</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : emptyState('🧾', 'No administrative activity yet', 'Actions taken in this console will be logged here.');
    updateBell();
  }

  /* ============================================================
     INSTITUTIONS (§12-15)
     ============================================================ */
  function renderInstitutions(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Institutions</h2>' +
      toolbarHtml({ selects:
        '<select class="adm-select" placeholder="fType"><option value="">Type</option>' + (CFG.TYPES || []).map(function (t) { return '<option value="' + t.code + '">' + esc(t.title) + '</option>'; }).join('') + '</select>' +
        '<select class="adm-select" placeholder="fStatus"><option value="">Status</option><option>ACTIVE</option><option>SUSPENDED</option></select>' +
        '<select class="adm-select" placeholder="fVerify"><option value="">Verification</option><option>VERIFIED</option><option>PENDING</option></select>'
      }) +
      '<div id="instTable"></div>';
    var getVals = bindToolbar(host, draw);

    function draw() {
      var v = getVals();
      var q = (v.Search || '').toLowerCase();
      var rows = Store.readJson(KEYS.INSTITUTIONS, []).filter(function (i) {
        if (v.fType && i.type !== v.fType) return false;
        if (v.fStatus && i.status !== v.fStatus) return false;
        if (v.fVerify && i.verificationStatus !== v.fVerify) return false;
        if (q && i.name.toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      var target = host.querySelector('#instTable');
      if (!rows.length) { target.innerHTML = emptyState('🏛️', 'No institutions match', 'Adjust the filters or approve an application.'); return; }
      target.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
        '<th>Organisation</th><th>Type</th><th>Users</th><th>Plan</th><th>Verification</th><th>Status</th><th>Last activity</th></tr></thead><tbody>' +
        rows.map(function (i) {
          var t = (CFG.TYPES || []).filter(function (x) { return x.code === i.type; })[0];
          return '<tr class="rowlink" data-id="' + esc(i.institutionId) + '">' +
            '<td><b>' + esc(i.name) + '</b><span class="sub mono">' + esc(i.institutionId) + '</span></td>' +
            '<td>' + esc(t ? t.title : i.type || '—') + '</td>' +
            '<td>' + i.userCount + '</td><td>' + esc(i.subscriptionStatus) + '</td>' +
            '<td>' + badge(i.verificationStatus) + '</td><td>' + badge(i.status) + '</td>' +
            '<td class="mono">' + fmtDate(i.lastActivityAt) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      target.querySelectorAll('tr.rowlink').forEach(function (tr) {
        tr.addEventListener('click', function () { institutionDetail(tr.dataset.id); });
      });
    }
    draw();
  }

  function institutionDetail(id) {
    var inst = Store.readJson(KEYS.INSTITUTIONS, []).filter(function (i) { return i.institutionId === id; })[0];
    if (!inst) return;
    var grants = Store.readJson(KEYS.GRANTS, []).filter(function (g) { return g.institutionId === id; });
    var subs = Store.readJson(KEYS.SUBSCRIPTIONS, []).filter(function (s) { return s.institutionId === id; });
    var users = Store.readJson(KEYS.USERS, []).filter(function (u) { return u.institutionId === id; });
    var canManage = Perms.hasAdminPermission(P.INSTITUTIONS_SUSPEND);
    var canEdit = Perms.hasAdminPermission(P.INSTITUTIONS_EDIT);

    openPanel(inst.name, inst.institutionId + ' · ' + inst.status + ' · ' + inst.verificationStatus,
      '<div class="adm-kv">' +
      kv('Type', esc(((CFG.TYPES || []).filter(function (t) { return t.code === inst.type; })[0] || {}).title || inst.type)) +
      kv('Country', esc(inst.country)) +
      kv('Users', String(users.length || inst.userCount)) +
      kv('Modules', esc((inst.purchasedModules || []).join(', ') || 'CORE')) +
      kv('Geographic scope', esc(inst.geographicScope || '—')) +
      kv('Subscription', esc(subs[0] ? subs[0].product + ' · ' + subs[0].status : inst.subscriptionStatus)) +
      kv('Last activity', fmtDateTime(inst.lastActivityAt)) +
      '</div>' +
      '<div class="adm-section-title">Access grants</div>' +
      (grants.length ? grants.map(function (g) {
        return '<div class="hint adm-hint">' + badge(g.status) + ' <b class="mono">' + esc(g.grantId) + '</b> · scope ' + esc(g.accessScope) +
          ' · person-level ' + (g.personLevelAllowed ? 'ALLOWED' : 'NOT ALLOWED') + ' · expires ' + fmtDate(g.expiresAt) + '</div>';
      }).join('') : '<div class="adm-hint">No grants recorded.</div>') +
      '<div class="adm-actions">' +
      (canManage && inst.status === 'ACTIVE' ? '<button class="adm-btn adm-btn-danger adm-btn-sm" data-act="suspend">Suspend institution</button>' : '') +
      (canManage && inst.status === 'SUSPENDED' ? '<button class="adm-btn adm-btn-sm" data-act="reactivate">Reactivate</button>' : '') +
      (canEdit ? '<button class="adm-btn adm-btn-ghost adm-btn-sm" data-act="verify">Change verification</button>' : '') +
      '<button class="adm-btn adm-btn-ghost adm-btn-sm" data-act="users">View users</button>' +
      '</div>');

    $('adminPanelBody').querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () { institutionAction(b.dataset.act, inst); });
    });

    function kv(k, v) { return '<span class="k">' + k + '</span><span class="v">' + v + '</span>'; }
  }

  var institutionAction = guard(P.INSTITUTIONS_SUSPEND, function (act, inst) {
    if (act === 'suspend') {
      confirmAction('Suspend institution',
        ['This will:', '· Block all institutional users from the workspace', '· Stop active access grants and exports', '· Preserve historical audit records'],
        'SUSPEND').then(function (r) {
          if (!r.ok) return;
          var before = inst.status;
          inst.status = 'SUSPENDED';
          saveInstitution(inst);
          Store.logAdminAction('SUSPEND_INSTITUTION', 'Institution', inst.institutionId, { before: before, after: 'SUSPENDED', reason: r.reason });
          toast('Institution suspended.');
          route(); institutionDetail(inst.institutionId);
        });
    } else if (act === 'reactivate') {
      confirmAction('Reactivate institution', ['Workspace access and grants become functional again.'], 'REACTIVATE').then(function (r) {
        if (!r.ok) return;
        inst.status = 'ACTIVE';
        saveInstitution(inst);
        Store.logAdminAction('REACTIVATE_INSTITUTION', 'Institution', inst.institutionId, { after: 'ACTIVE', reason: r.reason });
        toast('Institution reactivated.');
        route(); institutionDetail(inst.institutionId);
      });
    } else if (act === 'verify') {
      var order = ['UNVERIFIED', 'PENDING', 'VERIFIED'];
      var ix = order.indexOf(inst.verificationStatus);
      inst.verificationStatus = order[(ix + 1) % order.length];
      saveInstitution(inst);
      Store.logAdminAction('CHANGE_VERIFICATION', 'Institution', inst.institutionId, { after: inst.verificationStatus });
      toast('Verification: ' + inst.verificationStatus);
      route(); institutionDetail(inst.institutionId);
    } else if (act === 'users') {
      closePanel(); location.hash = '#/users';
    }
  });

  function saveInstitution(updated) {
    var all = Store.readJson(KEYS.INSTITUTIONS, []);
    var ix = -1;
    for (var i = 0; i < all.length; i++) if (all[i].institutionId === updated.institutionId) ix = i;
    if (ix !== -1) { updated.lastActivityAt = new Date().toISOString(); all[ix] = updated; }
    Store.writeJson(KEYS.INSTITUTIONS, all);
  }

  /* ============================================================
     APPLICATIONS (§16-20, §65-66)
     ============================================================ */
  var appTab = 'UNDER REVIEW';
  function renderApplications(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Institution applications</h2>' +
      '<div class="adm-tabs" id="appTabs"></div><div id="appTable"></div>';
    var tabs = [
      ['UNDER REVIEW', 'Under Review'], ['NEEDS_INFORMATION', 'Needs Information'],
      ['ACTIVE', 'Approved'], ['REJECTED', 'Rejected'], ['SUSPENDED', 'Suspended']
    ];
    function drawTabs() {
      var apps = Store.institutionalApplications();
      host.querySelector('#appTabs').innerHTML = tabs.map(function (t) {
        var n = apps.filter(function (a) { return normAppStatus(a.status) === t[0]; }).length;
        return '<button data-tab="' + t[0] + '" class="' + (appTab === t[0] ? 'active' : '') + '">' + t[1] + '<span class="tcount">' + n + '</span></button>';
      }).join('');
      host.querySelectorAll('#appTabs button').forEach(function (b) {
        b.addEventListener('click', function () { appTab = b.dataset.tab; drawTabs(); drawTable(); });
      });
    }
    function drawTable() {
      var apps = Store.institutionalApplications().filter(function (a) { return normAppStatus(a.status) === appTab; });
      var target = host.querySelector('#appTable');
      if (!apps.length) {
        target.innerHTML = emptyState('📥', 'No ' + appTab.replace(/_/g, ' ').toLowerCase() + ' applications',
          appTab === 'UNDER REVIEW' ? 'New institutional applications will appear here.' : '');
        return;
      }
      target.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
        '<th>Application ID</th><th>Organisation</th><th>Type</th><th>Applicant</th><th>Requested modules</th><th>Submitted</th><th>Status</th></tr></thead><tbody>' +
        apps.map(function (a) {
          var t = (CFG.TYPES || []).filter(function (x) { return x.code === a.typeCode; })[0];
          return '<tr class="rowlink" data-id="' + esc(a.applicationId) + '">' +
            '<td class="mono">' + esc(a.applicationId) + '</td>' +
            '<td><b>' + esc(a.organisation && a.organisation.name) + '</b><span class="sub">' + esc((a.location || {}).city || '') + '</span></td>' +
            '<td>' + esc(t ? t.title : a.typeCode) + '</td>' +
            '<td>' + esc(a.primaryAdmin && a.primaryAdmin.name) + '</td>' +
            '<td class="mono">' + esc((a.modules || []).join(', ')) + '</td>' +
            '<td class="mono">' + fmtDate(a.submittedAt) + '</td><td>' + badge(normAppStatus(a.status)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      target.querySelectorAll('tr.rowlink').forEach(function (tr) {
        tr.addEventListener('click', function () { applicationDetail(tr.dataset.id); });
      });
    }
    drawTabs(); drawTable();
  }
  function normAppStatus(s) {
    if (s === 'ACTIVE') return 'ACTIVE';
    return (['UNDER REVIEW', 'NEEDS_INFORMATION', 'REJECTED', 'SUSPENDED'].indexOf(s) !== -1) ? s : 'UNDER REVIEW';
  }

  function applicationDetail(appId) {
    var app = Store.institutionalApplications().filter(function (a) { return a.applicationId === appId; })[0];
    if (!app) return;
    var meta = Store.readJson(KEYS.APPLICATION_META, {})[appId] || {};
    var org = app.organisation || {};
    var loc = app.location || {};
    var adminUser = app.primaryAdmin || {};

    openPanel('Institution application', appId + ' · ' + normAppStatus(app.status),
      sectionTitle('Organisation') +
      '<div class="adm-kv">' + kv('Name', esc(org.name)) + kv('Short name', esc(org.shortName)) +
      kv('WhatsApp', esc(org.whatsappCountry + ' ' + org.whatsapp)) + kv('Email', esc(org.email || '—')) +
      kv('Website', esc(org.website || '—')) + conditionalRows(org.conditional) + '</div>' +
      sectionTitle('Purpose') +
      '<div class="adm-kv">' + kv('Selected', esc((app.purpose || []).join(', ') || '—')) + kv('Description', esc(app.purposeDescription || '—')) + '</div>' +
      sectionTitle('Physical location') +
      '<div class="adm-kv">' + kv('Country', esc(loc.country)) + kv('Province / region', esc(loc.region)) +
      kv('District', esc(loc.district || '—')) + kv('City / town', esc(loc.city)) + kv('Area', esc(loc.area || '—')) + '</div>' +
      sectionTitle('Geographic scope') + '<div class="adm-kv">' + kv('Scope', esc(scopeText(app.geographicScope))) + '</div>' +
      sectionTitle('Requested data & modules') +
      '<div class="adm-kv">' + kv('Data groups', esc(Object.keys(app.dataAccess || {}).join(', ') || 'None')) +
      kv('Modules', esc((app.modules || []).join(', '))) + '</div>' +
      sectionTitle('Primary administrator') +
      '<div class="adm-kv">' + kv('Name', esc(adminUser.name)) + kv('WhatsApp', esc(adminUser.whatsappCountry + ' ' + adminUser.whatsapp)) +
      kv('Job title', esc(adminUser.jobTitle || '—')) + kv('Email', esc(adminUser.email || '—')) + '</div>' +
      sectionTitle('Staff invited') +
      ((app.staff || []).length ? '<ul style="margin:4px 0;padding-left:18px;font-size:0.83rem;">' + app.staff.map(function (s) {
        return '<li>' + esc(s.name) + ' — ' + esc(s.role) + '</li>';
      }).join('') + '</ul>' : '<div class="adm-hint">No staff invited.</div>') +
      (meta.rejectionReason ? sectionTitle('Rejection reason') + '<div class="adm-hint">' + esc(meta.rejectionReason) + '</div>' : '') +
      (meta.infoRequest ? sectionTitle('Information requested') + '<div class="adm-hint">' + esc(meta.infoRequest.message) + '</div>' : '') +
      sectionTitle('Review history') +
      ((meta.history || []).length ? '<ul style="margin:4px 0;padding-left:18px;font-size:0.78rem;color:var(--ad-dim);">' +
        meta.history.map(function (h) { return '<li>' + fmtDateTime(h.at) + ' · ' + esc(h.from) + ' → ' + esc(h.to) + '</li>'; }).join('') + '</ul>'
        : '<div class="adm-hint">Not yet reviewed.</div>') +
      '<div class="adm-actions" id="appActions"></div>');

    var acts = $('adminPanelBody').querySelector('#appActions');
    if (normAppStatus(app.status) === 'UNDER REVIEW') {
      if (Perms.hasAdminPermission(P.APPLICATIONS_APPROVE)) {
        acts.appendChild(el('<button class="adm-btn" data-a="approve">APPROVE</button>'));
      }
      if (Perms.hasAdminPermission(P.APPLICATIONS_REVIEW)) {
        acts.appendChild(el('<button class="adm-btn adm-btn-ghost" data-a="info">REQUEST INFORMATION</button>'));
      }
      if (Perms.hasAdminPermission(P.APPLICATIONS_REJECT)) {
        acts.appendChild(el('<button class="adm-btn adm-btn-danger" data-a="reject">REJECT</button>'));
      }
      acts.querySelectorAll('[data-a]').forEach(function (b) {
        b.addEventListener('click', function () { applicationAction(b.dataset.a, app); });
      });
    } else {
      acts.innerHTML = '<span class="adm-hint">This application has been processed.</span>';
    }

    function kv(k, v) { return '<span class="k">' + k + '</span><span class="v">' + v + '</span>'; }
    function sectionTitle(t) { return '<div class="adm-section-title">' + t + '</div>'; }
    function conditionalRows(cond) {
      cond = cond || {};
      var keys = Object.keys(cond).filter(function (k) { return cond[k]; });
      return keys.map(function (k) { return kv(esc(k), esc(cond[k])); }).join('');
    }
  }

  function scopeText(gs) {
    if (!gs) return '—';
    if (gs.level === 'scopeNational') return 'Zimbabwe — National';
    if (gs.level === 'scopeMultiCountry') return 'Countries: ' + (gs.countries || []).join(', ');
    if (gs.level === 'scopeProvince') return 'Provinces: ' + (gs.provinces || []).join(', ');
    if (gs.level === 'scopeDistrict') return 'Districts: ' + (gs.districts || []).join(', ');
    return gs.textValues || gs.level || '—';
  }

  function applicationAction(act, app) {
    if (act === 'approve') {
      var requestedModules = (app.modules || []).slice();
      openPanel('Approve application', app.applicationId,
        '<p class="adm-hint">Approval creates: Institution (VERIFIED) · Membership (ACTIVE) · Access grant · Subscription (ACTIVE).</p>' +
        '<div class="adm-field"><label for="apprScope">Access scope</label><select class="adm-input" id="apprScope">' +
        (CFG.SCOPE_LEVELS || []).map(function (l) { return '<option value="' + l.code + '">' + esc(l.label) + '</option>'; }).join('') + '</select></div>' +
        '<div class="adm-field"><label>Modules</label><div id="apprModules">' +
        (CFG.MODULE_SUITES || []).map(function (m) {
          var on = requestedModules.indexOf(m.id) !== -1;
          return '<label class="adm-check"><input type="checkbox" value="' + esc(m.id) + '"' + (on ? ' checked' : '') + '> ' + esc(m.title) + '</label>';
        }).join('') + '</div></div>' +
        '<div class="adm-field"><label>Person-level data</label><div class="adm-radio-row">' +
        '<label><input type="radio" name="apprPL" value="no" checked> Not allowed</label>' +
        '<label><input type="radio" name="apprPL" value="yes"> Allowed</label></div></div>' +
        '<div class="adm-field"><label>Anonymization</label><div class="adm-radio-row">' +
        '<label><input type="radio" name="apprAnon" value="yes" checked> Required</label>' +
        '<label><input type="radio" name="apprAnon" value="no"> Not required</label></div></div>' +
        '<div class="adm-form-grid"><div class="adm-field"><label for="apprExpiry">Expiry</label>' +
        '<input class="adm-input" type="date" id="apprExpiry" value="' + new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10) + '"></div></div>' +
        '<div class="adm-field"><label for="apprNote">Reviewer note</label>' +
        '<textarea class="adm-textarea" id="apprNote" rows="2" placeholder="Visible in audit history"></textarea></div>' +
        '<div class="adm-actions"><button class="adm-btn" id="apprGo">APPROVE</button>' +
        '<button class="adm-btn adm-btn-ghost" id="apprCancel">CANCEL</button></div>');
      $('apprGo').addEventListener('click', function () {
        var modules = [];
        $('apprModules').querySelectorAll('input:checked').forEach(function (cb) { modules.push(cb.value); });
        if (!modules.length) modules = ['CORE'];
        var result = Store.approveApplication(app.applicationId, {
          accessScope: $('apprScope').value,
          modules: modules,
          personLevel: document.querySelector('input[name="apprPL"]:checked').value === 'yes',
          anonymization: document.querySelector('input[name="apprAnon"]:checked').value === 'yes',
          expiry: $('apprExpiry').value ? new Date($('apprExpiry').value).toISOString() : null,
          reviewerNote: $('apprNote').value.trim()
        });
        toast('Application approved — workspace unlocked for ' + (result.institution.name));
        route(); applicationDetail(app.applicationId);
      });
      $('apprCancel').addEventListener('click', closePanel);
    } else if (act === 'info') {
      var msg = prompt('Message to applicant:');
      if (msg == null) return;
      var fields = [];
      ['Organisation', 'Purpose', 'Geographic scope', 'Requested data', 'Administrator'].forEach(function (f) {
        if (confirm('Need clarification on: ' + f + '?')) fields.push(f);
      });
      Store.requestApplicationInfo(app.applicationId, msg || '(no message)', fields);
      toast('Marked NEEDS_INFORMATION.');
      route(); applicationDetail(app.applicationId);
    } else if (act === 'reject') {
      var reason = prompt('Reason for rejection:');
      if (reason == null) return;
      reason = reason.trim();
      if (!reason) { toast('A rejection reason is required.'); return; }
      Store.rejectApplication(app.applicationId, reason);
      toast('Application rejected.');
      route(); applicationDetail(app.applicationId);
    }
  }

  /* ============================================================
     USERS (§21-22)
     ============================================================ */
  function renderUsers(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Institutional users</h2>' +
      toolbarHtml({ selects:
        '<select class="adm-select" placeholder="uRole"><option value="">Role</option><option>Administrator</option><option>Researcher</option><option>Archivist</option><option>Data Officer</option></select>' +
        '<select class="adm-select" placeholder="uStatus"><option value="">Membership</option><option>ACTIVE</option><option>SUSPENDED</option><option>PENDING_INVITE</option></select>'
      }) + '<div id="userTable"></div>';
    var getVals = bindToolbar(host, draw);

    function allUsers() {
      var users = Store.readJson(KEYS.USERS, []).slice();
      Store.institutionalAccounts().forEach(function (acc) {
        /* The live account record supersedes any static copy of the same
           person, so suspensions target the real login (Setup 3 §55). */
        var acctUser = {
          userId: 'ACCT-' + acc.applicationId, name: acc.adminName,
          institutionId: acc.applicationId, institutionName: acc.institutionName,
          role: 'Administrator', whatsapp: '+' + acc.adminWhatsappDigits,
          membership: acc.status === 'ACTIVE' && !Store.isUserSuspended(acc.applicationId, acc.adminName) ? 'ACTIVE' : 'SUSPENDED',
          lastLogin: null, accountId: true
        };
        var dupeIx = -1;
        users.forEach(function (u, ix) {
          if (dupeIx !== -1) return;
          if (u.institutionId === acc.applicationId ||
            (u.institutionName === acc.institutionName &&
              String(u.name).toLowerCase() === String(acc.adminName).toLowerCase() &&
              u.role === 'Administrator')) dupeIx = ix;
        });
        if (dupeIx === -1) users.push(acctUser);
        else users[dupeIx] = acctUser;
      });
      Store.institutionalApplications().forEach(function (app) {
        (app.staff || []).forEach(function (s, i) {
          if (!s.name) return;
          users.push({
            userId: 'INV-' + app.applicationId + '-' + i, name: s.name,
            institutionId: app.applicationId, institutionName: app.organisation ? app.organisation.name : '',
            role: s.role, whatsapp: '+' + Store.digits(s.whatsapp),
            membership: 'PENDING_INVITE', lastLogin: null
          });
        });
      });
      return users;
    }

    function draw() {
      var v = getVals();
      var q = (v.Search || '').toLowerCase();
      var rows = allUsers().filter(function (u) {
        if (v.uRole && u.role !== v.uRole) return false;
        if (v.uStatus && u.membership !== v.uStatus) return false;
        if (q && (u.name.toLowerCase().indexOf(q) === -1 && u.institutionName.toLowerCase().indexOf(q) === -1)) return false;
        return true;
      });
      var target = host.querySelector('#userTable');
      if (!rows.length) { target.innerHTML = emptyState('👥', 'No users match', 'Users appear when institutions are approved or invite staff.'); return; }
      target.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
        '<th>Name</th><th>Institution</th><th>Role</th><th>WhatsApp</th><th>Status</th><th>Last login</th></tr></thead><tbody>' +
        rows.map(function (u, i) {
          return '<tr class="rowlink" data-i="' + i + '">' +
            '<td><b>' + esc(u.name) + '</b><span class="sub mono">' + esc(u.userId) + '</span></td>' +
            '<td>' + esc(u.institutionName) + '</td><td>' + esc(u.role) + '</td><td class="mono">' + esc(u.whatsapp) + '</td>' +
            '<td>' + badge(u.membership) + '</td><td class="mono">' + fmtDateTime(u.lastLogin) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var cache = rows;
      target.querySelectorAll('tr.rowlink').forEach(function (tr) {
        tr.addEventListener('click', function () { userDetail(cache[+tr.dataset.i]); });
      });
    }
    draw();
    renderUsers._all = allUsers;
  }

  function userDetail(user) {
    var canManage = Perms.hasAdminPermission(P.USERS_MANAGE);
    openPanel(user.name, user.institutionName + ' · ' + user.role,
      '<div class="adm-kv">' +
      kv('Membership', badge(user.membership)) +
      kv('WhatsApp', esc(user.whatsapp)) +
      kv('Last login', fmtDateTime(user.lastLogin)) +
      '</div>' +
      '<div class="adm-section-title">Memberships</div>' +
      '<div class="adm-hint">' + esc(user.institutionName) + ' — ' + esc(user.role) + ' · ' + user.membership + '</div>' +
      '<div class="adm-actions" id="userActs"></div>');
    var acts = $('adminPanelBody').querySelector('#userActs');
    if (canManage) {
      if (user.membership === 'ACTIVE') {
        acts.appendChild(el('<button class="adm-btn adm-btn-danger adm-btn-sm">Suspend user</button>')).addEventListener('click', function () {
          confirmAction('Suspend user', ['· This user loses workspace access', '· The institution and other staff remain active'], 'SUSPEND').then(function (r) {
            if (!r.ok) return;
            Store.setUserSuspension(user.accountId ? user.institutionId : null, user.accountId ? findAdminNameFor(user) : '', true, r.reason);
            if (!user.accountId) setUserMembership(user, 'SUSPENDED', r.reason);
            toast('User suspended.');
            route(); closePanel();
          });
        });
      } else if (user.membership === 'SUSPENDED') {
        acts.appendChild(el('<button class="adm-btn adm-btn-sm">Restore user</button>')).addEventListener('click', function () {
          confirmAction('Restore user', ['Workspace membership becomes ACTIVE again.'], 'RESTORE').then(function (r) {
            if (!r.ok) return;
            Store.setUserSuspension(user.accountId ? user.institutionId : null, user.accountId ? findAdminNameFor(user) : '', false, r.reason);
            if (!user.accountId) setUserMembership(user, 'ACTIVE', r.reason);
            toast('User restored.');
            route(); closePanel();
          });
        });
      }
      acts.appendChild(el('<button class="adm-btn adm-btn-ghost adm-btn-sm">Change role</button>')).addEventListener('click', function () {
        var next = prompt('New role for ' + user.name + ':', user.role);
        if (!next) return;
        if (!user.accountId) setUserMembership(user, user.membership, '', { role: next.trim() });
        Store.logAdminAction('CHANGE_ROLE', 'InstitutionUser', user.userId, { before: user.role, after: next.trim() });
        toast('Role changed to ' + next.trim());
        route(); closePanel();
      });
    } else {
      acts.innerHTML = '<span class="adm-hint">Read-only: your role cannot manage users.</span>';
    }
    function kv(k, v) { return '<span class="k">' + k + '</span><span class="v">' + v + '</span>'; }
  }
  function findAdminNameFor(accountUser) {
    var acc = Store.institutionalAccounts().filter(function (a) { return a.applicationId === accountUser.institutionId; })[0];
    return acc ? acc.adminName : accountUser.name;
  }
  function setUserMembership(user, membership, reason, patch) {
    var users = Store.readJson(KEYS.USERS, []);
    users.forEach(function (u) {
      if (u.userId === user.userId) {
        u.membership = membership;
        if (patch) Object.keys(patch).forEach(function (k) { u[k] = patch[k]; });
      }
    });
    Store.writeJson(KEYS.USERS, users);
    Store.logAdminAction(membership === 'SUSPENDED' ? 'SUSPEND_USER' : 'UPDATE_USER', 'InstitutionUser', user.userId, { reason: reason || '', after: patch || { membership: membership } });
  }

  /* ============================================================
     ACCESS REQUESTS (§23-25)
     ============================================================ */
  function renderAccess(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Data access requests</h2><div id="accTable"></div>';
    var reqs = Store.readJson(KEYS.ACCESS_REQUESTS, []);
    var target = host.querySelector('#accTable');
    if (!reqs.length) { target.innerHTML = emptyState('🔑', 'No access requests', 'Institutional access requests will appear here.'); return; }
    target.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
      '<th>Request ID</th><th>Institution</th><th>Requested by</th><th>Purpose</th><th>Datasets</th><th>Person-level</th><th>Export</th><th>Status</th></tr></thead><tbody>' +
      reqs.map(function (r, i) {
        return '<tr class="rowlink" data-i="' + i + '">' +
          '<td class="mono">' + esc(r.requestId) + '</td><td>' + esc(r.institutionName) + '</td>' +
          '<td>' + esc(r.requestedBy) + '</td><td>' + esc(r.purpose) + '</td>' +
          '<td class="mono">' + esc((r.datasets || []).join(', ')) + '</td>' +
          '<td>' + (r.personLevel ? '<span class="adm-badge bad">YES</span>' : '<span class="adm-badge dim">NO</span>') + '</td>' +
          '<td>' + esc(r.exportFormat) + '</td><td>' + badge(r.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    target.querySelectorAll('tr.rowlink').forEach(function (tr) {
      tr.addEventListener('click', function () { accessDetail(reqs[+tr.dataset.i]); });
    });
  }

  function accessDetail(r) {
    openPanel('Access request ' + r.requestId, r.institutionName,
      '<div class="adm-kv">' +
      kv('Requested by', esc(r.requestedBy)) + kv('Purpose', esc(r.purpose)) +
      kv('Geography', esc(r.geography)) + kv('Datasets', esc((r.datasets || []).join(', '))) +
      kv('Fields', esc((r.fields || []).join(', '))) +
      kv('Person-level', r.personLevel ? '<span class="adm-badge bad">YES</span>' : 'NO') +
      kv('Export format', esc(r.exportFormat)) + kv('Duration', r.durationDays + ' days') +
      kv('Submitted', fmtDateTime(r.submittedAt)) +
      '</div><div class="adm-actions" id="accActs"></div>');
    var acts = $('adminPanelBody').querySelector('#accActs');
    if (r.status === 'PENDING') {
      if (Perms.hasAdminPermission(P.ACCESS_APPROVE)) {
        acts.appendChild(el('<button class="adm-btn">APPROVE</button>')).addEventListener('click', function () {
          createGrant(r, { datasets: r.datasets.slice(), geography: r.geography, personLevel: r.personLevel, exportFormat: r.exportFormat, expiresAt: new Date(Date.now() + (r.durationDays || 30) * 864e5).toISOString() }, 'ACCESS_GRANTED');
        });
        acts.appendChild(el('<button class="adm-btn adm-btn-ghost">APPROVE WITH LIMITS</button>')).addEventListener('click', function () {
          openPanel('Approve with limits', r.requestId,
            '<div class="adm-field"><label>Datasets</label><div id="limDs">' +
            ['PEOPLE', 'LINEAGE', 'CULTURAL', 'ADMINISTRATIVE', 'LIFECYCLE'].map(function (d) {
              return '<label class="adm-check"><input type="checkbox" value="' + d + '"' + (r.datasets.indexOf(d) !== -1 ? ' checked' : '') + '> ' + d + '</label>';
            }).join('') + '</div></div>' +
            '<div class="adm-field"><label for="limGeo">Geography</label><input class="adm-input" id="limGeo" value="' + esc(r.geography) + '"></div>' +
            '<div class="adm-field"><label>Person-level</label><div class="adm-radio-row">' +
            '<label><input type="radio" name="limPL" value="off"' + (r.personLevel ? '' : ' checked') + '> OFF</label>' +
            '<label><input type="radio" name="limPL" value="on"' + (r.personLevel ? ' checked' : '') + '> ON</label></div></div>' +
            '<div class="adm-field"><label>Export format</label><div class="adm-radio-row" id="limExp">' +
            ['CSV', 'JSON', 'EAD3', 'NONE'].map(function (f) {
              return '<label><input type="radio" name="limFmt" value="' + f + '"' + (r.exportFormat === f ? ' checked' : '') + '> ' + f + '</label>';
            }).join('') + '</div></div>' +
            '<div class="adm-field"><label for="limExp2">Expiry</label><input class="adm-input" type="date" id="limExp2" value="' + new Date(Date.now() + (r.durationDays || 30) * 864e5).toISOString().slice(0, 10) + '"></div>' +
            '<div class="adm-actions"><button class="adm-btn" id="limGo">CREATE GRANT</button><button class="adm-btn adm-btn-ghost" id="limBack">BACK</button></div>');
          $('limGo').addEventListener('click', function () {
            var ds = [];
            $('limDs').querySelectorAll('input:checked').forEach(function (cb) { ds.push(cb.value); });
            createGrant(r, {
              datasets: ds, geography: $('limGeo').value.trim(),
              personLevel: document.querySelector('input[name="limPL"]:checked').value === 'on',
              exportFormat: document.querySelector('input[name="limFmt"]:checked').value,
              expiresAt: $('limExp2').value ? new Date($('limExp2').value).toISOString() : null
            }, 'GRANT_ACCESS_LIMITED');
          });
          $('limBack').addEventListener('click', function () { accessDetail(r); });
        });
        acts.appendChild(el('<button class="adm-btn adm-btn-danger">REJECT</button>')).addEventListener('click', function () {
          confirmAction('Reject access request', ['The institution will see this request as rejected.'], 'REJECT').then(function (res) {
            if (!res.ok) return;
            r.status = 'REJECTED';
            persistRequest(r);
            Store.logAdminAction('REJECT_ACCESS_REQUEST', 'InstitutionDataRequest', r.requestId, { reason: res.reason });
            toast('Request rejected.'); route(); closePanel();
          });
        });
      } else {
        acts.innerHTML = '<span class="adm-hint">Read-only: your role cannot decide access requests.</span>';
      }
    } else {
      acts.innerHTML = '<span class="adm-hint">Request already processed.</span>';
    }
    function kv(k, v) { return '<span class="k">' + k + '</span><span class="v">' + v + '</span>'; }
  }

  var createGrant = guard(P.ACCESS_APPROVE, function (r, cfg, auditAction) {
    var grant = {
      grantId: Store.nextId('GRANT-'),
      institutionId: r.institutionId, institutionName: r.institutionName,
      requestId: r.requestId,
      accessScope: cfg.geography,
      approvedDatasets: cfg.datasets,
      approvedModules: [],
      personLevelAllowed: !!cfg.personLevel,
      anonymizationRequired: true,
      exportFormatsAllowed: [cfg.exportFormat],
      expiresAt: cfg.expiresAt,
      grantedBy: session.name,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };
    var grants = Store.readJson(KEYS.GRANTS, []);
    grants.unshift(grant);
    Store.writeJson(KEYS.GRANTS, grants);
    r.status = 'APPROVED';
    persistRequest(r);
    Store.logAdminAction(auditAction, 'InstitutionAccessGrant', grant.grantId, {
      institutionId: r.institutionId,
      after: { datasets: cfg.datasets, geography: cfg.geography, personLevel: cfg.personLevel, export: cfg.exportFormat }
    });
    toast('Grant ' + grant.grantId + ' created.');
    route(); closePanel();
  });

  function persistRequest(updated) {
    var all = Store.readJson(KEYS.ACCESS_REQUESTS, []);
    all.forEach(function (r, i) { if (r.requestId === updated.requestId) all[i] = updated; });
    Store.writeJson(KEYS.ACCESS_REQUESTS, all);
  }

  /* ============================================================
     PRODUCTS (§26-27, §48)
     ============================================================ */
  function renderProducts(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Products & module bundles</h2><div id="prodTable"></div>';
    var products = Store.readJson(KEYS.PRODUCTS, []);
    var canEdit = Perms.hasAdminPermission(P.PRODUCTS_MANAGE);
    var target = host.querySelector('#prodTable');
    target.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
      '<th>Product</th><th>Modules bundled</th><th>Institution types</th><th>User limit</th><th>Pricing</th><th>Status</th></tr></thead><tbody>' +
      products.map(function (p, i) {
        return '<tr class="rowlink" data-i="' + i + '">' +
          '<td><b>' + esc(p.name) + '</b><span class="sub mono">' + p.id + '</span></td>' +
          '<td class="mono">' + esc(p.includedModules.join(', ')) + '</td>' +
          '<td>' + esc(p.institutionTypes.join(', ') || 'All types') + '</td>' +
          '<td>' + p.userLimit + '</td>' +
          '<td>$' + p.pricing.amount + ' / ' + esc(p.pricing.interval.toLowerCase()) + '</td>' +
          '<td>' + badge(p.active ? 'ACTIVE' : 'ARCHIVED') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    target.querySelectorAll('tr.rowlink').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var p = products[+tr.dataset.i];
        if (!canEdit) {
          openPanel(p.name, p.id, '<div class="adm-hint">Read-only view. Pricing changes require the Finance Administrator role.</div>');
          return;
        }
        productEditor(p);
      });
    });
  }

  function productEditor(p) {
    openPanel('Product · ' + p.name, p.id,
      '<div class="adm-form-grid">' +
      '<div class="adm-field"><label>Pricing amount (USD)</label><input class="adm-input" id="pdAmount" type="number" min="0" value="' + p.pricing.amount + '"></div>' +
      '<div class="adm-field"><label>Interval</label><select class="adm-select" id="pdInterval">' +
      ['MONTHLY', 'ANNUAL', 'CUSTOM'].map(function (iv) { return '<option' + (p.pricing.interval === iv ? ' selected' : '') + '>' + iv + '</option>'; }).join('') + '</select></div>' +
      '<div class="adm-field"><label>User limit</label><input class="adm-input" id="pdLimit" type="number" min="1" value="' + p.userLimit + '"></div>' +
      '<div class="adm-field"><label>Active</label><div class="adm-radio-row">' +
      '<label><input type="radio" name="pdActive" value="yes"' + (p.active ? ' checked' : '') + '> Active</label>' +
      '<label><input type="radio" name="pdActive" value="no"' + (!p.active ? ' checked' : '') + '> Archived</label></div></div>' +
      '<div class="adm-field full"><label>Allowed exports</label><div id="pdExports">' +
      ['JSON', 'CSV', 'EAD3'].map(function (f) {
        return '<label class="adm-check"><input type="checkbox" value="' + f + '"' + (p.allowedExports.indexOf(f) !== -1 ? ' checked' : '') + '> ' + f + '</label>';
      }).join('') + '</div></div>' +
      '</div><div class="adm-actions"><button class="adm-btn" id="pdSave">SAVE PRODUCT</button></div>');
    $('pdSave').addEventListener('click', function () {
      var before = { amount: p.pricing.amount, interval: p.pricing.interval, userLimit: p.userLimit, active: p.active };
      p.pricing.amount = +$('pdAmount').value || 0;
      p.pricing.interval = $('pdInterval').value;
      p.userLimit = +$('pdLimit').value || 1;
      p.active = document.querySelector('input[name="pdActive"]:checked').value === 'yes';
      p.allowedExports = [];
      $('pdExports').querySelectorAll('input:checked').forEach(function (cb) { p.allowedExports.push(cb.value); });
      p.updatedAt = new Date().toISOString();
      var all = Store.readJson(KEYS.PRODUCTS, []);
      all.forEach(function (x, i) { if (x.id === p.id) all[i] = p; });
      Store.writeJson(KEYS.PRODUCTS, all);
      Store.logAdminAction('CHANGE_PRODUCT', 'InstitutionProduct', p.id, { before: before, after: { amount: p.pricing.amount, interval: p.pricing.interval, active: p.active } });
      toast('Product saved.');
      route(); closePanel();
    });
  }

  /* ============================================================
     SUBSCRIPTIONS (§28-29)
     ============================================================ */
  function renderSubscriptions(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Subscriptions</h2><div id="subTable"></div>';
    var subs = Store.readJson(KEYS.SUBSCRIPTIONS, []);
    var target = host.querySelector('#subTable');
    if (!subs.length) { target.innerHTML = emptyState('💳', 'No subscriptions yet', 'Subscriptions are created when applications are approved.'); return; }
    target.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
      '<th>Institution</th><th>Product</th><th>Users</th><th>Start</th><th>Renewal</th><th>Status</th></tr></thead><tbody>' +
      subs.map(function (s, i) {
        return '<tr class="rowlink" data-i="' + i + '">' +
          '<td><b>' + esc(s.institutionName) + '</b><span class="sub mono">' + esc(s.subscriptionId) + '</span></td>' +
          '<td>' + esc(s.product) + '<span class="sub mono">' + esc((s.modules || []).join(', ')) + '</span></td>' +
          '<td>' + s.usersUsed + ' / ' + s.userLimit + '</td>' +
          '<td class="mono">' + fmtDate(s.start) + '</td><td class="mono">' + fmtDate(s.renewal) + '</td>' +
          '<td>' + badge(s.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    target.querySelectorAll('tr.rowlink').forEach(function (tr) {
      tr.addEventListener('click', function () { subscriptionDetail(subs[+tr.dataset.i]); });
    });
  }

  function subscriptionDetail(s) {
    var canManage = Perms.hasAdminPermission(P.SUBSCRIPTIONS_MANAGE);
    var products = Store.readJson(KEYS.PRODUCTS, []);
    openPanel(s.institutionName, s.product + ' · ' + s.status,
      '<div class="adm-kv">' +
      kv('Users', s.usersUsed + ' / ' + s.userLimit) +
      kv('Modules', esc((s.modules || []).join(', '))) +
      kv('Billing', '$' + s.amount + ' / ' + esc(String(s.interval).toLowerCase())) +
      kv('Started', fmtDate(s.start)) + kv('Renews', fmtDate(s.renewal)) +
      '</div><div class="adm-actions" id="subActs"></div>');
    var acts = $('adminPanelBody').querySelector('#subActs');
    if (!canManage) { acts.innerHTML = '<span class="adm-hint">Read-only: billing changes need the Finance Administrator role.</span>'; return; }
    [['Upgrade', 'up'], ['Downgrade', 'down']].forEach(function (pair) {
      acts.appendChild(el('<button class="adm-btn adm-btn-ghost adm-btn-sm">' + pair[0] + '</button>')).addEventListener('click', function () {
        var pool = products.filter(function (p) { return p.active && p.id !== 'core'; });
        var names = pool.map(function (p) { return p.name; });
        var pick = prompt(pair[0] + ' to which product?\n\n' + names.join('\n'), s.product);
        var hit = pool.filter(function (p) { return p.name === pick; })[0];
        if (!hit) { if (pick !== null) toast('Unknown product.'); return; }
        Store.logAdminAction('CHANGE_SUBSCRIPTION', 'InstitutionSubscription', s.subscriptionId, {
          before: { product: s.product }, after: { product: hit.name }, reason: pair[0]
        });
        s.product = hit.name; s.modules = hit.includedModules.slice();
        s.userLimit = hit.userLimit; s.amount = hit.pricing.amount; s.interval = hit.pricing.interval;
        persistSubscription(s);
        toast('Subscription ' + pair[0].toLowerCase() + 'd to ' + hit.name);
        route(); subscriptionDetail(s);
      });
    });
    acts.appendChild(el('<button class="adm-btn adm-btn-ghost adm-btn-sm">Extend 30d</button>')).addEventListener('click', function () {
      var d = new Date(s.renewal); d.setDate(d.getDate() + 30);
      Store.logAdminAction('CHANGE_SUBSCRIPTION', 'InstitutionSubscription', s.subscriptionId, { after: { renewal: d.toISOString() }, reason: 'Extended 30 days' });
      s.renewal = d.toISOString(); persistSubscription(s);
      toast('Renewal extended to ' + fmtDate(s.renewal)); route(); subscriptionDetail(s);
    });
    if (s.status !== 'SUSPENDED') {
      acts.appendChild(el('<button class="adm-btn adm-btn-danger adm-btn-sm">Suspend</button>')).addEventListener('click', function () {
        confirmAction('Suspend subscription', ['Workspace keeps data but paid capabilities pause.'], 'SUSPEND').then(function (r) {
          if (!r.ok) return;
          s.status = 'SUSPENDED'; persistSubscription(s);
          Store.logAdminAction('CHANGE_SUBSCRIPTION', 'InstitutionSubscription', s.subscriptionId, { after: { status: 'SUSPENDED' }, reason: r.reason });
          toast('Subscription suspended.'); route(); subscriptionDetail(s);
        });
      });
    }
    acts.appendChild(el('<button class="adm-btn adm-btn-danger adm-btn-sm">Cancel</button>')).addEventListener('click', function () {
      confirmAction('Cancel subscription', ['· Status becomes CANCELLED', '· Renewals stop', '· Billing history is preserved'], 'CANCEL').then(function (r) {
        if (!r.ok) return;
        s.status = 'CANCELLED'; persistSubscription(s);
        Store.logAdminAction('CHANGE_SUBSCRIPTION', 'InstitutionSubscription', s.subscriptionId, { after: { status: 'CANCELLED' }, reason: r.reason });
        toast('Subscription cancelled.'); route(); subscriptionDetail(s);
      });
    });
    function kv(k, v) { return '<span class="k">' + k + '</span><span class="v">' + v + '</span>'; }
  }
  function persistSubscription(updated) {
    var all = Store.readJson(KEYS.SUBSCRIPTIONS, []);
    all.forEach(function (s, i) { if (s.subscriptionId === updated.subscriptionId) all[i] = updated; });
    Store.writeJson(KEYS.SUBSCRIPTIONS, all);
  }

  /* ============================================================
     DATASET GOVERNANCE (§30-32)
     ============================================================ */
  function datasetCatalogue() {
    var peopleN = (window.PEOPLE || []).length;
    var schoolsN = (window.SCHOOLS_ZW || []).length;
    var districtsN = ((window.ZIMBABWE_LOCATIONS_DATA || {}).districts || []).length;
    var totemsN = Object.keys(window.totemRegistry || {}).length;
    return [
      { id: 'PEOPLE', name: 'Person Data', count: peopleN, source: 'Master dataset v2 (533 imported)', updated: '2026-08-01', types: 'All except restricted' },
      { id: 'LINEAGE', name: 'Lineage', count: peopleN, source: 'Derived from Person relations', updated: '2026-08-01', types: 'Research, Genealogy, Traditional' },
      { id: 'TOTEMS', name: 'Totems', count: totemsN, source: 'lookups.js totemRegistry', updated: '2026-06-14', types: 'Public directory' },
      { id: 'ORAL_CULTURE', name: 'Oral Culture', count: (window.proverbs || []).length, source: 'lookups.js proverbs/greetings', updated: '2026-06-14', types: 'Cultural orgs, Heritage' },
      { id: 'ADMIN_GEOGRAPHY', name: 'Administrative Geography', count: districtsN, source: 'zw_locations.js', updated: '2026-05-02', types: 'Government, NGO' },
      { id: 'VILLAGE_BOOKS', name: 'Village Books', count: 0, source: 'Sync imports (per book)', updated: '—', types: 'Traditional authority' },
      { id: 'SCHOOLS', name: 'Schools', count: schoolsN, source: 'schools_db.js (generated)', updated: '2026-04-11', types: 'Education, Government' },
      { id: 'ARCHIVES', name: 'Archives', count: 158, source: 'Archive digitisation batches', updated: '2026-08-11', types: 'Archive, Museum' },
      { id: 'HERITAGE', name: 'Heritage', count: 42, source: 'Monuments register', updated: '2026-07-30', types: 'Museum, Heritage' }
    ];
  }

  function renderDatasets(host) {
    var catalogue = datasetCatalogue();
    var classes = Store.readJson(KEYS.DATASET_CLASSES, {});
    var canGovern = Perms.hasAdminPermission(P.SYSTEM_MANAGE);
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Dataset governance</h2>' +
      '<div class="adm-hint">Privacy classes: PUBLIC · INSTITUTIONAL · RESTRICTED · PRIVATE. Changes apply to future institutional queries.</div>' +
      '<div class="adm-tablewrap"><table class="adm-table"><thead><tr><th>Dataset</th><th>Records</th><th>Source</th><th>Last updated</th><th>Privacy class</th></tr></thead><tbody>' +
      catalogue.map(function (d) {
        return '<tr><td><b>' + esc(d.name) + '</b><span class="sub mono">' + d.id + '</span></td>' +
          '<td>' + d.count.toLocaleString() + '</td><td>' + esc(d.source) + '</td><td class="mono">' + esc(d.updated) + '</td>' +
          '<td>' + (canGovern
            ? '<select class="adm-select" data-ds="' + d.id + '" style="padding:5px 8px;font-size:0.76rem;">' +
              ['PUBLIC', 'INSTITUTIONAL', 'RESTRICTED', 'PRIVATE'].map(function (c) {
                return '<option' + (classes[d.id] === c ? ' selected' : '') + '>' + c + '</option>';
              }).join('') + '</select>'
            : badge(classes[d.id])) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="adm-panel"><h3>Field governance</h3><div class="adm-hint">Controls searchability and exportability per field.</div><div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
      '<th>Field</th><th>Dataset</th><th>Privacy</th><th>Searchable</th><th>Exportable</th><th>Default anonymization</th></tr></thead><tbody id="fieldGov"></tbody></table></div></div>';

    host.querySelectorAll('select[data-ds]').forEach(function (sel) {
      sel.addEventListener('change', guard(P.SYSTEM_MANAGE, function () {
        classes[sel.dataset.ds] = sel.value;
        Store.writeJson(KEYS.DATASET_CLASSES, classes);
        Store.logAdminAction('EDIT_DATASET_GOVERNANCE', 'Dataset', sel.dataset.ds, { after: { privacyClass: sel.value } });
        toast(sel.dataset.ds + ' → ' + sel.value);
      }));
    });

    var fg = Store.readJson(KEYS.FIELD_GOVERNANCE, []);
    var fgBody = host.querySelector('#fieldGov');
    fgBody.innerHTML = fg.map(function (f, i) {
      var canToggle = canGovern;
      return '<tr><td class="mono">' + esc(f.field) + '</td><td>' + esc(f.dataset) + '</td><td>' + badge(f.privacyClass === 'PRIVATE' ? 'SUSPENDED' : f.privacyClass === 'RESTRICTED' ? 'NEEDS_INFORMATION' : f.privacyClass === 'PUBLIC' ? 'ACTIVE' : 'TRIAL') + '</td>' +
        '<td>' + (canToggle ? '<input type="checkbox" data-fg-s="' + i + '"' + (f.searchable ? ' checked' : '') + ' style="accent-color:var(--ad-accent);">' : (f.searchable ? 'Yes' : 'No')) + '</td>' +
        '<td>' + esc(f.exportable) + '</td><td class="mono">' + esc(f.anonymization) + '</td></tr>';
    }).join('');
    fgBody.querySelectorAll('input[data-fg-s]').forEach(function (cb) {
      cb.addEventListener('change', guard(P.SYSTEM_MANAGE, function () {
        fg[+cb.dataset.fgS].searchable = cb.checked;
        Store.writeJson(KEYS.FIELD_GOVERNANCE, fg);
        Store.logAdminAction('EDIT_FIELD_GOVERNANCE', 'FieldGovernance', fg[+cb.dataset.fgS].field, { after: { searchable: cb.checked } });
      }));
    });
  }

  /* ============================================================
     DISPUTE CENTRE (§33-34)
     ============================================================ */
  function openDisputes() {
    var resolvedIds = Store.readJson(KEYS.DISPUTE_RESOLUTIONS, []).map(function (d) { return d.personId; });
    return (window.PEOPLE || []).filter(function (p) {
      return p.sync && p.sync._disputed && resolvedIds.indexOf(p.id) === -1;
    });
  }

  function renderDisputes(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Dispute centre</h2>' +
      '<div class="adm-hint">Conflicting sync/version records queued for human review. Resolutions never silently overwrite one version.</div><div id="dispTable"></div>';
    var disputes = openDisputes();
    var target = host.querySelector('#dispTable');
    if (!disputes.length) { target.innerHTML = emptyState('⚖️', 'No open disputes', 'Sync conflicts will be queued here automatically.'); return; }
    target.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
      '<th>Record</th><th>Type</th><th>Local version</th><th>Sync version</th><th>Severity</th><th>Status</th></tr></thead><tbody>' +
      disputes.map(function (p, i) {
        var s = p.sync || {};
        return '<tr class="rowlink" data-i="' + i + '">' +
          '<td><b>' + esc(p.name) + '</b><span class="sub mono">' + esc(p.id) + '</span></td>' +
          '<td>' + disputeType(p) + '</td>' +
          '<td>' + esc(localLine(p)) + '</td><td>' + esc(remoteLine(s)) + '</td>' +
          '<td>' + badge('NEEDS_INFORMATION') + '</td><td>' + badge('OPEN') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    target.querySelectorAll('tr.rowlink').forEach(function (tr) {
      tr.addEventListener('click', function () { disputeDetail(disputes[+tr.dataset.i]); });
    });
  }

  function disputeType(p) {
    if ((p.sync || {})._totemConflict) return 'TOTEM CONFLICT';
    if ((p.kinship || {}).mutupo && (p.sync || {}).mutupo && p.kinship.mutupo !== p.sync.mutupo) return 'TOTEM CONFLICT';
    return 'SYNC CONFLICT';
  }
  function localLine(p) {
    return [p.name, (p.kinship || {}).mutupo, (p.kinship || {}).chidawo].filter(Boolean).join(' · ') || '—';
  }
  function remoteLine(sync) {
    var parts = [];
    ['name', 'mutupo', 'chidawo', 'version'].forEach(function (k) {
      if (sync[k] !== undefined) parts.push(String(sync[k]));
    });
    return parts.join(' · ') || 'remote version on file';
  }

  function disputeDetail(p) {
    var canResolve = Perms.hasAdminPermission(P.DISPUTES_RESOLVE);
    openPanel('Dispute · ' + p.name, p.id + ' · ' + disputeType(p),
      '<div class="side-by-side">' +
      '<div class="sbs-col"><h4>Source A — local</h4>' +
      '<div class="adm-kv">' + kv('Name', esc(p.name)) + kv('Totem', esc((p.kinship || {}).mutupo || '—')) +
      kv('Chidawo', esc((p.kinship || {}).chidawo || '—')) + kv('Born', esc(p.born || '—')) + '</div></div>' +
      '<div class="sbs-col"><h4>Source B — sync</h4>' +
      '<div class="adm-kv">' + kv('Name', esc((p.sync || {}).name || p.name)) + kv('Totem', esc((p.sync || {}).mutupo || '—')) +
      kv('Chidawo', esc((p.sync || {}).chidawo || '—')) + kv('Version', esc((p.sync || {}).version || '—')) + '</div></div></div>' +
      '<div class="adm-actions" id="dispActs"></div>');
    var acts = $('adminPanelBody').querySelector('#dispActs');
    if (!canResolve) { acts.innerHTML = '<span class="adm-hint">Read-only: resolving disputes needs the Data Administrator role.</span>'; return; }
    ['ACCEPT A', 'ACCEPT B', 'MERGE', 'ESCALATE', 'DISMISS'].forEach(function (label) {
      acts.appendChild(el('<button class="adm-btn adm-btn-ghost adm-btn-sm">' + label + '</button>')).addEventListener('click', function () {
        confirmAction(label.charAt(0) + label.slice(1).toLowerCase() + ' resolution',
          ['· Both versions remain recorded in the audit trail', '· No silent overwrite occurs'], label).then(function (r) {
            if (!r.ok) return;
            p.sync._disputed = false;
            var resolutions = Store.readJson(KEYS.DISPUTE_RESOLUTIONS, []);
            resolutions.unshift({ personId: p.id, resolution: label, reason: r.reason, at: new Date().toISOString(), by: session.name });
            Store.writeJson(KEYS.DISPUTE_RESOLUTIONS, resolutions);
            Store.logAdminAction('RESOLVE_DISPUTE', 'Person', p.id, {
              before: { local: localLine(p), remote: remoteLine(p.sync) },
              after: { resolution: label }, reason: r.reason
            });
            toast('Dispute resolved: ' + label);
            route(); closePanel();
          });
      });
    });
    function kv(k, v) { return '<span class="k">' + k + '</span><span class="v">' + v + '</span>'; }
  }

  /* ============================================================
     IMPORTS (§35) + EXPORTS (§36-37)
     ============================================================ */
  var seedImports = null;
  function renderImports(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Import centre</h2><div class="adm-hint">Conflicting sync records surface as disputes rather than being hidden.</div><div id="impTable"></div>';
    if (!seedImports) seedImports = Store.readJson(KEYS.AUDIT, []).length >= 0 ? staticImports() : [];
    var rows = seedImports;
    host.querySelector('#impTable').innerHTML =
      '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
      '<th>Source</th><th>Institution</th><th>Format</th><th>Records</th><th>New</th><th>Updated</th><th>Disputed</th><th>Imported by</th><th>Date</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td><b>' + esc(r.source) + '</b><span class="sub mono">' + esc(r.importId) + '</span></td>' +
          '<td>' + esc(r.institution) + '</td><td>' + badge('TRIAL') + esc(' ' + r.format) + '</td>' +
          '<td>' + r.records + '</td><td>' + r.newCount + '</td><td>' + r.updated + '</td>' +
          '<td>' + (r.disputed ? '<span class="adm-badge bad">' + r.disputed + '</span>' : '0') + '</td>' +
          '<td>' + esc(r.importedBy) + '</td><td class="mono">' + fmtDateTime(r.date) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function staticImports() {
    return [
      { importId: 'IMP-00301', source: 'ROOTS_SYNC', institution: 'National Museums & Monuments of Zimbabwe', format: 'ROOTS_SYNC', records: 412, newCount: 38, updated: 370, disputed: 4, importedBy: 'Curation Team', date: '2026-08-19T09:12:00.000Z' },
      { importId: 'IMP-00300', source: 'Village Books Drive', institution: 'Great Zimbabwe University — Culture Faculty', format: 'CSV', records: 96, newCount: 12, updated: 80, disputed: 2, importedBy: 'Dr. Jane Moyo', date: '2026-08-17T11:05:00.000Z' },
      { importId: 'IMP-00299', source: 'Archive digitisation batch 7', institution: 'National Museums & Monuments of Zimbabwe', format: 'EAD3', records: 158, newCount: 158, updated: 0, disputed: 0, importedBy: 'Curation Team', date: '2026-08-11T15:45:00.000Z' }
    ];
  }

  function renderExports(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Export centre</h2>' +
      '<div class="adm-hint">Who exported what. File contents are never exposed here.</div><div id="expTable"></div>';
    var rows = Store.readJson(KEYS.EXPORT_LOG, []);
    var target = host.querySelector('#expTable');
    if (!rows.length) { target.innerHTML = emptyState('📤', 'No exports recorded', 'Institutional workspace exports appear here automatically.'); return; }
    target.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><thead><tr>' +
      '<th>Export ID</th><th>Institution</th><th>User</th><th>Dataset</th><th>Format</th><th>Records</th><th>Anonymized</th><th>Date</th><th>Status</th></tr></thead><tbody>' +
      rows.map(function (e, i) {
        return '<tr class="rowlink" data-i="' + i + '">' +
          '<td class="mono">' + esc(e.exportId) + '</td><td>' + esc(e.institution) + '</td><td>' + esc(e.user) + '</td>' +
          '<td>' + esc(e.dataset) + '</td><td>' + esc(e.format) + '</td><td>' + e.records + '</td>' +
          '<td>' + (e.anonymized ? '<span class="adm-badge ok">YES</span>' : '<span class="adm-badge warn">NO</span>') + '</td>' +
          '<td class="mono">' + fmtDateTime(e.date) + '</td><td>' + badge(e.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    target.querySelectorAll('tr.rowlink').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var e = rows[+tr.dataset.i];
        if (e.status !== 'PENDING_APPROVAL') { toast('Export already ' + String(e.status).toLowerCase() + '.'); return; }
        if (!Perms.hasAdminPermission(P.EXPORTS_APPROVE)) { toast('Approval requires a permitted role.'); return; }
        confirmAction('Export request', [e.institution, e.dataset + ' · ' + e.format + ' · ' + e.records + ' records · anonymized: ' + (e.anonymized ? 'YES' : 'NO')], 'APPROVE').then(function (r) {
          if (!r.ok) return;
          e.status = 'COMPLETED';
          persistExport(e);
          Store.logAdminAction('APPROVE_EXPORT', 'InstitutionExport', e.exportId, { reason: r.reason });
          toast('Export approved.'); route();
        });
      });
    });
  }
  function persistExport(updated) {
    var all = Store.readJson(KEYS.EXPORT_LOG, []);
    all.forEach(function (e, i) { if (e.exportId === updated.exportId) all[i] = updated; });
    Store.writeJson(KEYS.EXPORT_LOG, all);
  }

  /* ============================================================
     AUDIT (§38-39)
     ============================================================ */
  var auditFilter = '';
  function renderAudit(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Audit centre</h2>' +
      '<div class="adm-toolbar">' +
      '<input type="text" class="adm-input" placeholder="Search…" style="flex:1;min-width:160px;">' +
      '<select class="adm-select" placeholder="aAction"><option value="">Action</option>' +
      Array.from(new Set(Store.readJson(KEYS.AUDIT, []).map(function (a) { return a.action; }))).map(function (a) {
        return '<option>' + esc(a) + '</option>';
      }).join('') + '</select>' +
      '<button class="adm-btn adm-btn-ghost adm-btn-sm" id="auditCsv">⬇ Export CSV</button></div>' +
      '<div id="audTable"></div>';
    var log = Store.readJson(KEYS.AUDIT, []);
    var getVals = bindToolbar(host, draw);
    host.querySelector('#auditCsv').addEventListener('click', guard(P.AUDIT_READ, function () {
      downloadCsv('roots_admin_audit_' + new Date().toISOString().slice(0, 10) + '.csv',
        ['id', 'createdAt', 'adminUserId', 'adminName', 'action', 'targetType', 'targetId', 'result', 'reason'],
        log.map(function (a) { return [a.id, a.createdAt, a.adminUserId, a.adminName, a.action, a.targetType, a.targetId, a.result, a.reason]; }));
      toast('Audit CSV exported.');
    }));

    function draw() {
      var v = getVals();
      var q = (v.Search || '').toLowerCase();
      var rows = log.filter(function (a) {
        if (v.aAction && a.action !== v.aAction) return false;
        if (q && (a.targetId + ' ' + a.adminName + ' ' + a.action).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      var target = host.querySelector('#audTable');
      if (!rows.length) { target.innerHTML = emptyState('🧾', 'No audit entries', 'Every administrator action is recorded here.'); return; }
      target.innerHTML = '<div class="adm-tablewrap" style="max-height:62vh;overflow-y:auto;"><table class="adm-table"><thead><tr>' +
        '<th>Date/Time</th><th>Administrator</th><th>Action</th><th>Target</th><th>Outcome</th><th>Reason</th></tr></thead><tbody>' +
        rows.map(function (a) {
          return '<tr><td class="mono">' + fmtDateTime(a.createdAt) + '</td><td>' + esc(a.adminName) + '</td>' +
            '<td class="mono">' + esc(a.action) + '</td><td class="mono">' + esc(a.targetType) + ' · ' + esc(a.targetId) + '</td>' +
            '<td>' + (a.result === 'SUCCESS' ? '<span class="adm-badge ok">SUCCESS</span>' : '<span class="adm-badge bad">FAILED</span>') + '</td>' +
            '<td>' + esc(a.reason || '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    draw();
  }

  /* ============================================================
     GEOGRAPHY (§40-41) — shared registries, never duplicated
     ============================================================ */
  var geoTab = 'submitted';
  function renderGeography(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Geography administration</h2>' +
      '<div class="adm-hint">Shared registries power every selector across Regular, Institutional and Admin surfaces.</div>' +
      '<div class="adm-tabs" id="geoTabs">' +
      ['countries', 'provinces', 'districts', 'submitted'].map(function (t) {
        return '<button data-t="' + t + '" class="' + (geoTab === t ? 'active' : '') + '">' + t.toUpperCase() + '</button>';
      }).join('') + '</div><div id="geoBody"></div>';
    host.querySelectorAll('#geoTabs button').forEach(function (b) {
      b.addEventListener('click', function () { geoTab = b.dataset.t; renderGeography(host); });
    });
    var body = host.querySelector('#geoBody');

    if (geoTab === 'countries') {
      var cs = (window.RegData.countries || []);
      body.innerHTML = '<div class="adm-panel"><h3>Countries registry (' + cs.length + ' entries)</h3>' +
        '<div class="adm-hint">Single shared source: registration-data.js.</div>' +
        cs.slice(0, 24).map(function (c) {
          return '<div class="adm-flag-row"><span>' + esc(c.name) + '</span><span class="mono">' + esc(c.code) + ' · ' + esc(c.dial) + '</span></div>';
        }).join('') +
        (cs.length > 24 ? '<div class="adm-hint">…and ' + (cs.length - 24) + ' more.</div>' : '') + '</div>';
    } else if (geoTab === 'provinces') {
      body.innerHTML = '<div class="adm-tablewrap"><table class="adm-table"><tbody>' +
        (CFG.PROVINCES_ZW || []).map(function (p) { return '<tr><td>' + esc(p) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    } else if (geoTab === 'districts') {
      var names = (CFG.zwDistrictNames ? CFG.zwDistrictNames() : []);
      body.innerHTML = '<div class="adm-panel"><h3>Districts (' + names.length + ')</h3><div class="adm-hint">' + esc(names.join(' · ')) + '</div></div>';
    } else {
      var queue = Store.readJson(KEYS.SUBMITTED_AREAS, []).filter(function (a) { return a.status === 'PENDING'; });
      var approved = Store.readJson(KEYS.APPROVED_AREAS, []);
      body.innerHTML =
        '<div class="adm-panel"><h3>Submitted areas queue</h3>' +
        (queue.length ? queue.map(function (a) {
          return '<div class="adm-flag-row"><div><b>' + esc(a.suggested) + '</b><span class="sub">' + esc(a.region) + ' · ' + esc(a.town) + ' · by ' + esc(a.submittedBy) + '</span></div>' +
            '<div style="display:flex;gap:6px;">' +
            '<button class="adm-btn adm-btn-sm" data-appr="' + esc(a.areaId) + '">Approve</button>' +
            '<button class="adm-btn adm-btn-danger adm-btn-sm" data-rej="' + esc(a.areaId) + '">Reject</button></div></div>';
        }).join('') : emptyState('🗺️', 'Queue clear', 'User-submitted areas await administrator review here.')) + '</div>' +
        (approved.length ? '<div class="adm-panel"><h3>Recently approved (' + approved.length + ')</h3>' +
          approved.map(function (a) { return '<div class="adm-flag-row"><span>' + esc(a.suggested) + '</span><span class="adm-badge ok">ADDED LOCALLY</span></div>'; }).join('') + '</div>' : '');

      body.querySelectorAll('[data-appr]').forEach(function (b) {
        b.addEventListener('click', guard(P.GEOGRAPHY_MANAGE, function () {
          var area = Store.readJson(KEYS.SUBMITTED_AREAS, []).filter(function (x) { return x.areaId === b.dataset.appr; })[0];
          area.status = 'APPROVED';
          persistArea(area);
          var appr = Store.readJson(KEYS.APPROVED_AREAS, []);
          appr.unshift(area);
          Store.writeJson(KEYS.APPROVED_AREAS, appr);
          Store.logAdminAction('EDIT_GEOGRAPHY', 'SubmittedArea', area.areaId, { after: { status: 'APPROVED' } });
          toast('Area added to the local accepted registry (master lookup untouched until release).');
          renderGeography(host);
        }));
      });
      body.querySelectorAll('[data-rej]').forEach(function (b) {
        b.addEventListener('click', guard(P.GEOGRAPHY_MANAGE, function () {
          confirmAction('Reject submitted area', ['The suggestion stays out of the registry.'], 'REJECT').then(function (r) {
            if (!r.ok) return;
            var area = Store.readJson(KEYS.SUBMITTED_AREAS, []).filter(function (x) { return x.areaId === b.dataset.rej; })[0];
            area.status = 'REJECTED';
            persistArea(area);
            Store.logAdminAction('EDIT_GEOGRAPHY', 'SubmittedArea', area.areaId, { after: { status: 'REJECTED' }, reason: r.reason });
            toast('Area rejected.'); renderGeography(host);
          });
        }));
      });
    }
  }
  function persistArea(updated) {
    var all = Store.readJson(KEYS.SUBMITTED_AREAS, []);
    all.forEach(function (a, i) { if (a.areaId === updated.areaId) all[i] = updated; });
    Store.writeJson(KEYS.SUBMITTED_AREAS, all);
  }

  /* ============================================================
     SCHOOLS (§42-43)
     ============================================================ */
  var schoolTab = 'registry';
  function renderSchools(host) {
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Schools administration</h2>' +
      '<div class="adm-tabs" id="schTabs">' +
      ['registry', 'pending'].map(function (t) {
        return '<button data-t="' + t + '" class="' + (schoolTab === t ? 'active' : '') + '">' + (t === 'registry' ? 'ZW Registry' : 'Pending Institutions') + '</button>';
      }).join('') + '</div><div id="schBody"></div>';
    host.querySelectorAll('#schTabs button').forEach(function (b) {
      b.addEventListener('click', function () { schoolTab = b.dataset.t; renderSchools(host); });
    });
    var body = host.querySelector('#schBody');

    if (schoolTab === 'registry') {
      var schools = window.SCHOOLS_ZW || [];
      body.innerHTML = '<div class="adm-toolbar"><input type="text" class="adm-input" placeholder="Search schools…" style="flex:1;"></div>' +
        '<div class="adm-panel"><h3 id="schCount"></h3><div class="adm-hint">Central registry: schools_db.js (generated). Admin approves pending additions; generated master is rebuilt from source.</div>' +
        '<div id="schList" style="max-height:46vh;overflow-y:auto;"></div></div>';
      var input = body.querySelector('input');
      function drawList() {
        var q = input.value.toLowerCase();
        var rows = schools.filter(function (s) { return !q || s.toLowerCase().indexOf(q) !== -1; }).slice(0, 60);
        body.querySelector('#schCount').textContent = schools.length.toLocaleString() + ' registered ZW institutions';
        body.querySelector('#schList').innerHTML = rows.map(function (s) {
          return '<div class="adm-flag-row"><span>' + esc(s) + '</span></div>';
        }).join('') || emptyState('🏫', 'No matches', 'Try another spelling.');
      }
      input.addEventListener('input', drawList);
      drawList();
    } else {
      var pending = Store.readJson(KEYS.PENDING_SCHOOLS, []).filter(function (s) { return s.status === 'PENDING'; });
      var approved = Store.readJson(KEYS.APPROVED_SCHOOLS, []);
      body.innerHTML = '<div class="adm-panel"><h3>Pending institutions</h3>' +
        (pending.length ? pending.map(function (s) {
          return '<div class="adm-flag-row"><div><b>' + esc(s.name) + '</b><span class="sub">' + esc(s.type) + ' · ' + esc(s.district) + ', ' + esc(s.city) + ' · by ' + esc(s.submittedBy) + '</span></div>' +
            '<div style="display:flex;gap:6px;"><button class="adm-btn adm-btn-sm" data-ok="' + esc(s.schoolId) + '">Approve</button>' +
            '<button class="adm-btn adm-btn-danger adm-btn-sm" data-no="' + esc(s.schoolId) + '">Reject</button></div></div>';
        }).join('') : emptyState('🏫', 'No pending institutions', 'Unknown schools submitted during onboarding appear here.')) + '</div>' +
        (approved.length ? '<div class="adm-panel"><h3>Locally approved (' + approved.length + ')</h3>' +
          approved.map(function (s) { return '<div class="adm-flag-row"><span>' + esc(s.name) + '</span><span class="adm-badge ok">ADDED LOCALLY</span></div>'; }).join('') + '</div>' : '');

      body.querySelectorAll('[data-ok]').forEach(function (b) {
        b.addEventListener('click', guard(P.SCHOOLS_MANAGE, function () {
          var s = Store.readJson(KEYS.PENDING_SCHOOLS, []).filter(function (x) { return x.schoolId === b.dataset.ok; })[0];
          s.status = 'APPROVED';
          persistSchool(s);
          var appr = Store.readJson(KEYS.APPROVED_SCHOOLS, []);
          appr.unshift(s);
          Store.writeJson(KEYS.APPROVED_SCHOOLS, appr);
          Store.logAdminAction('EDIT_SCHOOL', 'SchoolRecord', s.schoolId, { after: { status: 'APPROVED' } });
          toast('School approved locally.'); renderSchools(host);
        }));
      });
      body.querySelectorAll('[data-no]').forEach(function (b) {
        b.addEventListener('click', guard(P.SCHOOLS_MANAGE, function () {
          confirmAction('Reject school submission', ['It will not join the registry.'], 'REJECT').then(function (r) {
            if (!r.ok) return;
            var s = Store.readJson(KEYS.PENDING_SCHOOLS, []).filter(function (x) { return x.schoolId === b.dataset.no; })[0];
            s.status = 'REJECTED';
            persistSchool(s);
            Store.logAdminAction('EDIT_SCHOOL', 'SchoolRecord', s.schoolId, { after: { status: 'REJECTED' }, reason: r.reason });
            toast('Submission rejected.'); renderSchools(host);
          });
        }));
      });
    }
  }
  function persistSchool(updated) {
    var all = Store.readJson(KEYS.PENDING_SCHOOLS, []);
    all.forEach(function (s, i) { if (s.schoolId === updated.schoolId) all[i] = updated; });
    Store.writeJson(KEYS.PENDING_SCHOOLS, all);
  }

  /* ============================================================
     CULTURAL LIBRARY (§44-45) — same underlying library data
     ============================================================ */
  var libTab = 'totems';
  var CONTENT_STATES = ['DRAFT', 'UNDER REVIEW', 'APPROVED', 'ARCHIVED'];
  function librarySections() {
    var sections = [];
    sections.push({
      id: 'totems', title: 'Totems',
      rows: Object.keys(window.totemRegistry || {}).map(function (name) {
        var t = window.totemRegistry[name];
        return { key: 'totem:' + name, main: name, sub: Array.isArray(t && t.praises) ? t.praises.join(', ') : (typeof t === 'string' ? t : ''), statusDefault: 'APPROVED' };
      })
    });
    sections.push({
      id: 'proverbs', title: 'Proverbs',
      rows: (window.proverbs || []).map(function (p, i) {
        return { key: 'prov:' + i, main: p.proverb || p.text || p.shona || '', sub: p.translation || p.meaning || p.english || '', statusDefault: 'APPROVED' };
      })
    });
    sections.push({
      id: 'greetings', title: 'Greetings',
      rows: Object.keys(window.timeGreetings || {}).map(function (k) {
        return { key: 'grt:' + k, main: k, sub: window.timeGreetings[k], statusDefault: 'APPROVED' };
      })
    });
    sections.push({
      id: 'glossary', title: 'Glossary',
      rows: (window.glossaryTerms || []).map(function (g, i) {
        return { key: 'glo:' + i, main: g.term, sub: (g.lang || '') + (g.meaning ? ' — ' + g.meaning : ''), statusDefault: 'APPROVED' };
      })
    });
    sections.push({
      id: 'regions', title: 'Regions',
      rows: (CFG.PROVINCES_ZW || []).map(function (p) {
        return { key: 'reg:' + p, main: p, sub: 'Province', statusDefault: 'APPROVED' };
      })
    });
    sections.push({
      id: 'roora', title: 'Roora',
      rows: (typeof window.ROORA_PHASES === 'object' ? window.ROORA_PHASES : []).map(function (r, i) {
        var obj = typeof r === 'string' ? { phase: r } : r;
        return { key: 'roora:' + i, main: obj.phase || obj.name || obj.title || ('Phase ' + (i + 1)), sub: obj.description || obj.detail || '', statusDefault: 'APPROVED' };
      })
    });
    return sections.filter(function (s) { return s.rows.length; });
  }

  function renderLibrary(host) {
    var sections = librarySections();
    if (!sections.some(function (s) { return s.id === libTab; })) libTab = sections[0] ? sections[0].id : libTab;
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Cultural library management</h2>' +
      '<div class="adm-hint">Same underlying library datasets consumed by Regular and Institutional users. Nothing auto-publishes.</div>' +
      '<div class="adm-tabs">' + sections.map(function (s) {
        return '<button data-lt="' + s.id + '" class="' + (libTab === s.id ? 'active' : '') + '">' + esc(s.title) + '</button>';
      }).join('') + '</div><div id="libBody"></div>';
    host.querySelectorAll('[data-lt]').forEach(function (b) {
      b.addEventListener('click', function () { libTab = b.dataset.lt; renderLibrary(host); });
    });
    var sec = sections.filter(function (s) { return s.id === libTab; })[0];
    if (!sec) return;
    var statuses = Store.readJson(KEYS.CONTENT_STATUS, {});
    var canEdit = Perms.hasAdminPermission(P.LIBRARY_MANAGE);
    host.querySelector('#libBody').innerHTML =
      '<div class="adm-tablewrap" style="max-height:58vh;overflow-y:auto;"><table class="adm-table"><thead><tr>' +
      '<th>Entry</th><th>Detail</th><th>Status</th>' + (canEdit ? '<th>Review</th>' : '') + '</tr></thead><tbody>' +
      sec.rows.map(function (r) {
        var st = statuses[r.key] || r.statusDefault;
        return '<tr><td><b>' + esc(r.main) + '</b></td><td class="sub">' + esc(r.sub) + '</td>' +
          '<td>' + badge(st === 'APPROVED' ? 'ACTIVE' : st === 'UNDER REVIEW' ? 'NEEDS_INFORMATION' : st === 'ARCHIVED' ? 'EXPIRED' : 'PENDING') + ' <span class="sub mono">' + st + '</span></td>' +
          (canEdit ? '<td><button class="adm-btn adm-btn-sm adm-btn-ghost" data-cy="' + esc(r.key) + '">Cycle</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
    host.querySelectorAll('[data-cy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.dataset.cy;
        var row = sec.rows.filter(function (r) { return r.key === key; })[0];
        var cur = statuses[key] || row.statusDefault;
        var next = CONTENT_STATES[(CONTENT_STATES.indexOf(cur) + 1) % CONTENT_STATES.length];
        statuses[key] = next;
        Store.writeJson(KEYS.CONTENT_STATUS, statuses);
        Store.logAdminAction('EDIT_CULTURAL_ENTRY', 'CulturalContentRecord', key, { after: { status: next } });
        toast(next.replace('_', ' '));
        renderLibrary(host);
      });
    });
  }

  /* ============================================================
     SYSTEM SETTINGS (§46)
     ============================================================ */
  function renderSystem(host) {
    var flags = Store.readJson(KEYS.FEATURE_FLAGS, {});
    var canManage = Perms.hasAdminPermission(P.SYSTEM_MANAGE);
    var countries = (window.RegData.countries || []);

    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">System settings</h2>' +

      '<div class="adm-two-col">' +
      '<div class="adm-panel"><h3>Feature flags</h3>' + Object.keys(flags).map(function (f) {
        return '<div class="adm-flag-row"><span>' + esc(humanFlag(f)) + '</span>' +
          '<span class="adm-switch"><input type="checkbox" data-flag="' + esc(f) + '"' + (flags[f] ? ' checked' : '') + (canManage ? '' : ' disabled') + '><span class="track"></span><span class="knob"></span></span></div>';
      }).join('') + '</div>' +

      '<div class="adm-panel"><h3>Configuration registry</h3><div class="adm-kv">' +
      kv('Countries', countries.length + ' entries · shared single registry') +
      kv('Dialling codes', esc(countries.slice(0, 3).map(function (c) { return c.code + ' ' + c.dial; }).join(', ')) + ' …') +
      kv('Institution types', (CFG.TYPES || []).length + ' configured') +
      kv('Roles / permissions', Object.keys(Perms.ROLE_PERMISSIONS).length + ' roles · ' + Object.keys(Perms.PERMISSIONS).length + ' permissions') +
      kv('Export formats', 'JSON · CSV · EAD3') +
      kv('Sync rules', 'Conflicting versions queue as disputes (human review)') +
      '</div></div></div>' +

      '<div class="adm-panel"><h3>Data retention</h3><div class="adm-form-grid">' +
      '<div class="adm-field"><label>Audit retention (days)</label><input class="adm-input" type="number" data-retention="auditDays" value="' + (flags.auditRetentionDays || 365) + '"' + (canManage ? '' : ' disabled') + '></div>' +
      '<div class="adm-field"><label>Export log retention (days)</label><input class="adm-input" type="number" data-retention="exportDays" value="' + (flags.exportRetentionDays || 180) + '"' + (canManage ? '' : ' disabled') + '></div>' +
      '</div></div>' +

      '<div class="adm-panel"><h3>Roles & permissions matrix</h3><div class="adm-tablewrap" style="max-height:40vh;overflow-y:auto;"><table class="adm-table"><thead><tr><th>Role</th><th>Permissions</th></tr></thead><tbody>' +
      Object.keys(Perms.ROLE_PERMISSIONS).map(function (role) {
        return '<tr><td><b>' + esc(role) + '</b></td><td class="mono" style="font-size:0.68rem;line-height:1.7;">' +
          Perms.ROLE_PERMISSIONS[role].map(esc).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    host.querySelectorAll('[data-flag]').forEach(function (cb) {
      cb.addEventListener('change', guard(P.SYSTEM_MANAGE, function () {
        flags[cb.dataset.flag] = cb.checked;
        Store.writeJson(KEYS.FEATURE_FLAGS, flags);
        Store.logAdminAction('CHANGE_FEATURE_FLAG', 'FeatureFlag', cb.dataset.flag, { after: { enabled: cb.checked } });
        toast('Flag saved.');
      }));
    });
    host.querySelectorAll('[data-retention]').forEach(function (inp) {
      inp.addEventListener('change', guard(P.SYSTEM_MANAGE, function () {
        flags[inp.dataset.retention] = +inp.value || 0;
        Store.writeJson(KEYS.FEATURE_FLAGS, flags);
        Store.logAdminAction('CHANGE_DATA_RETENTION', 'SystemSetting', inp.dataset.retention, { after: { days: +inp.value } });
        toast('Retention saved.');
      }));
    });

    function kv(k, v) { return '<span class="k">' + k + '</span><span class="v">' + v + '</span>'; }
  }
  function humanFlag(f) {
    return f.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  /* ============================================================
     GLOBAL SEARCH (§51)
     ============================================================ */
  $('adminGlobalSearch').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var q = this.value.trim().toLowerCase();
    if (q.length < 2) return;
    var results = [];

    Store.readJson(KEYS.INSTITUTIONS, []).forEach(function (i) {
      if (i.name.toLowerCase().indexOf(q) !== -1) results.push(['#/institutions', '🏛️ Institution', i.name]);
    });
    Store.institutionalApplications().forEach(function (a) {
      if ((a.applicationId + ' ' + (a.organisation || {}).name).toLowerCase().indexOf(q) !== -1) {
        results.push(['#/applications', '📥 Application', a.applicationId + ' — ' + (a.organisation || {}).name]);
      }
    });
    renderUsers && Store.readJson(KEYS.USERS, []).forEach(function (u) {
      if (u.name.toLowerCase().indexOf(q) !== -1) results.push(['#/users', '👥 User', u.name + ' — ' + u.institutionName]);
    });
    Store.readJson(KEYS.GRANTS, []).forEach(function (g) {
      if ((g.grantId + ' ' + g.institutionName).toLowerCase().indexOf(q) !== -1) results.push(['#/access', '🔑 Grant', g.grantId + ' — ' + g.institutionName]);
    });
    Store.readJson(KEYS.EXPORT_LOG, []).forEach(function (x) {
      if ((x.exportId + ' ' + x.institution).toLowerCase().indexOf(q) !== -1) results.push(['#/exports', '📤 Export', x.exportId + ' — ' + x.institution]);
    });
    (window.PEOPLE || []).slice(0, 2000).forEach(function (p) {
      if (results.length > 40) return;
      var hay = (p.id + ' ' + p.name + ' ' + ((p.kinship || {}).mutupo || '')).toLowerCase();
      if (hay.indexOf(q) !== -1) results.push(['#/datasets', '👤 Person', p.id + ' — ' + p.name]);
    });
    Object.keys(window.totemRegistry || {}).forEach(function (t) {
      if (t.toLowerCase().indexOf(q) !== -1) results.push(['#/library', '📜 Totem', t]);
    });
    (window.SCHOOLS_ZW || []).some(function (s) {
      if (s.toLowerCase().indexOf(q) !== -1) { results.push(['#/schools', '🏫 School', s]); return results.length > 44; }
      return false;
    });

    var host = $('adminView');
    host.innerHTML = '<h2 style="margin-top:0;font-size:1rem;">Search results for “' + esc(this.value.trim()) + '”</h2>' +
      (results.length
        ? '<div class="adm-tablewrap"><table class="adm-table"><tbody>' +
          results.slice(0, 50).map(function (r) {
            return '<tr class="rowlink" data-go="' + r[0] + '"><td style="width:34px;">' + r[1].split(' ')[0] + '</td><td>' + esc(r[1].split(' ').slice(1).join(' ')) + '</td><td><b>' + esc(r[2]) + '</b></td></tr>';
          }).join('') + '</tbody></table></div>'
        : emptyState('🔍', 'No matches', 'Search spans institutions, users, IDs, persons, schools and totems.'));
    host.querySelectorAll('[data-go]').forEach(function (tr) {
      tr.addEventListener('click', function () { location.hash = tr.dataset.go; });
    });
  });

  /* ---------- start ---------- */
  buildNav();
  buildHeader();
  route();
})();
