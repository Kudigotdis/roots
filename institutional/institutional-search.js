/* ============================================================
   INSTITUTIONAL RECORDS / PERSON / TOTEMS / CULTURE
   (Setup 4 §16-25, §55-56).
   Wide-filter search over approved people, person detail with
   gated tabs + data-quality indicator, totem directory with
   detail, cultural library. Person-level data is never shown
   without approval (§14, §49).
   ============================================================ */
(function () {
  'use strict';

  var Store = window.RootsInstStore;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function ageBand(p) {
    var m = String(p.dateOfBirth || p.born || '').match(/\d{4}/);
    if (!m) return '';
    var age = new Date().getFullYear() - parseInt(m[0], 10);
    if (age < 0) return '';
    if (age <= 12) return '0-12';
    if (age <= 17) return '13-17';
    if (age <= 35) return '18-35';
    if (age <= 59) return '36-59';
    return '60+';
  }

  function confidenceLabel(p) {
    if (p.sync && p.sync._disputed) return 'Disputed';
    var raw = String(p.dataConfidence || '').toLowerCase();
    if (raw.indexOf('verif') === 0 || raw === 'high') return 'Verified';
    if (raw.indexOf('instit') === 0) return 'Institutionally sourced';
    if (raw.indexOf('user') === 0 || raw === 'medium') return 'User supplied';
    if (raw.indexOf('low') === 0 || raw.indexOf('review') !== -1) return 'Under review';
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '—';
  }

  function qualityChecks(p) {
    return [
      { k: 'Identity', ok: !!(p.name && (p.dateOfBirth || p.born)) },
      { k: 'Location', ok: !!((p.admin || {}).province || p.location) },
      { k: 'Lineage', ok: !!((p.kinship || {}).mutupo) },
      { k: 'Cultural', ok: !!(((p.oral || {}).greeting) || ((p.oral || {}).praisePoem)) },
      { k: 'Source', ok: !!p.sourceName }
    ];
  }

  function matchesFilters(p, f) {
    var a = p.admin || {}, k = p.kinship || {}, e = p.ethnicity || {};
    if (f.name && String(p.name || '').toLowerCase().indexOf(f.name) === -1 &&
      String(p.fullName || '').toLowerCase().indexOf(f.name) === -1) return false;
    if (f.surname && String(p.surname || '').toLowerCase().indexOf(f.surname) === -1) return false;
    if (f.province && a.province !== f.province) return false;
    if (f.district && String(a.district || '').toLowerCase().indexOf(f.district) === -1) return false;
    if (f.ward && String(a.ward || '').toLowerCase().indexOf(f.ward) === -1) return false;
    if (f.chief && String(a.chief || '').toLowerCase().indexOf(f.chief) === -1) return false;
    if (f.headman && String(a.headman || '').toLowerCase().indexOf(f.headman) === -1) return false;
    if (f.sabhuku && String(a.sabhuku || '').toLowerCase().indexOf(f.sabhuku) === -1) return false;
    if (f.book && String(a.villageBookId || '').toLowerCase().indexOf(f.book) === -1) return false;
    if (f.totem && String(k.mutupo || '').toLowerCase().indexOf(f.totem.toLowerCase()) === -1) return false;
    if (f.praise) {
      var hay = [k.chidawo].concat(k.zvidawo || []).join(' ').toLowerCase();
      if (hay.indexOf(f.praise.toLowerCase()) === -1) return false;
    }
    if (f.language && e.specificGroup !== f.language && e.languageCluster !== f.language) return false;
    if (f.gender && p.gender !== f.gender) return false;
    if (f.band && ageBand(p) !== f.band) return false;
    if (f.status === 'alive' && p.died) return false;
    if (f.status === 'deceased' && !p.died) return false;
    return true;
  }

  /* ---------------- shared person overlay ---------------- */
  window.RootsInstPerson = {
    open: function (id, ctx) {
      var access = ctx.access;
      var p = null;
      (window.PEOPLE || []).forEach(function (x) { if (x.id === id) p = x; });
      if (!p) return;
      if (!access.personLevelAllowed) { ctx.toast('Person-level data requires Roots Administrator approval.'); return; }

      Store.push('RECENT_RECORDS', { id: p.id, name: p.name, at: Date.now() });

      var k = p.kinship || {}, o = p.oral || {}, a = p.admin || {};
      function nameOf(pid) {
        var q = null;
        (window.PEOPLE || []).forEach(function (x) { if (x.id === pid) q = x; });
        return q ? q.name : pid;
      }

      var tabs = [['overview', 'Overview'], ['administrative', 'Administrative'], ['cultural', 'Cultural']];
      if (access.can('inst.lineage')) tabs.push(['lineage', 'Lineage']);
      if (access.can('inst.lifecycle')) tabs.push(['lifecycle', 'Lifecycle']);
      tabs.push(['sources', 'Sources'], ['audit', 'Audit']);

      var ov = document.createElement('div');
      ov.className = 'ws-overlay';
      ov.id = 'personOverlay';
      ov.innerHTML =
        '<div class="ws-sheet">' +
        '<div class="ws-sheet-head"><div><span class="chip">PERSON RECORD</span>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<div class="chips"><span class="chip ' + (p.died ? 'warn' : 'ok') + '">' + (p.died ? 'DECEASED' : 'ALIVE') + '</span>' +
        '<span class="chip">' + esc(confidenceLabel(p)) + '</span>' +
        (p.sync && p.sync._disputed ? '<span class="chip bad">DISPUTED</span>' : '') + '</div></div>' +
        '<button class="ws-icon-btn" id="poClose">✕</button></div>' +

        '<div class="ws-quality">' +
        qualityChecks(p).map(function (c) {
          return '<span class="q ' + (c.ok ? 'ok' : 'miss') + '">' + (c.ok ? '✓' : '○') + ' ' + c.k + '</span>';
        }).join('') +
        '<span class="q score">Score ' + qualityChecks(p).filter(function (c) { return c.ok; }).length + '/5</span></div>' +

        '<div class="ws-tabs">' + tabs.map(function (t, i) {
          return '<button data-t="' + t[0] + '" class="' + (i === 0 ? 'active' : '') + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="ws-sheet-body" id="poBody"></div>' +
        '<div class="ws-sheet-foot">' +
        (access.can('inst.corrections.submit') ? '<button class="ws-btn" id="poCorrect">📝 SUGGEST DATA CORRECTION</button>' : '') +
        (access.can('inst.exports.request') ? '<button class="ws-btn ghost" id="poExport">Add to export selection</button>' : '') +
        '</div></div>';
      document.body.appendChild(ov);

      function kv(rows) {
        return '<div class="kv">' + rows.map(function (r) {
          return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1] == null || r[1] === '' ? '—' : r[1]) + '</b></div>';
        }).join('') + '</div>';
      }

      function renderTab(t) {
        var body = document.getElementById('poBody');
        if (t === 'overview') {
          body.innerHTML = kv([
            ['Full name', p.fullName || p.name], ['Relation', p.relation],
            ['Gender', p.gender === 'm' ? 'Male' : p.gender === 'f' ? 'Female' : p.gender],
            ['Born', p.born || p.dateOfBirth], ['Died', p.died || p.yearDeceased],
            ['Location', p.location], ['City / town', p.cityOrTown], ['Nationality', p.nationality],
            ['Status', p.status]
          ]);
        } else if (t === 'administrative') {
          body.innerHTML = kv([
            ['Province', a.province], ['District', a.district], ['Ward', a.ward],
            ['Chief', a.chief], ['Headman', a.headman], ['Sabhuku', a.sabhuku],
            ['Village book ID', a.villageBookId],
            ['National ID', access.personLevelAllowed ? (a.nationalId ? '••••' + String(a.nationalId).slice(-4) : '—') : 'RESTRICTED']
          ]);
        } else if (t === 'cultural') {
          body.innerHTML = kv([
            ['Totem (Mutupo)', k.mutupo], ['Praise name (Chidawo)', k.chidawo],
            ['Other praises (Zvidawo)', (k.zvidawo || []).join(', ')],
            ['Language cluster', (p.ethnicity || {}).languageCluster],
            ['Specific group', (p.ethnicity || {}).specificGroup],
            ['Totem greeting', o.greeting], ['Praise poem', o.praisePoem],
            ['Guruuswa origin', o.guruuswaOrigin ? 'Affirmed' : '—'], ['Taboo', o.taboo]
          ]);
        } else if (t === 'lineage') {
          var rel = p.relations || {};
          body.innerHTML = kv([
            ['Parents', (rel.parentIds || k.parentIds || []).map(nameOf).join(', ')],
            ['Spouse(s)', (rel.spouseIds || [k.spouseId]).filter(Boolean).map(nameOf).join(', ')],
            ['Children', (rel.childIds || []).map(nameOf).join(', ')],
            ['House rank', k.houseRank], ['Lineage anchor type', k.lineageAnchorType]
          ]);
        } else if (t === 'lifecycle') {
          var acts = [];
          try { acts = (typeof getAllowedActions === 'function' ? getAllowedActions(p.lifecycleState) : []) || []; } catch (e) {}
          body.innerHTML = kv([['Lifecycle state', p.lifecycleState || 'ALIVE']]) +
            '<h4>Permitted customary actions</h4><div class="chips">' +
            (acts.length ? acts.map(function (x) { return '<span class="chip">' + esc(x.code || x) + '</span>'; }).join('') : '<span class="chip">None — gates closed</span>') +
            '</div>';
        } else if (t === 'sources') {
          body.innerHTML = kv([
            ['Source', p.sourceName], ['Confidence', confidenceLabel(p)], ['Source note', p.sourceNote]
          ]) + '<p class="hint">Field-level provenance and versioning are managed under the Roots Data Governance Framework.</p>';
        } else if (t === 'audit') {
          var s = p.sync || {};
          var org = Store.get('ORG_AUDIT').filter(function (e2) { return e2.targetId === p.id; });
          body.innerHTML = kv([
            ['Version sequence', s.versionSequence || 0], ['Last mutated by device', s.lastMutatedByDevice || '—'],
            ['Approx. UTC mutation', s.utcTimestampApprox || '—'], ['Dispute flag', s._disputed ? 'DISPUTED' : 'None']
          ]) + '<h4>Institution actions on this record</h4>' +
            (org.length ? org.map(function (e2) {
              return '<div class="ws-row static">' + esc(e2.action) + ' · ' + esc(e2.user) +
                '<span class="when">' + esc(ctx.fmtDateTime(e2.at)) + '</span></div>';
            }).join('') : '<div class="ws-empty">No institution actions recorded.</div>');
        }
      }
      renderTab('overview');

      ov.querySelectorAll('.ws-tabs button').forEach(function (b) {
        b.addEventListener('click', function () {
          ov.querySelectorAll('.ws-tabs button').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          renderTab(b.dataset.t);
        });
      });
      document.getElementById('poClose').addEventListener('click', function () { ov.remove(); });
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });

      var corrBtn = document.getElementById('poCorrect');
      if (corrBtn) {
        corrBtn.addEventListener('click', function () {
          var field = prompt('Which field needs correcting? (e.g. dateOfBirth, mutupo, province)');
          if (!field) return;
          var suggested = prompt('Suggested correct value:');
          if (suggested == null) return;
          var note = prompt('Why is this correction needed?') || '';
          Store.push('CORRECTIONS', {
            id: 'COR-' + Date.now().toString(36).toUpperCase(),
            personId: p.id, personName: p.name,
            field: field.trim(), current: '', suggested: String(suggested), note: note,
            status: 'SUBMITTED', submittedBy: ctx.session.adminName, at: new Date().toISOString()
          });
          Store.logOrgAudit('SUBMIT_CORRECTION', 'Person', p.id, {});
          Store.notify('correction', 'Data correction for ' + p.name + ' submitted for review.');
          if (window.RootsInstShell) window.RootsInstShell.updateBell();
          ctx.toast('Correction submitted to the Roots Administrator.');
        });
      }
      var expBtn = document.getElementById('poExport');
      if (expBtn) {
        expBtn.addEventListener('click', function () {
          ctx.go('exports');
          ov.remove();
        });
      }
    }
  };

  /* ---------------- records view ---------------- */
  window.RootsInstViews.push({
    id: 'records',
    label: 'Records',
    icon: '🔎',
    perm: 'inst.search',
    render: function (host, ctx) {
      var access = ctx.access;
      var provinces = window.RootsInstConfig.PROVINCES_ZW;
      var totems = Object.keys(window.totemRegistry || {}).map(function (t) { return t.split('(')[0].trim(); });

      var html = '<div class="ws-page-head"><div><h2>Record Search</h2>' +
        '<p class="sub">Search across approved datasets · Scope: ' + esc(access.scopeLabel) + '</p></div></div>';

      if (!access.datasetAllowed('PEOPLE')) {
        host.innerHTML = html + ctx.lockCard('plan', 'PEOPLE dataset');
        return;
      }
      if (!access.personLevelAllowed) {
        /* Aggregate-only mode (§14): no unrestricted person-level data. */
        var agg = (window.PEOPLE || []).filter(access.inGeography);
        var byProv = {}, byTotem = {};
        agg.forEach(function (p) {
          var pr = (p.admin || {}).province || p.location || 'Unspecified';
          byProv[pr] = (byProv[pr] || 0) + 1;
          var t = (p.kinship || {}).mutupo || 'Unspecified';
          byTotem[t] = (byTotem[t] || 0) + 1;
        });
        host.innerHTML = html +
          '<div class="ws-panel"><h4>AGGREGATE VIEW ONLY</h4>' +
          '<p class="hint">Your approval covers aggregate statistics. Individual records require person-level approval.</p>' +
          '<div class="ws-two-col"><div><h4>People by province (' + agg.length + ' total)</h4>' +
          Object.keys(byProv).sort().map(function (k2) { return '<div class="ws-row static">' + esc(k2) + '<b>' + byProv[k2] + '</b></div>'; }).join('') +
          '</div><div><h4>People by totem</h4>' +
          Object.keys(byTotem).sort().map(function (k2) { return '<div class="ws-row static">' + esc(k2) + '<b>' + byTotem[k2] + '</b></div>'; }).join('') +
          '</div></div>' + ctx.lockCard('approval') + '</div>';
        return;
      }

      html +=
        '<div class="ws-filters" id="recFilters">' +
        '<input id="rfName" placeholder="Name">' +
        '<input id="rfSurname" placeholder="Surname">' +
        '<select id="rfProvince"><option value="">Province</option>' + provinces.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<input id="rfDistrict" placeholder="District">' +
        '<input id="rfWard" placeholder="Ward">' +
        '<input id="rfChief" placeholder="Chief">' +
        '<input id="rfHeadman" placeholder="Headman">' +
        '<input id="rfSabhu" placeholder="Sabhuku">' +
        '<input id="rfBook" placeholder="Village book ID">' +
        '<select id="rfTotem"><option value="">Totem</option>' + totems.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<input id="rfPraise" placeholder="Praise name">' +
        '<select id="rfLanguage"><option value="">Language</option>' + (window.all16Languages || []).map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<select id="rfGender"><option value="">Gender</option><option value="m">Male</option><option value="f">Female</option></select>' +
        '<select id="rfBand"><option value="">Age band</option><option>0-12</option><option>13-17</option><option>18-35</option><option>36-59</option><option>60+</option></select>' +
        '<select id="rfStatus"><option value="">Alive / deceased</option><option value="alive">Alive</option><option value="deceased">Deceased</option></select>' +
        '<button class="ws-btn" id="rfGo">SEARCH</button>' +
        '<button class="ws-btn ghost" id="rfClear">CLEAR</button>' +
        '</div><div id="recResults"></div>' +
        '<div class="ws-panel" id="recCorrections" style="margin-top:14px;"></div>';

      host.innerHTML = html;

      function run() {
        var f = {
          name: v('rfName').trim().toLowerCase(), surname: v('rfSurname').trim().toLowerCase(),
          province: v('rfProvince'), district: v('rfDistrict').trim().toLowerCase(),
          ward: v('rfWard').trim().toLowerCase(), chief: v('rfChief').trim().toLowerCase(),
          headman: v('rfHeadman').trim().toLowerCase(), sabhuku: v('rfSabhu').trim().toLowerCase(),
          book: v('rfBook').trim().toLowerCase(), totem: v('rfTotem'), praise: v('rfPraise').trim(),
          language: v('rfLanguage'), gender: v('rfGender'), band: v('rfBand'), status: v('rfStatus')
        };
        var results = (window.PEOPLE || []).filter(access.inGeography).filter(function (p) { return matchesFilters(p, f); });
        var out = document.getElementById('recResults');
        out.innerHTML = '<div class="ws-count">' + results.length + ' record(s) in scope</div>' +
          (results.length ? results.slice(0, 100).map(function (p) {
            var k = p.kinship || {};
            return '<button class="ws-row person" data-person="' + esc(p.id) + '">' +
              '<span><b>' + esc(p.name) + '</b> <i>' + esc(p.relation || '') + '</i><br>' +
              '<small>' + esc(k.mutupo || '—') + (k.chidawo ? ' · ' + esc(k.chidawo) : '') +
              ' · ' + esc((p.admin || {}).province || p.location || '—') +
              (p.died ? ' · †' : ' · living') + '</small></span>' +
              '<span class="chip ' + (confidenceLabel(p) === 'Verified' ? 'ok' : 'warn') + '">' + esc(confidenceLabel(p)) + '</span></button>';
          }).join('') + (results.length > 100 ? '<div class="ws-empty">Showing first 100 — refine filters.</div>' : '')
            : '<div class="ws-empty">No matching records.</div>');

        out.querySelectorAll('[data-person]').forEach(function (b) {
          b.addEventListener('click', function () { window.RootsInstPerson.open(b.dataset.person, ctx); });
        });
      }
      function v(id) { var e = document.getElementById(id); return e ? e.value : ''; }

      document.getElementById('rfGo').addEventListener('click', run);
      document.getElementById('rfClear').addEventListener('click', function () {
        document.querySelectorAll('#recFilters input, #recFilters select').forEach(function (el2) {
          if (el2.tagName === 'SELECT') el2.value = ''; else el2.value = '';
        });
        run();
      });
      run();

      var corrBox = document.getElementById('recCorrections');
      var corrs = Store.get('CORRECTIONS');
      corrBox.innerHTML = '<h4>📝 My correction submissions</h4>' + (corrs.length
        ? corrs.slice(0, 6).map(function (c) {
          return '<div class="ws-row static">👤 ' + esc(c.personName) + ' · <code>' + esc(c.field) + '</code> → "' + esc(c.suggested) + '"' +
            '<span class="chip ' + (c.status === 'APPROVED' ? 'ok' : c.status === 'REJECTED' ? 'bad' : 'warn') + '">' + esc(c.status) + '</span></div>';
        }).join('')
        : '<div class="ws-empty">No corrections submitted yet.</div>');
    }
  });

  /* ---------------- totems view ---------------- */
  window.RootsInstViews.push({
    id: 'totems',
    label: 'Totems',
    icon: '🦁',
    perm: 'inst.totems',
    render: function (host, ctx) {
      var reg = window.totemRegistry || {};
      var people = (window.PEOPLE || []).filter(ctx.access.inGeography);
      var counts = {};
      people.forEach(function (p) {
        var m = (p.kinship || {}).mutupo;
        if (m) counts[m.toLowerCase()] = (counts[m.toLowerCase()] || 0) + 1;
      });

      host.innerHTML = '<div class="ws-page-head"><div><h2>Totem Directory</h2>' +
        '<p class="sub">Cultural reference data — available to every organisation type</p></div></div>' +
        '<div class="ws-grid" id="totemGrid"></div><div id="totemDetail"></div>';

      var grid = document.getElementById('totemGrid');
      Object.keys(reg).forEach(function (key) {
        var t = reg[key];
        var base = key.split('(')[0].trim();
        var n = counts[base.toLowerCase()] || 0;
        var card = ctx.el('<button class="ws-card" id="totem-' + base.replace(/[^a-z]/gi, '') + '">' +
          '<span class="ico">🦁</span><b>' + esc(base) + '</b>' +
          '<small>' + esc((t.zvidawo || []).slice(0, 3).join(', ')) + '</small>' +
          '<span class="chip">' + n + ' in scope</span></button>');
        card.addEventListener('click', function () {
          document.getElementById('totemDetail').innerHTML =
            '<div class="ws-panel"><div class="ws-page-head"><div><h3>' + esc(key) + '</h3>' +
            '<p class="sub">System: ' + esc(t.system || '—') + '</p></div></div><div class="kv">' +
            '<div><span>Praise names (Zvidawo)</span><b>' + esc((t.zvidawo || []).join(', ') || '—') + '</b></div>' +
            '<div><span>Greeting</span><b>' + esc(t.greeting || '—') + '</b></div>' +
            '<div><span>Proverb</span><b>' + esc(t.proverb || '—') + '</b></div>' +
            '<div><span>Taboo</span><b>' + esc(t.taboo || '—') + '</b></div>' +
            '<div><span>People in scope</span><b>' + n + '</b></div></div></div>';
          document.getElementById('totemDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        grid.appendChild(card);
      });
    }
  });

  /* ---------------- culture library view ---------------- */
  window.RootsInstViews.push({
    id: 'culture',
    label: 'Culture',
    icon: '📚',
    perm: 'inst.culture',
    render: function (host, ctx) {
      var provs = window.proverbs || [];
      var cats = {};
      provs.forEach(function (p) { (cats[p.category] = cats[p.category] || []).push(p); });

      var html = '<div class="ws-page-head"><div><h2>Cultural Library</h2>' +
        '<p class="sub">Proverbs, greetings and customary terms — read-only reference</p></div></div>';

      html += '<div class="ws-two-col"><div class="ws-panel"><h4>🙏 Greetings by time of day</h4><div class="kv">';
      Object.keys(window.timeGreetings || {}).forEach(function (k) {
        var g = window.timeGreetings[k];
        html += '<div><span>' + esc(k) + '</span><b>' + esc(g.shona || '—') + (g.ndebele ? ' / ' + esc(g.ndebele) : '') + '</b></div>';
      });
      html += '</div></div><div class="ws-panel"><h4>💬 Proverbs by category</h4>';
      Object.keys(cats).sort().forEach(function (c) {
        html += '<div class="ws-row static"><b>' + esc(c.toUpperCase()) + '</b><span>' + cats[c].length + '</span></div>';
      });
      html += '</div></div>';

      html += '<div class="ws-panel"><h4>Proverb library</h4>';
      provs.forEach(function (p) {
        html += '<div class="ws-quote"><b>"' + esc(p.shona) + '"</b><br>' + esc(p.translation || '') +
          '<small> — ' + esc(p.meaning || '') + ' <span class="chip">' + esc(p.category || '') + '</span></small></div>';
      });
      html += '</div>';

      html += '<div class="ws-panel"><h4>Glossary of customary terms</h4>' +
        (window.glossaryTerms || []).map(function (g) {
          return '<div class="ws-row static"><b>' + esc(g.term) + '</b> <i>(' + esc(g.lang || '') + ')</i><br><small>' + esc(g.meaning || '') + '</small></div>';
        }).join('') + '</div>';

      host.innerHTML = html;
    }
  });
})();
