/* ============================================================
   INSTITUTIONAL OVERVIEW (Setup 4 §8).
   Type-specific landing: alerts, primary actions, widgets,
   recent work. No generic dashboard — widgets come from the
   institution's INSTITUTION_WORKSPACE_CONFIG.
   ============================================================ */
(function () {
  'use strict';

  window.RootsInstViews.push({
    id: 'overview',
    label: 'Overview',
    icon: '🏠',
    perm: 'inst.overview',
    render: function (host, ctx) {
      var access = ctx.access;
      var cfg = ctx.typeCfg;
      var esc = ctx.esc;
      var Store = window.RootsInstStore;

      function uniq(arr) {
        var seen = {}, out = 0;
        arr.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out++; } });
        return out;
      }
      var people = (window.PEOPLE || []).filter(access.inGeography);

      var W = {
        people: { label: 'People in scope', val: people.length, icon: '👥' },
        chiefdoms: { label: 'Chiefdoms', val: uniq(people.map(function (p) { return (p.admin || {}).chief; })), icon: '👑' },
        districts: { label: 'Districts', val: uniq(people.map(function (p) { return (p.admin || {}).district; })), icon: '🗺️' },
        villageBooks: { label: 'Village books', val: uniq(people.map(function (p) { return (p.admin || {}).villageBookId; })), icon: '📗' },
        totems: { label: 'Totems indexed', val: uniq(people.map(function (p) { return (p.kinship || {}).mutupo; })), icon: '🦁' },
        disputes: { label: 'Disputes open', val: people.filter(function (p) { return p.sync && p.sync._disputed; }).length, icon: '⚖️' },
        families: { label: 'Families', val: uniq(people.map(function (p) { return ((p.kinship || {}).mutupo || '') + '|' + ((p.kinship || {}).chidawo || ''); })), icon: '👪' },
        sabhuku: { label: 'Sabhuku nodes', val: uniq(people.map(function (p) { return (p.admin || {}).sabhuku; })), icon: '🏘️' },
        projects: { label: 'Active projects', val: Store.get('PROJECTS').filter(function (p) { return p.status === 'ACTIVE'; }).length, icon: '📁' },
        savedQueries: { label: 'Saved queries', val: Store.get('SAVED').length, icon: '🔎' },
        datasets: { label: 'Approved datasets', val: access.datasets.length, icon: '🗃️' },
        exports: { label: 'Recent exports', val: Store.get('RECENT_EXPORTS').length, icon: '📤' },
        collections: { label: 'Collections / fonds', val: uniq(people.map(function (p) { return p.sourceName; })), icon: '🏛️' },
        files: { label: 'Files', val: uniq(people.map(function (p) { return (p.admin || {}).villageBookId || (p.admin || {}).chief; })), icon: '🗂️' },
        items: { label: 'Indexed items', val: people.length, icon: '📜' },
        findingAids: { label: 'Finding aids', val: uniq(people.filter(function (p) { return p.sourceNote; }).map(function (p) { return p.sourceName; })), icon: '🧾' },
        objects: { label: 'Catalogued objects', val: people.length, icon: '🏺' },
        oralHistories: { label: 'Oral histories', val: people.filter(function (p) { var o = p.oral || {}; return o.praisePoem || o.guruuswaOrigin; }).length, icon: '🎙️' },
        communities: { label: 'Communities', val: uniq(people.map(function (p) { return (p.admin || {}).chief || (p.admin || {}).headman; })), icon: '🌍' },
        regions: { label: 'Provinces covered', val: uniq(people.map(function (p) { return (p.admin || {}).province; })), icon: '📍' },
        reports: { label: 'Recommended reports', val: (cfg.recommendedReports || []).length, icon: '📊' },
        learners: {
          label: 'Learners (under 18)', icon: '🎓',
          val: people.filter(function (p) {
            var y = parseInt((p.dateOfBirth || p.born || ''), 4 == 4 ? '' : '');
            if (!y) { var m = String(p.dateOfBirth || p.born || '').match(/\d{4}/); y = m ? parseInt(m[0], 10) : 0; }
            return y && (new Date().getFullYear() - y) < 18;
          }).length
        },
        schools: { label: 'Schools linked', val: (window.SCHOOLS_ZW || []).length, icon: '🏫' },
        languages: { label: 'Languages', val: uniq(people.map(function (p) { return (p.ethnicity || {}).languageCluster || (p.ethnicity || {}).specificGroup; })), icon: '🗣️' },
        cases: { label: 'Research cases', val: Store.get('PROJECTS').length, icon: '🧭' },
        proverbs: { label: 'Proverbs', val: (window.proverbs || []).length, icon: '💬' },
        greetings: { label: 'Totem greetings', val: Object.keys(window.totemRegistry || {}).length, icon: '🙏' }
      };

      var html = '<div class="ws-page-head"><div><h2>' + esc(cfg.landingTitle) + '</h2>' +
        '<p class="sub">' + esc(access.institutionName) + ' · ' + esc(ctx.typeInfo ? ctx.typeInfo.title : access.institutionType) +
        ' · Plan: ' + esc(access.planName) + '</p></div>' +
        '<div class="ws-chips">' +
        '<span class="chip">Scope: ' + esc(access.scopeLabel) + '</span>' +
        '<span class="chip">' + esc((access.datasets || []).join(', ') || 'No datasets') + '</span>' +
        '<span class="chip ' + (access.subscriptionStatus === 'ACTIVE' ? 'ok' : 'warn') + '">' + esc(access.subscriptionStatus) + '</span>' +
        '</div></div>';

      /* Alerts row (§52): admin/data-quality notices. */
      var alerts = (window.RootsInstShell.alerts ? window.RootsInstShell.alerts() : []);
      if (alerts.length) {
        html += '<div class="ws-alert-row">' + alerts.slice(0, 3).map(function (a) {
          return '<button class="ws-alert" data-go="' + esc(a.go || '') + '">' + a.icon + ' ' + esc(a.msg) + '</button>';
        }).join('') + '</div>';
      }

      /* Primary actions (§9). */
      html += '<div class="ws-actions">' + (cfg.primaryActions || []).map(function (id) {
        return '<button data-go="' + esc(id) + '" class="ws-btn ghost">' + id.charAt(0).toUpperCase() + id.slice(1) + '</button>';
      }).join('') + '</div>';

      /* Widget grid. */
      html += '<div class="ws-widgets">';
      (cfg.dashboardWidgets || []).forEach(function (k) {
        var w = W[k];
        if (!w) return;
        html += '<div class="stat-card' + (k === 'disputes' && w.val > 0 ? ' alert' : '') + '">' +
          '<span class="ico">' + w.icon + '</span><b id="wsStat-' + k + '">' + w.val + '</b>' +
          '<span class="lbl">' + esc(w.label) + '</span></div>';
      });
      html += '</div>';

      /* Recent work (§44). */
      var recents = Store.get('RECENT_RECORDS');
      var exportsR = Store.get('RECENT_EXPORTS');
      if (recents.length || exportsR.length) {
        html += '<div class="ws-two-col"><div class="ws-panel"><h4>🕘 Recently viewed records</h4>';
        html += recents.length
          ? recents.slice(0, 5).map(function (r) {
            return '<button class="ws-row" data-person="' + esc(r.id) + '">👤 ' + esc(r.name) +
              '<span class="when">' + esc(ctx.fmtDateTime(r.at)) + '</span></button>';
          }).join('')
          : '<div class="ws-empty">Nothing yet.</div>';
        html += '</div><div class="ws-panel"><h4>📤 Recent exports</h4>';
        html += exportsR.length
          ? exportsR.slice(0, 5).map(function (r) {
            return '<div class="ws-row static">' + esc(r.format) + ' · ' + esc(r.dataset || 'People') + ' · ' + r.records + ' records' +
              '<span class="when">' + esc(ctx.fmtDateTime(r.at)) + '</span></div>';
          }).join('')
          : '<div class="ws-empty">No exports yet.</div>';
        html += '</div></div>';
      }

      host.innerHTML = html;

      host.querySelectorAll('[data-go]').forEach(function (b) {
        b.addEventListener('click', function () { ctx.go(b.dataset.go); });
      });
      host.querySelectorAll('[data-person]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (window.RootsInstPerson) window.RootsInstPerson.open(b.dataset.person, ctx);
        });
      });
    }
  });
})();
