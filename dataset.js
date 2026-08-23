/* ============================================================
   ROOTS DATASET LOADER — populates PEOPLE/byId per account mode.
   Runs after data.js + store.js on every page.

   Session (localStorage 'roots_session'):
     { accountType:'regular', mode:'family'|'personal', personId }

   - family  : import full master dataset (dataset_v2.js),
               ego = focus person R001 (Kudzanai Paul Chitate IV).
   - personal: insert only the signed-up user's person record
               (stored inside roots_user.personNode).
   - none    : defaults to family mode so the app is never empty.
   ============================================================ */
(function () {
  'use strict';

  var SESSION_KEY = 'roots_session';
  var MIGRATED_KEY = 'roots_family_migration_v1';

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function setSession(s) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  }
  window.RootsSession = { get: getSession, set: setSession, KEY: SESSION_KEY };

  function wipe() {
    PEOPLE.length = 0;
    Object.keys(byId).forEach(function (k) { delete byId[k]; });
  }

  function toYear(v) {
    if (!v) return null;
    var n = parseInt(String(v).slice(0, 4), 10);
    return isNaN(n) ? null : n;
  }

  /* ---------- FAMILY MODE: import master dataset v2 ---------- */
  function importMasterDataset() {
    var D = window.ROOTS_DATASET_V2;
    if (!D || !D.people || !D.people.length) {
      console.warn('dataset.js: ROOTS_DATASET_V2 missing — run npm run gen:data');
      return;
    }
    wipe();

    D.people.forEach(function (p) {
      var born = toYear(p.dateOfBirth);
      var died = toYear(p.yearDeceased) || toYear(p.dateOfDeath);
      var g = String(p.gender || '').toLowerCase();
      P({
        id: p.id,
        name: p.fullName || ((p.name || '') + ' ' + (p.surname || '')).trim(),
        fullName: p.fullName || '',
        born: born, died: died,
        gender: (g === 'male' || g === 'm') ? 'm' : (g === 'female' || g === 'f') ? 'f' : 'u',
        relation: p.relation || '',
        location: [p.cityOrTown, p.countryOfOrigin].filter(Boolean).join(', '),
        nationality: p.nationality || '',
        countryOfOrigin: p.countryOfOrigin || '',
        cityOrTown: p.cityOrTown || '',
        lineageCategory: p.lineageCategory || '',
        bloodlineDetail: p.bloodlineDetail || '',
        branch: p.branch || '',
        status: p.status || '',
        notes: p.sourceNote || '',
        /* spec-model fields enriched at source (tools/enrich-dataset.js);
           upgradeAll() preserves them via || defaults */
        admin: p.admin,
        kinship: p.kinship,
        oral: p.oral,
        ethnicity: p.ethnicity,
        lifecycleState: p.lifecycleState || ''
      });
    });

    // Relationships -> parentIds / spouseId (sibling-of & cousin-of are derivable)
    D.relationships.forEach(function (r) {
      var a = byId[r.from], b = byId[r.to];
      if (!a || !b) return;
      if (r.relationship === 'child-of') {
        a.parentIds = a.parentIds || [];
        if (a.parentIds.indexOf(b.id) === -1) a.parentIds.push(b.id);
      } else if (r.relationship === 'partner-of') {
        if (!a.spouseId) a.spouseId = b.id;
        if (!b.spouseId) b.spouseId = a.id;
      }
    });

    // Co-parent unions: dataset links many couples only through shared
    // children. Link them as spouses ONLY when both sides are unlinked,
    // so explicit partner rows / remarriages are never overwritten.
    // (The tree engine also infers unions from shared children.)
    Object.keys(byId).forEach(function (id) {
      var p = byId[id];
      var ps = p.parentIds || [];
      if (ps.length >= 2) {
        var a = byId[ps[0]], b = byId[ps[1]];
        if (a && b && !a.spouseId && !b.spouseId) { a.spouseId = b.id; b.spouseId = a.id; }
      }
    });

    window.RootsData.upgradeAll();
  }

  /* ---------- One-time migration of pre-dataset local state ---------- */
  function migrateLegacyState(focusId) {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    var s = window.RootsStore.read();
    var patch = {};
    Object.keys(s.posts || {}).forEach(function (pid) {
      var post = s.posts[pid];
      if (post && post.authorId === 'you') { post.authorId = focusId; }
    });
    (s.gallery || []).forEach(function (g) { if (g && g.personId === 'you') g.personId = focusId; });
    if (s.myId !== focusId) patch.myId = focusId;
    ['images', 'notes', 'deathRecords', 'bloodlineStack', 'marriageLedgers'].forEach(function (k) { patch[k] = {}; });
    window.RootsStore.patch(patch);
    try { localStorage.setItem(MIGRATED_KEY, '1'); } catch (e) {}
  }

  /* ---------- PERSONAL MODE: only the signed-up user ---------- */
  function importPersonalUser() {
    var u = null;
    try { u = JSON.parse(localStorage.getItem('roots_user') || 'null'); } catch (e) {}
    wipe();
    if (u && u.personNode) {
      P(JSON.parse(JSON.stringify(u.personNode)));
      window.RootsData.upgradeAll();
      return;
    }
    // Fallback ego if user record was cleared but session remains
    P({
      id: (window.RootsSession.get() || {}).personId || 'me',
      name: 'My Profile', gender: 'u', relation: 'You'
    });
    window.RootsData.upgradeAll();
  }

  /* ---------- APPLY ---------- */
  function apply(forceMode) {
    var sess = window.RootsSession.get();
    var mode = forceMode || (sess && sess.mode) || 'family';
    var D = window.ROOTS_DATASET_V2;

    if (mode === 'family' && D && D.focusPerson) {
      importMasterDataset();
      migrateLegacyState(D.focusPerson.id);
      window.RootsStore.patch({ myId: D.focusPerson.id });
      return mode;
    }
    importPersonalUser();
    var pid = (sess && sess.personId) || byId[Object.keys(byId)[0]] && Object.keys(byId)[0] || 'me';
    window.RootsStore.patch({ myId: pid });
    return mode;
  }

  window.RootsDataset = {
    apply: apply,
    focus: function () { return (window.ROOTS_DATASET_V2 || {}).focusPerson || null; },
    stats: function () {
      return { people: PEOPLE.length, relationships: ((window.ROOTS_DATASET_V2 || {}).relationships || []).length };
    }
  };

  apply();
})();
