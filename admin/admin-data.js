/* ============================================================
   ROOTS ADMINISTRATOR — data layer (Setup 3 §56-58, §65-69).
   localStorage-backed demo data: admin accounts, institutions,
   application meta, memberships, access grants, products,
   subscriptions, audit log, dispute resolutions, queues.
   Reads institutional applications in place — never duplicates
   them (shared registry principle, Setup 3 §47/§76).
   ============================================================ */
(function () {
  'use strict';

  var KEYS = {
    ACCOUNTS: 'roots_admin_accounts',
    SESSION: 'roots_admin_session',
    ATTEMPTS: 'roots_admin_attempts',
    INSTITUTIONS: 'roots_admin_institutions',
    APPLICATION_META: 'roots_admin_application_meta',
    USERS: 'roots_admin_users',
    SUSPENSIONS: 'roots_admin_user_suspensions',
    ACCESS_REQUESTS: 'roots_admin_access_requests',
    GRANTS: 'roots_admin_grants',
    PRODUCTS: 'roots_admin_products',
    SUBSCRIPTIONS: 'roots_admin_subscriptions',
    AUDIT: 'roots_admin_audit',
    DISPUTE_RESOLUTIONS: 'roots_admin_dispute_resolutions',
    DATASET_CLASSES: 'roots_admin_dataset_classes',
    FIELD_GOVERNANCE: 'roots_admin_field_governance',
    SUBMITTED_AREAS: 'roots_admin_submitted_areas',
    APPROVED_AREAS: 'roots_admin_approved_areas',
    PENDING_SCHOOLS: 'roots_admin_pending_schools',
    APPROVED_SCHOOLS: 'roots_admin_approved_schools',
    CONTENT_STATUS: 'roots_admin_content_status',
    FEATURE_FLAGS: 'roots_admin_feature_flags',
    EXPORT_LOG: 'roots_admin_export_log',
    SEQ: 'roots_admin_seq'
  };

  /* Institutional storage (written by institutional/ pages) */
  var INST_KEYS = {
    APPLICATIONS: 'roots_institutional_applications',
    ACCOUNTS: 'roots_institutional_accounts'
  };

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (e) { return fallback; }
  }
  function writeJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  async function hashPassword(pw) {
    try {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('roots::roots-admin::' + pw));
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) {
      var h = 5381, s = 'roots::roots-admin::' + pw;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
      return 'x' + (h >>> 0).toString(16);
    }
  }

  function nextId(prefix) {
    var seq = readJson(KEYS.SEQ, 500);
    seq += 1;
    writeJson(KEYS.SEQ, seq);
    return prefix + String(seq).padStart(5, '0');
  }

  /* ---------- seed ---------- */
  var SEED_ADMIN_ACCOUNTS = [
    { adminId: 'ADM-00001', name: 'Roots Super Admin', whatsappCountry: 'ZW', whatsapp: '0770000001', role: 'Super Administrator', password: 'super2026', status: 'ACTIVE' },
    { adminId: 'ADM-00002', name: 'Rudo Institutions', whatsappCountry: 'ZW', whatsapp: '0770000002', role: 'Institution Administrator', password: 'institution2026', status: 'ACTIVE' },
    { adminId: 'ADM-00003', name: 'Data Keeper', whatsappCountry: 'ZW', whatsapp: '0770000003', role: 'Data Administrator', password: 'data2026', status: 'ACTIVE' },
    { adminId: 'ADM-00004', name: 'Finance Desk', whatsappCountry: 'ZW', whatsapp: '0770000004', role: 'Finance Administrator', password: 'finance2026', status: 'ACTIVE' },
    { adminId: 'ADM-00005', name: 'Quiet Auditor', whatsappCountry: 'ZW', whatsapp: '0770000005', role: 'Auditor', password: 'audit2026', status: 'ACTIVE' }
  ];

  var SEED_INSTITUTIONS = [
    {
      institutionId: 'INST-00001', name: 'National Museums & Monuments of Zimbabwe', type: 'MUSEUM_HERITAGE',
      country: 'ZW', status: 'ACTIVE', verificationStatus: 'VERIFIED', userCount: 6,
      subscriptionStatus: 'ACTIVE', purchasedModules: ['CORE', 'ARCHIVE_SUITE', 'HERITAGE_SUITE'],
      geographicScope: 'Zimbabwe - National', lastActivityAt: '2026-08-19T09:12:00.000Z', sourceApplicationId: null
    },
    {
      institutionId: 'INST-00002', name: 'Great Zimbabwe University — Culture Faculty', type: 'UNIVERSITY_RESEARCH',
      country: 'ZW', status: 'ACTIVE', verificationStatus: 'VERIFIED', userCount: 4,
      subscriptionStatus: 'TRIAL', purchasedModules: ['CORE', 'RESEARCH_SUITE'],
      geographicScope: 'Masvingo Province', lastActivityAt: '2026-08-21T14:40:00.000Z', sourceApplicationId: null
    },
    {
      institutionId: 'INST-00003', name: 'Chieftainship House of Chivi', type: 'TRADITIONAL_AUTHORITY',
      country: 'ZW', status: 'SUSPENDED', verificationStatus: 'PENDING', userCount: 2,
      subscriptionStatus: 'EXPIRED', purchasedModules: ['CORE'],
      geographicScope: 'Chivi District', lastActivityAt: '2026-07-02T08:00:00.000Z', sourceApplicationId: null
    }
  ];

  var SEED_ACCESS_REQUESTS = [
    {
      requestId: 'REQ-00451', institutionId: 'INST-00002', institutionName: 'Great Zimbabwe University — Culture Faculty',
      requestedBy: 'Dr. Jane Moyo', purpose: 'Academic research on Shona kinship terminologies',
      datasets: ['PEOPLE', 'LINEAGE', 'CULTURAL'], geography: 'Masvingo / Chivi',
      personLevel: false, exportFormat: 'CSV', durationDays: 30,
      submittedAt: '2026-08-18T10:00:00.000Z', status: 'PENDING', fields: ['Age', 'Gender', 'Language', 'Totem']
    },
    {
      requestId: 'REQ-00452', institutionId: 'INST-00001', institutionName: 'National Museums & Monuments of Zimbabwe',
      requestedBy: 'Curation Team', purpose: 'EAD3 finding aid for national archive collection',
      datasets: ['LINEAGE', 'CULTURAL'], geography: 'Zimbabwe - National',
      personLevel: false, exportFormat: 'EAD3', durationDays: 90,
      submittedAt: '2026-08-20T13:30:00.000Z', status: 'PENDING', fields: ['Names', 'Totem', 'Chidawo']
    },
    {
      requestId: 'REQ-00450', institutionId: 'INST-00003', institutionName: 'Chieftainship House of Chivi',
      requestedBy: 'Sabhuku Registry Desk', purpose: 'Village book reconciliation',
      datasets: ['ADMINISTRATIVE'], geography: 'Chivi District',
      personLevel: true, exportFormat: 'JSON', durationDays: 14,
      submittedAt: '2026-08-05T08:15:00.000Z', status: 'PENDING', fields: ['Ward', 'Village', 'Household head']
    }
  ];

  var SEED_IMPORTS = [
    { importId: 'IMP-00301', source: 'ROOTS_SYNC', institution: 'National Museums & Monuments of Zimbabwe', format: 'ROOTS_SYNC', records: 412, newCount: 38, updated: 370, disputed: 4, importedBy: 'Curation Team', date: '2026-08-19T09:12:00.000Z' },
    { importId: 'IMP-00300', source: 'Village Books Drive', institution: 'Great Zimbabwe University — Culture Faculty', format: 'CSV', records: 96, newCount: 12, updated: 80, disputed: 2, importedBy: 'Dr. Jane Moyo', date: '2026-08-17T11:05:00.000Z' },
    { importId: 'IMP-00299', source: 'Archive digitisation batch 7', institution: 'National Museums & Monuments of Zimbabwe', format: 'EAD3', records: 158, newCount: 158, updated: 0, disputed: 0, importedBy: 'Curation Team', date: '2026-08-11T15:45:00.000Z' }
  ];

  var SEED_SUBMITTED_AREAS = [
    { areaId: 'AREA-00121', suggested: 'Domboshava Rock', country: 'ZW', region: 'Mashonaland East Province', town: 'Domboshava', submittedBy: 'Regular User onboarding', date: '2026-08-20T07:20:00.000Z', status: 'PENDING' },
    { areaId: 'AREA-00122', suggested: 'Chilonga Business Centre', country: 'ZW', region: 'Masvingo Province', town: 'Chilonga', submittedBy: 'Institutional workspace', date: '2026-08-21T16:02:00.000Z', status: 'PENDING' },
    { areaId: 'AREA-00123', suggested: 'Madziva Mission', country: 'ZW', region: 'Mashonaland Central Province', town: 'Madziva', submittedBy: 'Regular User onboarding', date: '2026-08-22T09:55:00.000Z', status: 'PENDING' }
  ];

  var SEED_PENDING_SCHOOLS = [
    { schoolId: 'PSCH-00201', name: 'Zvishavane Academy of Science', type: 'Secondary', country: 'ZW', province: 'Midlands Province', district: 'Zvishavane', city: 'Zvishavane', submittedBy: 'Regular User onboarding', date: '2026-08-21T12:00:00.000Z', status: 'PENDING' },
    { schoolId: 'PSCH-00202', name: 'Hatcliffe ECD Bright Futures', type: 'Creche', country: 'ZW', province: 'Harare Province', district: 'Harare', city: 'Hatcliffe', submittedBy: 'Regular User onboarding', date: '2026-08-22T08:30:00.000Z', status: 'PENDING' }
  ];

  var SEED_EXPORT_HISTORY = [
    { exportId: 'EXP-00701', institution: 'National Museums & Monuments of Zimbabwe', user: 'Curation Team', dataset: 'Totem Directory', format: 'EAD3', records: 42, anonymized: true, date: '2026-08-15T10:30:00.000Z', status: 'COMPLETED' },
    { exportId: 'EXP-00702', institution: 'Great Zimbabwe University — Culture Faculty', user: 'Dr. Jane Moyo', dataset: 'People (Lineage view)', format: 'CSV', records: 533, anonymized: false, date: '2026-08-20T15:10:00.000Z', status: 'PENDING_APPROVAL' }
  ];

  var DEFAULT_FEATURE_FLAGS = {
    institutionalExportsRequireApproval: false,
    personLevelAccessDefaultOff: true,
    autoPublishCulturalContributions: false,
    allowSelfServeSubscriptionUpgrade: false,
    syncConflictsAutoQueueDisputes: true
  };

  var DEFAULT_DATASET_CLASSES = {
    PEOPLE: 'INSTITUTIONAL', LINEAGE: 'INSTITUTIONAL', TOTEMS: 'PUBLIC',
    ORAL_CULTURE: 'PUBLIC', ADMIN_GEOGRAPHY: 'PUBLIC', VILLAGE_BOOKS: 'RESTRICTED',
    SCHOOLS: 'PUBLIC', ARCHIVES: 'INSTITUTIONAL', HERITAGE: 'PUBLIC'
  };

  var DEFAULT_FIELD_GOVERNANCE = [
    { field: 'fullName', dataset: 'PERSON', privacyClass: 'INSTITUTIONAL', searchable: true, exportable: 'CONTROLLED', anonymization: 'FIRST_NAME_ONLY' },
    { field: 'kinship.mutupo', dataset: 'PERSON', privacyClass: 'PUBLIC', searchable: true, exportable: 'YES', anonymization: 'NONE' },
    { field: 'kinship.chidawo', dataset: 'PERSON', privacyClass: 'INSTITUTIONAL', searchable: true, exportable: 'CONTROLLED', anonymization: 'NONE' },
    { field: 'born', dataset: 'PERSON', privacyClass: 'INSTITUTIONAL', searchable: true, exportable: 'YES', anonymization: 'YEAR_ONLY' },
    { field: 'ethnicity.specificGroup', dataset: 'PERSON', privacyClass: 'INSTITUTIONAL', searchable: true, exportable: 'YES', anonymization: 'NONE' },
    { field: 'admin.ward', dataset: 'PERSON', privacyClass: 'RESTRICTED', searchable: false, exportable: 'NO', anonymization: 'NONE' },
    { field: 'whatsapp', dataset: 'ACCOUNT', privacyClass: 'PRIVATE', searchable: false, exportable: 'NEVER', anonymization: 'ALWAYS' },
    { field: 'lifecycleState', dataset: 'LIFECYCLE', privacyClass: 'RESTRICTED', searchable: false, exportable: 'NO', anonymization: 'NONE' }
  ];

  function seed() {
    if (!localStorage.getItem(KEYS.ACCOUNTS)) {
      var dialFor = function (cc) {
        try { var c = window.RegData.countryByCode[cc]; return c ? digits(c.dial) : ''; } catch (e) { return ''; }
      };
      Promise.all(SEED_ADMIN_ACCOUNTS.map(function (a) {
        return hashPassword(a.password).then(function (hash) {
          return {
            adminId: a.adminId, name: a.name, whatsappCountry: a.whatsappCountry,
            whatsapp: a.whatsapp, whatsappDigits: digits(a.whatsapp),
            whatsappFull: dialFor(a.whatsappCountry) + digits(a.whatsapp),
            role: a.role, authHash: hash, status: a.status
          };
        });
      })).then(function (accounts) { writeJson(KEYS.ACCOUNTS, accounts); });
    }
    if (!localStorage.getItem(KEYS.INSTITUTIONS)) writeJson(KEYS.INSTITUTIONS, SEED_INSTITUTIONS.slice());
    if (!localStorage.getItem(KEYS.USERS)) {
      writeJson(KEYS.USERS, SEED_INSTITUTIONS.map(function (inst, i) {
        return {
          userId: 'IUSR-' + (100 + i), name: i === 0 ? 'Curation Team Lead' : i === 1 ? 'Dr. Jane Moyo' : 'Registry Clerk',
          institutionId: inst.institutionId, institutionName: inst.name,
          role: i === 0 ? 'Archivist' : i === 1 ? 'Researcher' : 'Data Officer',
          whatsapp: '+263 772 00' + (300 + i), membership: inst.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
          lastLogin: inst.lastActivityAt
        };
      }));
    }
    if (!localStorage.getItem(KEYS.ACCESS_REQUESTS)) writeJson(KEYS.ACCESS_REQUESTS, SEED_ACCESS_REQUESTS.slice());
    if (!localStorage.getItem(KEYS.PRODUCTS)) writeJson(KEYS.PRODUCTS, defaultProducts());
    if (!localStorage.getItem(KEYS.SUBSCRIPTIONS)) {
      writeJson(KEYS.SUBSCRIPTIONS, [
        { subscriptionId: 'SUB-00901', institutionId: 'INST-00001', institutionName: SEED_INSTITUTIONS[0].name, product: 'Heritage Suite', modules: ['CORE', 'ARCHIVE_SUITE', 'HERITAGE_SUITE'], userLimit: 25, usersUsed: 6, start: '2026-03-01', renewal: '2027-03-01', status: 'ACTIVE', interval: 'ANNUAL', amount: 1200, currency: 'USD' },
        { subscriptionId: 'SUB-00902', institutionId: 'INST-00002', institutionName: SEED_INSTITUTIONS[1].name, product: 'Research Suite', modules: ['CORE', 'RESEARCH_SUITE'], userLimit: 10, usersUsed: 4, start: '2026-08-01', renewal: '2026-09-01', status: 'TRIAL', interval: 'MONTHLY', amount: 90, currency: 'USD' },
        { subscriptionId: 'SUB-00903', institutionId: 'INST-00003', institutionName: SEED_INSTITUTIONS[2].name, product: 'Core Institutional', modules: ['CORE'], userLimit: 5, usersUsed: 2, start: '2026-01-01', renewal: '2026-07-01', status: 'EXPIRED', interval: 'ANNUAL', amount: 300, currency: 'USD' }
      ]);
    }
    if (!localStorage.getItem(KEYS.DISPUTE_RESOLUTIONS)) writeJson(KEYS.DISPUTE_RESOLUTIONS, []);
    if (!localStorage.getItem(KEYS.DATASET_CLASSES)) writeJson(KEYS.DATASET_CLASSES, DEFAULT_DATASET_CLASSES);
    if (!localStorage.getItem(KEYS.FIELD_GOVERNANCE)) writeJson(KEYS.FIELD_GOVERNANCE, DEFAULT_FIELD_GOVERNANCE.slice());
    if (!localStorage.getItem(KEYS.SUBMITTED_AREAS)) writeJson(KEYS.SUBMITTED_AREAS, SEED_SUBMITTED_AREAS.slice());
    if (!localStorage.getItem(KEYS.APPROVED_AREAS)) writeJson(KEYS.APPROVED_AREAS, []);
    if (!localStorage.getItem(KEYS.PENDING_SCHOOLS)) writeJson(KEYS.PENDING_SCHOOLS, SEED_PENDING_SCHOOLS.slice());
    if (!localStorage.getItem(KEYS.APPROVED_SCHOOLS)) writeJson(KEYS.APPROVED_SCHOOLS, []);
    if (!localStorage.getItem(KEYS.CONTENT_STATUS)) writeJson(KEYS.CONTENT_STATUS, {});
    if (!localStorage.getItem(KEYS.FEATURE_FLAGS)) writeJson(KEYS.FEATURE_FLAGS, DEFAULT_FEATURE_FLAGS);
    if (!localStorage.getItem(KEYS.EXPORT_LOG)) writeJson(KEYS.EXPORT_LOG, SEED_EXPORT_HISTORY.slice());
    if (!localStorage.getItem(KEYS.AUDIT)) writeJson(KEYS.AUDIT, []);
    if (!localStorage.getItem(KEYS.GRANTS)) writeJson(KEYS.GRANTS, []);
    if (!localStorage.getItem(KEYS.APPLICATION_META)) writeJson(KEYS.APPLICATION_META, {});

    /* Adopt any already-approved institutional applications as institutions
       (keeps admin registry in step with the B1 demo provisioning). */
    try {
      var apps = readJson(INST_KEYS.APPLICATIONS, []);
      var insts = readJson(KEYS.INSTITUTIONS, []);
      var known = {};
      insts.forEach(function (i) { if (i.sourceApplicationId) known[i.sourceApplicationId] = true; });
      apps.forEach(function (app) {
        if (app.status === 'ACTIVE' && !known[app.applicationId]) {
          insts.push(makeInstitutionFromApplication(app));
        }
      });
      writeJson(KEYS.INSTITUTIONS, insts);
    } catch (e) {}
  }

  function makeInstitutionFromApplication(app) {
    return {
      institutionId: nextId('INST-'),
      name: app.organisation && app.organisation.name ? app.organisation.name : 'Unnamed organisation',
      type: app.typeCode || '',
      country: (app.location && app.location.country) || 'ZW',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      userCount: 1 + ((app.staff && app.staff.length) || 0),
      subscriptionStatus: 'ACTIVE',
      purchasedModules: (app.modules && app.modules.length ? app.modules : ['CORE']),
      geographicScope: scopeLabel(app.geographicScope),
      lastActivityAt: app.submittedAt || new Date().toISOString(),
      sourceApplicationId: app.applicationId
    };
  }

  function scopeLabel(gs) {
    if (!gs) return '—';
    if (gs.level === 'scopeNational') return 'Zimbabwe - National';
    if (gs.level === 'scopeMultiCountry') return 'Multi-country';
    if (gs.level === 'scopeProvince') return 'Provinces: ' + (gs.provinces || []).join(', ');
    if (gs.level === 'scopeDistrict') return 'Districts: ' + (gs.districts || []).join(', ');
    if (gs.textValues) return gs.textValues;
    return gs.level || '—';
  }

  function defaultProducts() {
    var base = [
      { id: 'core', name: 'Core Institutional', modules: ['CORE'], types: [], amount: 0, interval: 'CUSTOM' },
      { id: 'research', name: 'Research Suite', modules: ['CORE', 'RESEARCH_SUITE'], types: ['UNIVERSITY_RESEARCH', 'GENEALOGY'], amount: 90, interval: 'MONTHLY' },
      { id: 'government', name: 'Government Suite', modules: ['CORE', 'GOVERNMENT_SUITE'], types: ['GOVERNMENT'], amount: 250, interval: 'MONTHLY' },
      { id: 'traditional', name: 'Traditional Authority Suite', modules: ['CORE', 'TRADITIONAL_SUITE'], types: ['TRADITIONAL_AUTHORITY'], amount: 60, interval: 'MONTHLY' },
      { id: 'archive', name: 'Archive Suite', modules: ['CORE', 'ARCHIVE_SUITE'], types: ['ARCHIVE'], amount: 150, interval: 'MONTHLY' },
      { id: 'heritage', name: 'Heritage Suite', modules: ['CORE', 'HERITAGE_SUITE'], types: ['MUSEUM_HERITAGE', 'CULTURAL_ORG'], amount: 140, interval: 'MONTHLY' },
      { id: 'education', name: 'Education Suite', modules: ['CORE', 'EDUCATION'], types: ['EDUCATION'], amount: 70, interval: 'MONTHLY' },
      { id: 'cultural', name: 'Cultural Suite', modules: ['CORE', 'HERITAGE_SUITE', 'RESEARCH_SUITE'], types: ['CULTURAL_ORG', 'NGO'], amount: 110, interval: 'MONTHLY' },
      { id: 'genealogy', name: 'Genealogy Research Suite', modules: ['CORE', 'RESEARCH_SUITE', 'ARCHIVE_SUITE'], types: ['GENEALOGY'], amount: 130, interval: 'MONTHLY' }
    ];
    return base.map(function (p) {
      return {
        id: p.id, name: p.name,
        description: p.name + ' bundle for Roots institutional workspaces.',
        institutionTypes: p.types,
        includedModules: p.modules,
        includedPermissions: [],
        allowedExports: ['JSON', 'CSV'].concat(p.id === 'archive' || p.id === 'heritage' ? ['EAD3'] : []),
        geographicLimit: null,
        userLimit: p.amount === 0 ? 3 : Math.max(5, Math.round(p.amount / 15)),
        pricing: { currency: 'USD', amount: p.amount, interval: p.interval },
        active: true,
        createdAt: '2026-01-15T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z'
      };
    });
  }

  /* ---------- audit ---------- */
  function currentSession() { return readJson(KEYS.SESSION, null); }

  function logAdminAction(action, targetType, targetId, opts) {
    opts = opts || {};
    var s = currentSession();
    var entry = {
      id: 'AUD-' + Date.now().toString(36).toUpperCase(),
      adminUserId: s ? s.adminId : 'SYSTEM',
      adminName: s ? s.name : 'System',
      action: action,
      targetType: targetType,
      targetId: targetId,
      institutionId: opts.institutionId || null,
      before: opts.before !== undefined ? opts.before : null,
      after: opts.after !== undefined ? opts.after : null,
      result: opts.result || 'SUCCESS',
      reason: opts.reason || '',
      createdAt: new Date().toISOString(),
      deviceId: 'local-demo'
    };
    var log = readJson(KEYS.AUDIT, []);
    log.unshift(entry);
    writeJson(KEYS.AUDIT, log.slice(0, 2000));
    return entry;
  }

  /* ---------- counters (Setup 3 §58) ---------- */
  function getInstitutionCount() { return readJson(KEYS.INSTITUTIONS, []).length; }
  function getPendingApplicationCount() {
    return institutionalApplications().filter(function (a) {
      return a.status === 'UNDER REVIEW' || a.status === 'NEEDS_INFORMATION';
    }).length;
  }
  function getActiveInstitutionUserCount() {
    var users = readJson(KEYS.USERS, []);
    var n = users.filter(function (u) { return u.membership === 'ACTIVE'; }).length;
    institutionalAccounts().forEach(function (acc) {
      if (acc.status === 'ACTIVE' && !users.some(function (u) { return u.institutionName === acc.institutionName && u.name === acc.adminName; })) n += 1;
    });
    return n;
  }
  function getPendingAccessRequestCount() {
    return readJson(KEYS.ACCESS_REQUESTS, []).filter(function (r) { return r.status === 'PENDING'; }).length;
  }
  function getOpenDisputeCount() {
    var resolved = readJson(KEYS.DISPUTE_RESOLUTIONS, []).map(function (d) { return d.personId; });
    var people = window.PEOPLE || [];
    return people.filter(function (p) { return p.sync && p.sync._disputed && resolved.indexOf(p.id) === -1; }).length;
  }
  function getActiveSubscriptionCount() {
    return readJson(KEYS.SUBSCRIPTIONS, []).filter(function (s) {
      return s.status === 'ACTIVE' || s.status === 'TRIAL';
    }).length;
  }
  function getMonthlyExportCount() {
    var month = new Date().toISOString().slice(0, 7);
    return readJson(KEYS.EXPORT_LOG, []).filter(function (e) {
      return (e.date || '').slice(0, 7) === month;
    }).length;
  }
  function getSuspendedInstitutionCount() {
    return readJson(KEYS.INSTITUTIONS, []).filter(function (i) { return i.status === 'SUSPENDED'; }).length;
  }

  /* ---------- shared readers ---------- */
  function institutionalApplications() { return readJson(INST_KEYS.APPLICATIONS, []); }
  function institutionalAccounts() { return readJson(INST_KEYS.ACCOUNTS, []); }

  function isUserSuspended(applicationId, adminName) {
    var list = readJson(KEYS.SUSPENSIONS, []);
    var key = (applicationId || '') + '|' + String(adminName || '').toLowerCase();
    return list.some(function (s) { return s.key === key && s.active; });
  }

  function setUserSuspension(applicationId, adminName, active, reason) {
    var list = readJson(KEYS.SUSPENSIONS, []);
    var key = (applicationId || '') + '|' + String(adminName || '').toLowerCase();
    var hit = list.filter(function (s) { return s.key === key; })[0];
    if (hit) { hit.active = active; hit.reason = reason || ''; hit.at = new Date().toISOString(); }
    else list.push({ key: key, applicationId: applicationId, adminName: adminName, active: active, reason: reason || '', at: new Date().toISOString() });
    writeJson(KEYS.SUSPENSIONS, list);
    logAdminAction(active ? 'SUSPEND_USER' : 'RESTORE_USER', 'InstitutionUser', key, { reason: reason || '', after: { active: active } });
    notifyInstitution(applicationId, 'admin', active
      ? 'Workspace account ' + adminName + ' was SUSPENDED by the Roots Administrator.' + (reason ? ' Reason: ' + reason : '')
      : 'Workspace account ' + adminName + ' was restored by the Roots Administrator.');
  }

  /* ---------- application review actions (Setup 3 §65-66) ---------- */
  function findInstitutionalIndex(applications, appId) {
    for (var i = 0; i < applications.length; i++) {
      if (applications[i].applicationId === appId) return i;
    }
    return -1;
  }

  function setApplicationStatus(appId, status, extraMeta) {
    var apps = institutionalApplications();
    var ix = findInstitutionalIndex(apps, appId);
    if (ix === -1) return null;
    var before = apps[ix].status;
    apps[ix].status = status;
    apps[ix].reviewedAt = new Date().toISOString();
    writeJson(INST_KEYS.APPLICATIONS, apps);

    var meta = readJson(KEYS.APPLICATION_META, {});
    var m = meta[appId] || { applicationId: appId };
    m.status = status;
    m.history = m.history || [];
    m.history.push({ from: before, to: status, at: apps[ix].reviewedAt });
    Object.keys(extraMeta || {}).forEach(function (k) { m[k] = extraMeta[k]; });
    meta[appId] = m;
    writeJson(KEYS.APPLICATION_META, meta);
    return apps[ix];
  }

  function approveApplication(appId, config) {
    var apps = institutionalApplications();
    var ix = findInstitutionalIndex(apps, appId);
    if (ix === -1) return null;
    var app = apps[ix];

    setApplicationStatus(appId, 'ACTIVE', {
      reviewerNote: config.reviewerNote || '',
      approvedBy: (currentSession() || {}).name || ''
    });

    /* Institution VERIFIED */
    var insts = readJson(KEYS.INSTITUTIONS, []);
    var inst = null;
    for (var i = 0; i < insts.length; i++) {
      if (insts[i].sourceApplicationId === appId) { inst = insts[i]; break; }
    }
    if (!inst) {
      inst = makeInstitutionFromApplication(app);
      insts.push(inst);
    } else {
      inst.status = 'ACTIVE';
      inst.verificationStatus = 'VERIFIED';
      inst.purchasedModules = config.modules.slice();
    }
    inst.subscriptionStatus = 'ACTIVE';
    writeJson(KEYS.INSTITUTIONS, insts);

    /* Membership ACTIVE for primary administrator */
    var users = readJson(KEYS.USERS, []);
    var exists = users.some(function (u) {
      return u.institutionId === inst.institutionId &&
        String(u.name).toLowerCase() === String(app.primaryAdmin.name).toLowerCase();
    });
    if (!exists) {
      users.push({
        userId: nextId('IUSR-'),
        name: app.primaryAdmin.name,
        institutionId: inst.institutionId,
        institutionName: inst.name,
        role: 'Administrator',
        whatsapp: '+' + digits(whatsappDial(app.primaryAdmin.whatsappCountry)) + ' ' + app.primaryAdmin.whatsapp,
        membership: 'ACTIVE',
        lastLogin: null
      });
      writeJson(KEYS.USERS, users);
    }

    /* Access grant */
    var grant = {
      grantId: nextId('GRANT-'),
      institutionId: inst.institutionId,
      institutionName: inst.name,
      applicationId: appId,
      accessScope: config.accessScope,
      approvedDatasets: config.approvedDatasets || Object.keys(app.dataAccess || {}),
      approvedModules: config.modules.slice(),
      personLevelAllowed: !!config.personLevel,
      anonymizationRequired: !!config.anonymization,
      expiresAt: config.expiry || null,
      reviewerNote: config.reviewerNote || '',
      grantedBy: (currentSession() || {}).name || '',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };
    var grants = readJson(KEYS.GRANTS, []);
    grants.unshift(grant);
    writeJson(KEYS.GRANTS, grants);

    /* Subscription activated */
    var subs = readJson(KEYS.SUBSCRIPTIONS, []);
    var product = pickProductForType(inst.type, config.modules);
    var sub = {
      subscriptionId: nextId('SUB-'),
      institutionId: inst.institutionId,
      institutionName: inst.name,
      product: product.name,
      modules: config.modules.slice(),
      userLimit: product.userLimit,
      usersUsed: 1,
      start: new Date().toISOString().slice(0, 10),
      renewal: (config.expiry || addDays(new Date().toISOString(), 30)).slice(0, 10),
      status: 'ACTIVE',
      interval: product.pricing.interval,
      amount: product.pricing.amount,
      currency: product.pricing.currency
    };
    subs.unshift(sub);
    writeJson(KEYS.SUBSCRIPTIONS, subs);

    /* Keep the B1 account record consistent */
    var accounts = institutionalAccounts();
    for (var j = 0; j < accounts.length; j++) {
      if (accounts[j].applicationId === appId) accounts[j].status = 'ACTIVE';
    }
    writeJson(INST_KEYS.ACCOUNTS, accounts);

    logAdminAction('APPROVE_INSTITUTION', 'InstitutionApplication', appId, {
      institutionId: inst.institutionId,
      before: 'UNDER REVIEW',
      after: 'ACTIVE',
      reason: config.reviewerNote || ''
    });
    logAdminAction('GRANT_ACCESS', 'InstitutionAccessGrant', grant.grantId, {
      institutionId: inst.institutionId,
      after: { scope: grant.accessScope, modules: grant.approvedModules, personLevel: grant.personLevelAllowed }
    });
    logAdminAction('ACTIVATE_SUBSCRIPTION', 'InstitutionSubscription', sub.subscriptionId, {
      institutionId: inst.institutionId,
      after: { product: sub.product, status: 'ACTIVE' }
    });
    notifyInstitution(appId, 'application', 'Your application was APPROVED. Plan ' + sub.product + ' is active — dataset access granted' + (grant.personLevelAllowed ? ' including person-level data.' : '.'));
    notifyInstitution(appId, 'subscription', 'Subscription ACTIVE · ' + sub.product + ' (' + sub.userLimit + ' users) · renews ' + sub.renewal + '.');
    return { institution: inst, grant: grant, subscription: sub };
  }

  function rejectApplication(appId, reason) {
    var app = setApplicationStatus(appId, 'REJECTED', { rejectionReason: reason });
    if (app) {
      logAdminAction('REJECT_INSTITUTION', 'InstitutionApplication', appId, {
        before: 'UNDER REVIEW', after: 'REJECTED', reason: reason
      });
      notifyInstitution(appId, 'application', 'Your application was REJECTED. Reason: ' + (reason || 'not specified'));
    }
    return app;
  }

  function requestApplicationInfo(appId, message, fields) {
    var app = setApplicationStatus(appId, 'NEEDS_INFORMATION', { infoRequest: { message: message, fields: fields, at: new Date().toISOString() } });
    if (app) {
      logAdminAction('REQUEST_INFORMATION', 'InstitutionApplication', appId, { after: { fields: fields } });
      notifyInstitution(appId, 'application', 'More information requested on your application: ' + (message || 'see review notes.'));
    }
    return app;
  }

  /* ---------- institution-facing notices (Setup 4 §46) ----------
     Writes into the workspace notification feed; entries carry
     applicationId so only that institution sees them. */
  function notifyInstitution(applicationId, type, message) {
    var key = 'roots_inst_notifications';
    var list = readJson(key, []);
    list.unshift({
      id: 'N-' + Date.now().toString(36).toUpperCase(),
      applicationId: applicationId,
      type: type || 'admin',
      message: message,
      at: new Date().toISOString(),
      read: false
    });
    writeJson(key, list.slice(0, 300));
  }

  function pickProductForType(typeCode, modules) {
    var products = readJson(KEYS.PRODUCTS, defaultProducts());
    var byType = products.filter(function (p) {
      return p.active && (!typeCode || p.institutionTypes.indexOf(typeCode) !== -1);
    });
    var best = null, bestScore = -1;
    [byType, products].some(function (pool) {
      pool.forEach(function (p) {
        var score = config_modulesOverlap(p.includedModules, modules);
        if (score > bestScore) { bestScore = score; best = p; }
      });
      return bestScore > 0;
    });
    return best || products[0];
  }
  function config_modulesOverlap(a, b) {
    var n = 0;
    (a || []).forEach(function (m) { if ((b || []).indexOf(m) !== -1) n++; });
    return n;
  }

  function whatsappDial(countryCode) {
    try {
      var c = (window.RegData.countryByCode || {})[countryCode];
      return c ? c.dial : '';
    } catch (e) { return ''; }
  }

  function addDays(iso, days) {
    var d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  window.RootsAdminStore = {
    KEYS: KEYS,
    INST_KEYS: INST_KEYS,
    readJson: readJson,
    writeJson: writeJson,
    hashPassword: hashPassword,
    digits: digits,
    nextId: nextId,
    seed: seed,
    logAdminAction: logAdminAction,
    currentSession: currentSession,
    getInstitutionCount: getInstitutionCount,
    getPendingApplicationCount: getPendingApplicationCount,
    getActiveInstitutionUserCount: getActiveInstitutionUserCount,
    getPendingAccessRequestCount: getPendingAccessRequestCount,
    getOpenDisputeCount: getOpenDisputeCount,
    getActiveSubscriptionCount: getActiveSubscriptionCount,
    getMonthlyExportCount: getMonthlyExportCount,
    getSuspendedInstitutionCount: getSuspendedInstitutionCount,
    institutionalApplications: institutionalApplications,
    institutionalAccounts: institutionalAccounts,
    isUserSuspended: isUserSuspended,
    setUserSuspension: setUserSuspension,
    approveApplication: approveApplication,
    rejectApplication: rejectApplication,
    requestApplicationInfo: requestApplicationInfo,
    notifyInstitution: notifyInstitution,
    makeInstitutionFromApplication: makeInstitutionFromApplication
  };
})();
