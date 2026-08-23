/* ============================================================
   ROOTS INSTITUTIONAL WORKSPACE — legacy institutional dashboard
   moved behind the B1 login gate. Session-guarded: redirects to
   the login screen when no local institutional session exists.
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var CFG = window.RootsInstConfig;
  var KEYS = CFG.KEYS;

  /* ---------- session guard ---------- */
  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (e) { return fallback; }
  }

  var session = readJson(KEYS.SESSION, null);
  if (!session || !session.institutionName) {
    location.replace('institutional-login.html');
    return;
  }

  function showToast(msg) { window.RootsShell.toast(msg); }
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
  function escapeXml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  /* ---------- header identity + provisional banner ---------- */
  (function renderIdentity() {
    var t = CFG.typeByCode(session.typeCode);
    $('instUserChip').innerHTML =
      '<strong>' + escapeHtml(session.institutionName) + '</strong>' +
      '<span>' + escapeHtml(session.adminName) + '</span>' +
      '<span>' + escapeHtml(session.role || 'ADMINISTRATOR') + (t ? ' · ' + t.title : '') + '</span>';

    var apps = readJson(KEYS.APPLICATIONS, []);
    var mine = null;
    for (var i = 0; i < apps.length; i++) {
      if (apps[i].applicationId === session.applicationId) { mine = apps[i]; break; }
    }
    if (!mine || mine.status !== 'ACTIVE') {
      $('instProvisional').textContent =
        '⏳ Provisional access — application ' + (session.applicationId || '') + ' is UNDER REVIEW. Formal approval will unlock additional modules.';
    } else {
      $('instProvisional').style.display = 'none';
    }
  })();

  /* ---------- profile detail overlay ---------- */
  function openProfile(id) {
    var p = byId[id];
    if (!p) return;
    var k = p.kinship || {};
    var e = p.ethnicity || {};
    var a = p.admin || {};
    $('instProfileName').textContent = p.name;
    $('instProfileSub').textContent = (p.relation ? p.relation + ' · ' : '') +
      (p.born ? 'b. ' + p.born : '') + (p.died ? ' · d. ' + p.died : '');
    var rows = [
      ['Totem', k.mutupo || '—'],
      ['Chidawo', k.chidawo || '—'],
      ['Language', e.specificGroup || e.languageCluster || '—'],
      ['Province', a.province || '—'],
      ['District', a.district || '—'],
      ['Ward', a.ward || '—'],
      ['Chief', a.chief || '—'],
      ['Headman', a.headman || '—'],
      ['Village book', a.villageBookId || '—'],
      ['Location', p.location || '—']
    ];
    $('instProfileBody').innerHTML = rows.map(function (r) {
      return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e6ec;">' +
        '<span style="color:#5f6b7c;">' + r[0] + '</span><span style="font-weight:600;">' + escapeHtml(r[1]) + '</span></div>';
    }).join('');
    $('instProfileOverlay').classList.add('show');
  }
  $('instProfileClose').addEventListener('click', function () {
    $('instProfileOverlay').classList.remove('show');
  });
  $('instProfileOverlay').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('show');
  });

  /* ---------- sign out ---------- */
  $('instSignOut').addEventListener('click', function () {
    try { localStorage.removeItem(KEYS.SESSION); } catch (e) {}
    location.href = 'institutional-login.html';
  });

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function renderInstitutional() {
    var stats = $('instStats');
    var totemCount = Object.keys(totemRegistry).length;
    var peopleCount = PEOPLE.length;
    var provincesCount = provinces.length;
    var sabhukuCount = new Set(PEOPLE.map(function (p) { return p.admin && p.admin.sabhuku; }).filter(Boolean)).size;
    stats.innerHTML =
      '<div class="stat-card"><div class="stat-num">' + peopleCount + '</div><div class="stat-label">Profiles</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + totemCount + '</div><div class="stat-label">Totems Indexed</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + provincesCount + '</div><div class="stat-label">Provinces</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + sabhukuCount + '</div><div class="stat-label">Sabhuku Nodes</div></div>';

    // Filters
    var filters = $('instFilters');
    filters.innerHTML =
      '<select id="filterProvince"><option value="">Province</option>' + provinces.map(function (p) { return '<option>' + p + '</option>'; }).join('') + '</select>' +
      '<select id="filterTotem"><option value="">Totem</option>' + Object.keys(totemRegistry).map(function (t) { return '<option>' + t.split('(')[0].trim() + '</option>'; }).join('') + '</select>' +
      '<select id="filterGender"><option value="">Gender</option><option value="m">Male</option><option value="f">Female</option></select>' +
      '<select id="filterStatus"><option value="">Status</option><option value="alive">Alive</option><option value="deceased">Deceased</option></select>' +
      '<select id="filterAgeBand"><option value="">Age Band</option><option value="0-17">0–17</option><option value="18-35">18–35</option><option value="36-60">36–60</option><option value="60+">60+</option></select>' +
      '<select id="filterLanguage"><option value="">Language</option>' + all16Languages.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select>' +
      '<input id="filterWard" placeholder="Ward" style="min-width:70px;">' +
      '<input id="filterChief" placeholder="Chief" style="min-width:70px;">' +
      '<input id="filterHeadman" placeholder="Headman" style="min-width:70px;">' +
      '<input id="filterBookId" placeholder="Book ID" style="min-width:70px;">' +
      '<input id="filterSearch" placeholder="Search profile…">' +
      '<button id="filterClear" style="padding:6px 12px;border-radius:8px;border:1px solid #003366;background:none;color:#003366;font-size:0.72rem;cursor:pointer;font-weight:600;">✕ Clear</button>';

    var searchInput = $('instSearch');
    var filterProvince = $('filterProvince');
    var filterTotem = $('filterTotem');
    var filterGender = $('filterGender');
    var filterStatus = $('filterStatus');
    var filterSearch = $('filterSearch');
    var filterAgeBand = $('filterAgeBand');
    var filterLanguage = $('filterLanguage');
    var filterWard = $('filterWard');
    var filterChief = $('filterChief');
    var filterHeadman = $('filterHeadman');
    var filterBookId = $('filterBookId');

    function renderProfileList() {
      var list = $('instTotemList');
      if (!list) return;
      list.innerHTML = '';
      var filtered = PEOPLE.slice();
      var prov = filterProvince ? filterProvince.value : '';
      var tot = filterTotem ? filterTotem.value : '';
      var gen = filterGender ? filterGender.value : '';
      var sts = filterStatus ? filterStatus.value : '';
      var q = (searchInput ? searchInput.value : '').toLowerCase();
      if (prov) filtered = filtered.filter(function (p) { return (p.admin && p.admin.province === prov) || (p.location && p.location.indexOf(prov) !== -1); });
      if (tot) filtered = filtered.filter(function (p) { var k = p.kinship || {}; return k.mutupo && k.mutupo.toLowerCase().indexOf(tot.toLowerCase()) !== -1; });
      if (gen) filtered = filtered.filter(function (p) { return p.gender === gen; });
      if (sts === 'alive') filtered = filtered.filter(function (p) { return !p.died; });
      if (sts === 'deceased') filtered = filtered.filter(function (p) { return p.died; });
      if (q) filtered = filtered.filter(function (p) { return p.name.toLowerCase().indexOf(q) !== -1 || (p.kinship && p.kinship.mutupo && p.kinship.mutupo.toLowerCase().indexOf(q) !== -1) || (p.kinship && p.kinship.chidawo && p.kinship.chidawo.toLowerCase().indexOf(q) !== -1); });

      var ageBand = filterAgeBand ? filterAgeBand.value : '';
      var lang = filterLanguage ? filterLanguage.value : '';
      var ward = filterWard ? filterWard.value.toLowerCase() : '';
      var chief = filterChief ? filterChief.value.toLowerCase() : '';
      var headman = filterHeadman ? filterHeadman.value.toLowerCase() : '';
      var bookId = filterBookId ? filterBookId.value.toLowerCase() : '';
      var currentYear = new Date().getFullYear();
      if (lang) filtered = filtered.filter(function (p) { var e = p.ethnicity || {}; return e.specificGroup === lang || e.languageCluster === lang; });
      if (ward) filtered = filtered.filter(function (p) { var a = p.admin || {}; return a.ward && a.ward.toLowerCase().indexOf(ward) !== -1; });
      if (chief) filtered = filtered.filter(function (p) { var a = p.admin || {}; return a.chief && a.chief.toLowerCase().indexOf(chief) !== -1; });
      if (headman) filtered = filtered.filter(function (p) { var a = p.admin || {}; return a.headman && a.headman.toLowerCase().indexOf(headman) !== -1; });
      if (bookId) filtered = filtered.filter(function (p) { var a = p.admin || {}; return a.villageBookId && a.villageBookId.toLowerCase().indexOf(bookId) !== -1; });
      if (ageBand) filtered = filtered.filter(function (p) {
        var age = parseInt(p.born, 10); if (isNaN(age)) return false;
        var years = currentYear - age;
        if (ageBand === '0-17') return years >= 0 && years <= 17;
        if (ageBand === '18-35') return years >= 18 && years <= 35;
        if (ageBand === '36-60') return years >= 36 && years <= 60;
        if (ageBand === '60+') return years >= 60;
        return true;
      });

      if (!filtered.length) { list.innerHTML = '<div class="emptyState" style="color:var(--text-dim)">No profiles match your filters.</div>'; return; }
      filtered.forEach(function (p) {
        var k = p.kinship || {};
        var totemStr = k.mutupo ? k.mutupo + (k.chidawo ? ' · ' + k.chidawo : '') : '';
        var div = document.createElement('div');
        div.className = 'inst-totem-item';
        div.innerHTML = '<div class="inst-totem-name">' + escapeHtml(p.name) + ' <span style="font-weight:400;font-size:0.72rem;color:var(--text-dim);">' + escapeHtml(p.relation || '') + '</span></div>' +
          '<div class="inst-totem-praises">' + escapeHtml(totemStr || '—') + (p.location ? ' · ' + escapeHtml(p.location) : '') + (p.born ? ' · b.' + escapeHtml(p.born) : '') + (p.died ? ' · d.' + escapeHtml(p.died) : '') + '</div>';
        div.addEventListener('click', function () { openProfile(p.id); });
        list.appendChild(div);
      });
    }

    function renderTotemList() {
      var list = $('instTotemList');
      if (!list) return;
      list.innerHTML = '';
      var keys = Object.keys(totemRegistry);
      var q = (searchInput ? searchInput.value : '').toLowerCase();
      if (q) keys = keys.filter(function (k) { return k.toLowerCase().includes(q); });
      keys.forEach(function (key) {
        var entry = totemRegistry[key];
        var praises = (entry.zvidawo || entry.izithakazelo || []).join(', ');
        var div = document.createElement('div');
        div.className = 'inst-totem-item';
        div.innerHTML = '<div class="inst-totem-name">' + escapeHtml(key) + '</div><div class="inst-totem-praises">' + escapeHtml(praises || '—') + ' · ' + escapeHtml(entry.system) + '</div>';
        div.addEventListener('click', function () {
          showToast(entry.greeting || entry.proverb || 'Tap to learn more');
        });
        list.appendChild(div);
      });
      if (!keys.length) { list.innerHTML = '<div class="emptyState" style="color:var(--text-dim)">No totems match your search.</div>'; }
    }

    // Toggle between views
    renderProfileList();
    $('instAuditor').style.display = 'none';
    $('instDispute').style.display = 'none';

    var searchTimer;
    document.querySelectorAll('.inst-view-toggle').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.inst-view-toggle').forEach(function (t) { t.classList.remove('active'); });
        b.classList.add('active');
        var viewMode = b.dataset.view;
        $('instTotemList').style.display = 'none';
        $('instFilters').style.display = 'none';
        $('instSearch').style.display = 'none';
        $('instAuditor').style.display = 'none';
        $('instDispute').style.display = 'none';
        $('instExportRow').style.display = 'none';
        if (viewMode === 'totems') {
          $('instTotemList').style.display = 'block';
          $('instSearch').style.display = 'flex';
          renderTotemList();
        } else if (viewMode === 'auditor') {
          $('instAuditor').style.display = 'block';
          renderLineageAuditor();
        } else if (viewMode === 'dispute') {
          $('instDispute').style.display = 'block';
          renderDisputeQueue();
        } else {
          $('instTotemList').style.display = 'block';
          $('instFilters').style.display = 'flex';
          $('instSearch').style.display = 'flex';
          $('instExportRow').style.display = 'flex';
          renderProfileList();
        }
      });
    });

    function updateFilterIndicators() {
      [filterProvince, filterTotem, filterGender, filterStatus, filterAgeBand, filterLanguage].forEach(function (el) {
        if (!el) return;
        el.style.borderColor = el.value ? '#003366' : '#ccd3dd';
      });
      [filterWard, filterChief, filterHeadman, filterBookId, filterSearch].forEach(function (el) {
        if (!el) return;
        el.style.borderColor = el.value ? '#003366' : '#ccd3dd';
      });
    }

    function refreshList() {
      updateFilterIndicators();
      var currentView = document.querySelector('.inst-view-toggle.active');
      var viewMode = currentView ? currentView.dataset.view : 'profiles';
      if (viewMode === 'totems') renderTotemList();
      else if (viewMode === 'auditor') renderLineageAuditor();
      else if (viewMode === 'dispute') renderDisputeQueue();
      else renderProfileList();
    }

    var filterClearBtn = $('filterClear');
    if (filterClearBtn) {
      filterClearBtn.addEventListener('click', function () {
        [filterProvince, filterTotem, filterGender, filterStatus, filterAgeBand, filterLanguage].forEach(function (el) { if (el) el.value = ''; });
        [filterWard, filterChief, filterHeadman, filterBookId, filterSearch].forEach(function (el) { if (el) el.value = ''; });
        if (searchInput) searchInput.value = '';
        refreshList();
      });
    }

    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refreshList, 200);
    });
    [filterProvince, filterTotem, filterGender, filterStatus, filterAgeBand, filterLanguage].forEach(function (el) {
      if (el) el.addEventListener('change', refreshList);
    });
    [filterSearch, filterWard, filterChief, filterHeadman, filterBookId].forEach(function (el) {
      if (el) el.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(refreshList, 200);
      });
    });

    function renderLineageAuditor() {
      var container = $('instAuditor');
      container.innerHTML =
        '<h4 style="margin:0 0 10px;">🔍 Lineage Auditor</h4>' +
        '<div class="inst-auditor-fields" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' +
          '<input id="audName" placeholder="Name" style="flex:1;min-width:100px;padding:8px;border-radius:6px;border:1px solid #ccd3dd;background:#fff;color:#16202c;font-size:0.8rem;">' +
          '<select id="audProvince" style="padding:8px;border-radius:6px;border:1px solid #ccd3dd;background:#fff;color:#16202c;font-size:0.8rem;"><option value="">Province</option>' + provinces.map(function (p) { return '<option>' + p + '</option>'; }).join('') + '</select>' +
          '<select id="audTotem" style="padding:8px;border-radius:6px;border:1px solid #ccd3dd;background:#fff;color:#16202c;font-size:0.8rem;"><option value="">Totem</option>' + Object.keys(totemRegistry).map(function (t) { return '<option>' + t.split('(')[0].trim() + '</option>'; }).join('') + '</select>' +
          '<select id="audGender" style="padding:8px;border-radius:6px;border:1px solid #ccd3dd;background:#fff;color:#16202c;font-size:0.8rem;"><option value="">Gender</option><option value="m">Male</option><option value="f">Female</option></select>' +
          '<select id="audStatus" style="padding:8px;border-radius:6px;border:1px solid #ccd3dd;background:#fff;color:#16202c;font-size:0.8rem;"><option value="">Status</option><option value="alive">Alive</option><option value="deceased">Deceased</option></select>' +
          '<select id="audLanguage" style="padding:8px;border-radius:6px;border:1px solid #ccd3dd;background:#fff;color:#16202c;font-size:0.8rem;"><option value="">Language</option>' + all16Languages.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select>' +
          '<button id="audSearchBtn" class="btn-sm" style="background:#003366;color:#fff;font-weight:700;">Search</button>' +
        '</div>' +
        '<div id="audResults"></div>';
      var btn = $('audSearchBtn');
      if (btn) {
        btn.addEventListener('click', function () {
          var results = PEOPLE.filter(function (p) {
            var name = ($('audName') ? $('audName').value : '').toLowerCase();
            var prov = ($('audProvince') ? $('audProvince').value : '');
            var tot = ($('audTotem') ? $('audTotem').value : '');
            var gen = ($('audGender') ? $('audGender').value : '');
            var sts = ($('audStatus') ? $('audStatus').value : '');
            var lang = ($('audLanguage') ? $('audLanguage').value : '');
            if (name && p.name.toLowerCase().indexOf(name) === -1) return false;
            if (prov && (p.admin || {}).province !== prov) return false;
            if (tot) { var k = p.kinship || {}; if (!k.mutupo || k.mutupo.toLowerCase().indexOf(tot.toLowerCase()) === -1) return false; }
            if (gen && p.gender !== gen) return false;
            if (sts === 'alive' && p.died) return false;
            if (sts === 'deceased' && !p.died) return false;
            if (lang) { var e = p.ethnicity || {}; if (e.specificGroup !== lang && e.languageCluster !== lang) return false; }
            return true;
          });
          var resDiv = $('audResults');
          if (!results.length) { resDiv.innerHTML = '<div class="emptyState">No matching records.</div>'; return; }
          resDiv.innerHTML = '<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px;">' + results.length + ' record(s) found</div>';
          results.forEach(function (p) {
            var div = document.createElement('div');
            div.className = 'inst-totem-item';
            div.innerHTML = '<div class="inst-totem-name">' + escapeHtml(p.name) + ' <span style="font-weight:400;font-size:0.72rem;color:var(--text-dim);">' + escapeHtml(p.relation || '') + '</span></div>' +
              '<div class="inst-totem-praises">' + escapeHtml((p.kinship || {}).mutupo || '—') + (p.location ? ' · ' + escapeHtml(p.location) : '') + (p.born ? ' · b.' + escapeHtml(p.born) : '') + (p.died ? ' · d.' + escapeHtml(p.died) : '') + '</div>';
            div.addEventListener('click', function () { openProfile(p.id); });
            resDiv.appendChild(div);
          });
        });
      }
    }

    function renderDisputeQueue() {
      var container = $('instDispute');
      var disputed = PEOPLE.filter(function (p) { return p.sync && p.sync._disputed; });
      container.innerHTML =
        '<h4 style="margin:0 0 10px;">⚖️ Dispute Queue</h4>' +
        '<div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:10px;">Records flagged as DISPUTED by sync conflict resolver require manual review by family elders or traditional council administrators.</div>';
      if (!disputed.length) {
        container.innerHTML += '<div class="emptyState" style="color:var(--lime);">✅ No disputed records. All sync resolutions are clean.</div>';
        return;
      }
      disputed.forEach(function (p) {
        var div = document.createElement('div');
        div.className = 'inst-totem-item';
        div.style.borderLeft = '3px solid var(--accent)';
        div.innerHTML = '<div class="inst-totem-name">⚠️ ' + escapeHtml(p.name) + ' <span style="font-weight:400;font-size:0.72rem;color:var(--accent);">DISPUTED</span></div>' +
          '<div class="inst-totem-praises">Version seq: ' + ((p.sync || {}).versionSequence || 0) + ' · Last mutated: ' + escapeHtml((p.sync || {}).lastMutatedByDevice || 'local') + '</div>';
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
        var viewBtn = document.createElement('button');
        viewBtn.textContent = '👤 View';
        viewBtn.className = 'btn-sm';
        viewBtn.style.cssText = 'flex:1;padding:6px;border-radius:6px;border:1px solid #ccd3dd;background:#fff;color:#16202c;font-size:0.72rem;cursor:pointer;';
        viewBtn.addEventListener('click', function (e) { e.stopPropagation(); openProfile(p.id); });
        var resolveBtn = document.createElement('button');
        resolveBtn.textContent = '✅ Resolve';
        resolveBtn.className = 'btn-sm';
        resolveBtn.style.cssText = 'flex:1;padding:6px;border-radius:6px;border:1px solid var(--lime);background:var(--bg-alt);color:var(--lime);font-size:0.72rem;cursor:pointer;font-weight:700;';
        resolveBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          p.sync._disputed = false;
          showToast('✅ Dispute resolved for ' + p.name);
          renderDisputeQueue();
        });
        row.appendChild(viewBtn);
        row.appendChild(resolveBtn);
        div.appendChild(row);
        container.appendChild(div);
      });
    }

    // Chieftainship succession simulator
    (function renderSuccessionSimulator() {
      var container = $('instBody');
      var sect = document.createElement('div');
      sect.className = 'death-section';
      sect.innerHTML = '<h4 style="margin-top:16px;">👑 Chieftainship Succession Simulator</h4>';

      var chiefSelect = document.createElement('select');
      chiefSelect.className = 'modal-input';
      chiefSelect.innerHTML = '<option value="">— Select a clan chief —</option>';
      PEOPLE.forEach(function (p) {
        if (p.kinship && p.kinship.mutupo && (p.relation || '').toLowerCase().indexOf('chief') !== -1) {
          chiefSelect.innerHTML += '<option value="' + p.id + '">' + escapeHtml(p.name) + ' (' + escapeHtml(p.kinship.mutupo) + ')</option>';
        }
      });
      sect.appendChild(chiefSelect);

      var resultDiv = document.createElement('div');
      resultDiv.style.marginTop = '10px';
      sect.appendChild(resultDiv);

      chiefSelect.addEventListener('change', function () {
        var cid = chiefSelect.value;
        if (!cid) { resultDiv.innerHTML = ''; return; }
        var chief = byId[cid];
        if (!chief) return;
        var candidates = [];
        PEOPLE.forEach(function (p) {
          if (p.id === cid) return;
          if (p.gender !== 'm') return;
          if (p.lifecycleState === 'DECEASED_FROZEN' || p.died) return;
          if (p.kinship && p.kinship.mutupo && p.kinship.mutupo === chief.kinship.mutupo) {
            candidates.push(p);
          }
        });
        var result = computeNextInLine(candidates);
        if (result.candidate) {
          var flags = result.disqualifications.length ? '⚠️ ' + result.disqualifications.join(', ') : '✅ No disqualifications';
          resultDiv.innerHTML = '<div class="summaryCard"><strong style="font-size:1rem;">Next in Line:</strong> ' + escapeHtml(result.candidate.name) + '<br><span style="font-size:0.8rem;color:var(--text-dim);">' + flags + '</span></div>';
        } else {
          resultDiv.innerHTML = '<div class="summaryCard" style="color:var(--accent);">' + result.disqualifications.join(', ') + '</div>';
        }
      });

      container.appendChild(sect);
    })();

    // Export with format options
    $('instExport').addEventListener('click', function () {
      var format = $('instExportFormat') ? $('instExportFormat').value : 'json';
      if (format === 'csv') {
        var headers = ['id', 'name', 'gender', 'born', 'died', 'relation', 'location', 'mutupo', 'chidawo', 'province', 'language'];
        var rows = PEOPLE.map(function (p) {
          return [p.id, p.name, p.gender, p.born, p.died, p.relation, p.location, (p.kinship || {}).mutupo || '', (p.kinship || {}).chidawo || '', (p.admin || {}).province || '', ((p.ethnicity || {}).specificGroup || '')];
        });
        var csv = headers.join(',') + '\n' + rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
        downloadBlob(csv, 'roots_export_' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv;charset=utf-8', '\uFEFF');
        showToast('Exported CSV: ' + PEOPLE.length + ' records');
      } else if (format === 'ead3') {
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ead xmlns="urn:isbn:1-931666-22-9">\n <eadheader>\n  <eadid>ZW-ROOTS-' + new Date().toISOString().slice(0, 10) + '</eadid>\n  <filedesc><titlestmt><titleproper>Roots Zimbabwe Genealogy Export</titleproper></titlestmt></filedesc>\n </eadheader>\n <archdesc level="fonds">\n  <did><unittitle>Chitate/Kepekepe Genealogical Records</unittitle></did>\n';
        PEOPLE.forEach(function (p) {
          xml += '  <c level="item"><did><unittitle>' + escapeXml(p.name) + '</unittitle></did>';
          if (p.born) xml += '<unitdate type="birth">' + escapeXml(p.born) + '</unitdate>';
          if (p.died) xml += '<unitdate type="death">' + escapeXml(p.died) + '</unitdate>';
          if ((p.kinship || {}).mutupo) xml += '<controlaccess><persname role="mutupo">' + escapeXml(p.kinship.mutupo) + '</persname></controlaccess>';
          xml += '</c>\n';
        });
        xml += ' </archdesc>\n</ead>';
        downloadBlob(xml, 'roots_export_' + new Date().toISOString().slice(0, 10) + '.xml', 'application/xml', '');
        showToast('Exported EAD3 XML: ' + PEOPLE.length + ' records');
      } else {
        var data = JSON.stringify({
          exportedAt: new Date().toISOString(),
          exportedBy: session.institutionName,
          format: 'ROOTS_Cultural_Data_Structure_v1',
          totalProfiles: peopleCount,
          totalTotems: totemCount,
          provinces: provinces,
          totemRegistry: totemRegistry,
          persons: PEOPLE.map(function (p) { return { id: p.id, name: p.name, gender: p.gender, born: p.born, died: p.died, relation: p.relation, location: p.location, mutupo: (p.kinship || {}).mutupo, chidawo: (p.kinship || {}).chidawo }; })
        }, null, 2);
        downloadBlob(data, 'roots_export_' + new Date().toISOString().slice(0, 10) + '.json', 'application/json', '');
        showToast('Exported JSON: ' + peopleCount + ' profiles');
      }
    });

    function downloadBlob(content, filename, mime, prefix) {
      var blob = new Blob([(prefix || '') + content], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  }

  /* ---------- boot ---------- */
  try {
    if (window.RootsData && typeof RootsData.upgradeAll === 'function') RootsData.upgradeAll();
  } catch (e) {}
  renderInstitutional();
})();
