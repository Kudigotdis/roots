/* ============================================================
   INSTITUTIONAL LINEAGE (Setup 4 §26-29).
   Advanced lineage auditor, chieftainship succession
   simulation (reuses customary.js computeNextInLine), family
   groupings. Gated behind the RESEARCH/TRADITIONAL suites.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  /* ---------------- lineage auditor ---------------- */
  window.RootsInstViews.push({
    id: 'lineage',
    label: 'Lineage',
    icon: '🌳',
    perm: 'inst.lineage',
    module: 'RESEARCH_SUITE',
    moduleTitle: 'Advanced Lineage Auditor',
    render: function (host, ctx) {
      var access = ctx.access;
      var provinces = window.RootsInstConfig.PROVINCES_ZW;
      var totems = Object.keys(window.totemRegistry || {}).map(function (t) { return t.split('(')[0].trim(); });

      host.innerHTML =
        '<div class="ws-page-head"><div><h2>Advanced Lineage Auditor</h2>' +
        '<p class="sub">Cross-reference people by totem, place and generation</p></div></div>' +
        '<div class="ws-filters">' +
        '<input id="lnName" placeholder="Name">' +
        '<select id="lnProvince"><option value="">Province</option>' + provinces.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<select id="lnTotem"><option value="">Totem</option>' + totems.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<select id="lnGender"><option value="">Gender</option><option value="m">Male</option><option value="f">Female</option></select>' +
        '<select id="lnStatus"><option value="">Status</option><option value="alive">Alive</option><option value="deceased">Deceased</option></select>' +
        '<button class="ws-btn" id="lnGo">SEARCH</button></div>' +
        '<div id="lnResults"></div>';

      function v(id) { var e = document.getElementById(id); return e ? e.value : ''; }
      document.getElementById('lnGo').addEventListener('click', function () {
        var f = {
          name: v('lnName').trim().toLowerCase(), province: v('lnProvince'),
          totem: v('lnTotem'), gender: v('lnGender'), status: v('lnStatus')
        };
        var results = (window.PEOPLE || []).filter(access.inGeography).filter(function (p) {
          var k = p.kinship || {}, a = p.admin || {};
          if (f.name && String(p.name || '').toLowerCase().indexOf(f.name) === -1) return false;
          if (f.province && a.province !== f.province) return false;
          if (f.totem && String(k.mutupo || '').toLowerCase().indexOf(f.totem.toLowerCase()) === -1) return false;
          if (f.gender && p.gender !== f.gender) return false;
          if (f.status === 'alive' && p.died) return false;
          if (f.status === 'deceased' && !p.died) return false;
          return true;
        });
        var out = document.getElementById('lnResults');
        out.innerHTML = '<div class="ws-count">' + results.length + ' record(s)</div>' +
          (results.length ? results.slice(0, 80).map(function (p) {
            var k = p.kinship || {};
            return '<button class="ws-row person" data-person="' + esc(p.id) + '">' +
              '<span><b>' + esc(p.name) + '</b> <i>' + esc(p.relation || '') + '</i><br>' +
              '<small>' + esc(k.mutupo || '—') + (k.chidawo ? ' · ' + esc(k.chidawo) : '') +
              ((k.zvidawo || []).length ? ' · praises: ' + esc(k.zvidawo.join(', ')) : '') +
              ' · ' + esc((p.admin || {}).province || p.location || '—') + '</small></span></button>';
          }).join('') : '<div class="ws-empty">No matching records.</div>');
        out.querySelectorAll('[data-person]').forEach(function (b) {
          b.addEventListener('click', function () { window.RootsInstPerson.open(b.dataset.person, ctx); });
        });
      });
      document.getElementById('lnGo').click();
    }
  });

  /* ---------------- succession simulator ---------------- */
  window.RootsInstViews.push({
    id: 'succession',
    label: 'Succession',
    icon: '👑',
    perm: 'inst.succession',
    module: 'GOVERNMENT_SUITE',
    moduleTitle: 'Chieftainship Succession Tools',
    render: function (host, ctx) {
      var access = ctx.access;
      var chiefs = (window.PEOPLE || []).filter(access.inGeography).filter(function (p) {
        return (p.kinship || {}).mutupo && String(p.relation || '').toLowerCase().indexOf('chief') !== -1;
      });

      host.innerHTML =
        '<div class="ws-page-head"><div><h2>Chieftainship Succession Simulator</h2>' +
        '<p class="sub">Collateral succession under Shona customary law — read-only simulation</p></div></div>' +
        '<div class="ws-panel"><label class="lbl">Select a clan chief</label>' +
        '<select id="scChief" style="max-width:420px;"><option value="">— Select a clan chief —</option>' +
        chiefs.map(function (p) {
          return '<option value="' + esc(p.id) + '">' + esc(p.name) + ' (' + esc((p.kinship || {}).mutupo) + ')</option>';
        }).join('') + '</select>' +
        '<div style="margin-top:10px;"><button class="ws-btn" id="scRun">RUN SIMULATION</button></div></div>' +
        '<div id="scResult"></div>';

      document.getElementById('scRun').addEventListener('click', function () {
        var id = document.getElementById('scChief').value;
        var out = document.getElementById('scResult');
        if (!id) { out.innerHTML = '<div class="ws-empty">Select a chief first.</div>'; return; }
        var chief = null;
        (window.PEOPLE || []).forEach(function (p) { if (p.id === id) chief = p; });
        var candidates = (window.PEOPLE || []).filter(access.inGeography).filter(function (p) {
          var k = p.kinship || {};
          return k.mutupo && k.mutupo === chief.kinship.mutupo &&
            p.gender === 'm' && !p.died && p.id !== chief.id;
        });
        var result = null;
        try { result = computeNextInLine(candidates); } catch (e) {}
        if (!result) { out.innerHTML = '<div class="ws-empty">Simulation unavailable for this selection.</div>'; return; }

        out.innerHTML = '<div class="ws-two-col"><div class="ws-panel">' +
          '<h4>👑 Next in line' + (result.candidate ? '' : ' — none found') + '</h4>' +
          (result.candidate
            ? '<button class="ws-row person" id="scWinner"><span><b>' + esc(result.candidate.name) + '</b><br>' +
              '<small>' + esc((result.candidate.kinship || {}).chidawo || '—') +
              ' · b. ' + esc(result.candidate.born || result.candidate.dateOfBirth || '?') + '</small></span></button>'
            : '<div class="ws-empty">No eligible male heir in the dataset.</div>') +
          '</div><div class="ws-panel"><h4>Disqualification log</h4>' +
          ((result.disqualifications || []).length
            ? result.disqualifications.slice(0, 20).map(function (d) {
              return '<div class="ws-row static">' + esc(d.name || d.id || 'candidate') +
                '<small>' + esc(d.reason || d.rule || '') + '</small></div>';
            }).join('')
            : '<div class="ws-empty">No disqualifications recorded.</div>') +
          '</div></div>';
        var w = document.getElementById('scWinner');
        if (w) w.addEventListener('click', function () { window.RootsInstPerson.open(result.candidate.id, ctx); });
        window.RootsInstStore.logOrgAudit('RUN_SUCCESSION_SIMULATION', 'Person', chief.id,
          { result: result.candidate ? 'SUCCESS: ' + result.candidate.name : 'NO_HEIR' });
      });
    }
  });

  /* ---------------- families view ---------------- */
  window.RootsInstViews.push({
    id: 'families',
    label: 'Families',
    icon: '👪',
    perm: 'inst.families',
    render: function (host, ctx) {
      var access = ctx.access;
      var groups = {};
      (window.PEOPLE || []).filter(access.inGeography).forEach(function (p) {
        var k = p.kinship || {};
        if (!k.mutupo && !k.chidawo) return;
        var key = (k.mutupo || '—') + '|' + (k.chidawo || '—');
        (groups[key] = groups[key] || []).push(p);
      });
      var keys = Object.keys(groups).sort();

      host.innerHTML =
        '<div class="ws-page-head"><div><h2>Family Groupings</h2>' +
        '<p class="sub">' + keys.length + ' mutupo/chidawo households in scope</p></div></div>' +
        '<div class="ws-filters"><input id="fmFilter" placeholder="Filter by totem or praise name">' +
        '<button class="ws-btn" id="fmGo">FILTER</button></div><div id="fmList"></div>';

      function draw(q) {
        var list = document.getElementById('fmList');
        var shown = keys.filter(function (k) {
          return !q || k.toLowerCase().indexOf(q.toLowerCase()) !== -1;
        });
        list.innerHTML = shown.slice(0, 60).map(function (k, i) {
          var parts = k.split('|');
          return '<button class="ws-row person" data-fam="' + i + '"><b>' + esc(parts[0]) + '</b>' +
            (parts[1] !== '—' ? ' <i>('.concat(esc(parts[1]), ')</i>') : '') +
            '<span class="chip">' + groups[k].length + ' members</span></button>';
        }).join('') + '<div id="famDetail"></div>';
        list.querySelectorAll('[data-fam]').forEach(function (b) {
          b.addEventListener('click', function () {
            var g = groups[shown[parseInt(b.dataset.fam, 10)]];
            document.getElementById('famDetail').innerHTML =
              '<div class="ws-panel"><h4>Members</h4>' + g.slice(0, 30).map(function (p) {
                return '<button class="ws-row person" data-person="' + esc(p.id) + '">👤 ' + esc(p.name) +
                  ' <i>' + esc(p.relation || '') + '</i>' +
                  (p.died ? '<span class="chip warn">DECEASED</span>' : '') + '</button>';
              }).join('') + '</div>';
            document.getElementById('famDetail').querySelectorAll('[data-person]').forEach(function (pb) {
              pb.addEventListener('click', function () { window.RootsInstPerson.open(pb.dataset.person, ctx); });
            });
          });
        });
      }
      document.getElementById('fmGo').addEventListener('click', function () {
        draw(document.getElementById('fmFilter').value.trim());
      });
      draw('');
    }
  });
})();
