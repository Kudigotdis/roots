/* ============================================================
   INSTITUTIONAL EFFECTIVE ACCESS (Setup 4 §2).
   Builds the single object every workspace module consumes:
   type -> membership -> role -> permissions -> grants ->
   modules -> subscription -> accessStatus. Also hosts the
   workspace-local storage helpers (projects, saved queries,
   recent work, corrections, org roster, org audit).
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.RootsInstConfig;
  var KEYS = CFG.KEYS;
  var WSC = window.RootsInstWorkspaceConfig;

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (e) { return fallback; }
  }
  function writeJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- workspace-local stores ---------- */
  var STORE_KEYS = {
    PROJECTS: 'roots_inst_projects',
    SAVED: 'roots_inst_saved_queries',
    RECENT_RECORDS: 'roots_inst_recent_records',
    RECENT_EXPORTS: 'roots_inst_recent_exports',
    CORRECTIONS: 'roots_inst_corrections',
    NOTIFICATIONS: 'roots_inst_notifications',
    ORG_USERS: 'roots_inst_org_users',
    ORG_AUDIT: 'roots_inst_org_audit',
    ORG_PROFILE: 'roots_inst_org_profile',
    LAST_SYNC: 'roots_inst_last_sync'
  };

  function get(key, fb) { return readJson(STORE_KEYS[key] || key, fb == null ? [] : fb); }
  function set(key, val) { writeJson(STORE_KEYS[key] || key, val); }
  function push(key, entry, cap) {
    var list = get(key);
    list.unshift(entry);
    set(key, list.slice(0, cap || 300));
  }

  function logOrgAudit(action, targetType, targetId, detail) {
    push('ORG_AUDIT', {
      id: 'OA-' + Date.now().toString(36).toUpperCase(),
      at: new Date().toISOString(),
      user: (currentSession() || {}).adminName || 'system',
      action: action,
      dataset: targetType || '',
      targetId: targetId || '',
      result: (detail && detail.result) || 'SUCCESS'
    }, 500);
  }

  function currentSession() {
    return readJson(KEYS.SESSION, null);
  }

  function notify(type, message) {
    push('NOTIFICATIONS', { id: 'N-' + Date.now().toString(36).toUpperCase(), type: type, message: message, at: new Date().toISOString(), read: false });
  }

  /* ---------- geographic scope ---------- */
  function scopeLabel(gs) {
    if (!gs) return '—';
    if (gs.level === 'scopeNational') return 'Zimbabwe — National';
    if (gs.level === 'scopeMultiCountry') return 'Countries: ' + (gs.countries || []).join(', ');
    if (gs.level === 'scopeProvince') return 'Provinces: ' + (gs.provinces || []).join(', ');
    if (gs.level === 'scopeDistrict') return 'Districts: ' + (gs.districts || []).join(', ');
    if (gs.level === 'scopeVillage' || gs.level === 'scopeWard' || gs.level === 'scopeChiefdom') {
      return gs.textValues || gs.level;
    }
    return gs.textValues || gs.level || '—';
  }

  function buildGeographyMatcher(gs) {
    if (!gs || gs.level === 'scopeNational' || gs.level === 'scopeMultiCountry') return function () { return true; };
    if (gs.level === 'scopeProvince') {
      var provs = (gs.provinces || []).map(function (p) { return String(p).toLowerCase(); });
      return function (p) {
        var a = p.admin || {};
        return provs.indexOf(String(a.province || '').toLowerCase()) !== -1 ||
          provs.indexOf(String(p.location || '').toLowerCase()) !== -1;
      };
    }
    if (gs.level === 'scopeDistrict') {
      var dists = (gs.districts || []).map(function (d) { return String(d).toLowerCase(); });
      return function (p) {
        var a = p.admin || {};
        return dists.indexOf(String(a.district || '').toLowerCase()) !== -1;
      };
    }
    var words = String(gs.textValues || '').toLowerCase().split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!words.length) return function () { return true; };
    return function (p) {
      var a = p.admin || {};
      var hay = [a.ward, a.chief, a.headman, a.sabhuku, a.villageBookId, a.district, a.province]
        .concat(words).join(' ').toLowerCase();
      return words.some(function (w) { return hay.indexOf(w) !== -1; });
    };
  }

  /* ---------- effective access computation ---------- */
  function compute(session) {
    session = session || currentSession();
    if (!session) return null;

    var apps = readJson(KEYS.APPLICATIONS, []);
    var app = null;
    for (var i = 0; i < apps.length; i++) if (apps[i].applicationId === session.applicationId) { app = apps[i]; break; }
    var accounts = readJson(KEYS.ACCOUNTS, []);
    var account = null;
    for (var j = 0; j < accounts.length; j++) if (accounts[j].applicationId === session.applicationId) { account = accounts[j]; break; }

    var insts = readJson('roots_admin_institutions', []);
    var inst = insts.filter(function (x) { return x.sourceApplicationId === session.applicationId; })[0] || null;

    var grants = readJson('roots_admin_grants', []).filter(function (g) {
      return g.applicationId === session.applicationId && g.status === 'ACTIVE';
    });
    var grant = grants[0] || null;

    var subs = readJson('roots_admin_subscriptions', []).filter(function (s) {
      return s.institutionId === (inst ? inst.institutionId : '') || s.institutionName === session.institutionName;
    });
    var sub = subs[0] || null;

    var suspended = readJson('roots_admin_user_suspensions', []).some(function (s) {
      return s.active && s.key === session.applicationId + '|' + String(session.adminName || '').toLowerCase();
    });

    var modules = [];
    ((grant && grant.approvedModules) || (app && app.modules) || ['CORE']).forEach(function (m) {
      if (modules.indexOf(m) === -1) modules.push(m);
    });
    if (sub && (sub.status === 'ACTIVE' || sub.status === 'TRIAL')) {
      (sub.modules || []).forEach(function (m) { if (modules.indexOf(m) === -1) modules.push(m); });
    }

    var rawDatasets = (grant && grant.approvedDatasets) || Object.keys((app && app.dataAccess) || {});
    /* Normalise onboarding item-level keys (accessSearchPeople…) to canonical groups (PEOPLE…). */
    var datasets = [];
    (CFG.DATA_GROUPS || []).forEach(function (g) {
      var hit = rawDatasets.indexOf(g.id) !== -1 ||
        (g.items || []).some(function (it) { return rawDatasets.indexOf(it.id) !== -1; });
      if (hit) datasets.push(g.id);
    });
    rawDatasets.forEach(function (d) { if (datasets.indexOf(d) === -1) datasets.push(d); });
    if (!datasets.length) datasets = ['PEOPLE'];

    var personLevelAllowed = grant ? !!grant.personLevelAllowed : false;
    var anonymizationRequired = grant ? !!grant.anonymizationRequired : true;

    var allowedExports = ['CSV', 'JSON'];
    if (modules.indexOf('ARCHIVE_SUITE') !== -1 || modules.indexOf('HERITAGE_SUITE') !== -1) allowedExports.push('EAD3');

    var role = session.role || 'ADMINISTRATOR';
    var permissions = WSC.permissionsForRole(role).slice();
    if (!account || account.status !== 'ACTIVE' || !(app && app.status === 'ACTIVE')) {
      /* Provisional access: keep workspace usable but flag it. */
    }

    return {
      institutionId: inst ? inst.institutionId : session.applicationId,
      institutionType: session.typeCode || (app && app.typeCode) || '',
      institutionName: session.institutionName,
      userId: account ? ('ACCT-' + account.applicationId) : session.adminName,
      personId: session.adminName,
      roleId: role,
      permissions: permissions,
      datasets: datasets,
      personLevelAllowed: personLevelAllowed,
      anonymizationRequired: anonymizationRequired,
      geographicScope: (app && app.geographicScope) || {},
      allowedExports: allowedExports,
      modules: modules,
      subscriptionStatus: sub ? sub.status : (inst ? inst.subscriptionStatus : 'PROVISIONAL'),
      accessStatus: suspended ? 'SUSPENDED' : 'ACTIVE',

      /* extras used across modules */
      application: app,
      grantExpiry: grant ? grant.expiresAt : null,
      planName: sub ? sub.product : ((WSC.configForType(session.typeCode).planSuite || 'CORE') + ' plan'),
      verification: inst ? inst.verificationStatus : 'PENDING',
      provisional: !(app && app.status === 'ACTIVE'),
      can: function (perm) { return this.accessStatus === 'ACTIVE' && this.permissions.indexOf(perm) !== -1; },
      hasModule: function (id) { return this.modules.indexOf(id) !== -1; },
      datasetAllowed: function (name) { return this.datasets.indexOf(name) !== -1; },
      inGeography: buildGeographyMatcher((app && app.geographicScope) || {}),
      scopeLabel: scopeLabel((app && app.geographicScope) || {})
    };
  }

  window.RootsInstStore = {
    KEYS: STORE_KEYS,
    get: get,
    set: set,
    push: push,
    readJson: readJson,
    writeJson: writeJson,
    logOrgAudit: logOrgAudit,
    notify: notify,
    currentSession: currentSession
  };

  window.RootsInstAccess = {
    compute: compute,
    scopeLabel: scopeLabel,
    buildGeographyMatcher: buildGeographyMatcher
  };
})();
