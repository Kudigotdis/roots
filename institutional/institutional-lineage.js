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
          (results.length ? results.slice(0, 80).map(function (p, i) {
            var k = p.kinship || {};
            return '<div class="ws-lineage-hit">' +
              '<button class="ws-row person grow" data-person="' + esc(p.id) + '">' +
              '<span><b>' + esc(p.name) + '</b> <i>' + esc(p.relation || '') + '</i><br>' +
              '<small>' + esc(k.mutupo || '—') + (k.chidawo ? ' · ' + esc(k.chidawo) : '') +
              ((k.zvidawo || []).length ? ' · praises: ' + esc(k.zvidawo.join(', ')) : '') +
              ' · ' + esc((p.admin || {}).province || p.location || '—') + '</small></span></button>' +
              '<button class="ws-mini" data-table="' + i + '" title="Open lineage table (Setup 4 §62)">🧾 TABLE</button>' +
              '</div>';
          }).join('') : '<div class="ws-empty">No matching records.</div>');
        out.querySelectorAll('[data-person]').forEach(function (b) {
          b.addEventListener('click', function () { window.RootsInstPerson.open(b.dataset.person, ctx); });
        });
        out.querySelectorAll('[data-table]').forEach(function (b) {
          b.addEventListener('click', function () {
            renderLineageTable(document.getElementById('lnTable'), results[parseInt(b.dataset.table, 10)], ctx);
            try { document.getElementById('lnTable').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
          });
        });
      });
      host.insertAdjacentHTML('beforeend', '<div id="lnTable"></div>');
      document.getElementById('lnGo').click();
    }
  });

  /* ---------------- §62 institutional lineage table ----------------
     Record-level cross-reference for one anchor person:
     Years / Person / Parents / Children / Collateral / Totem /
     House / Administrative area / Source & confidence.
     Relatives outside the approved geography are counted, never listed. */
  function byId(id) {
    var hit = null;
    (window.PEOPLE || []).forEach(function (p) { if (p.id === id) hit = p; });
    return hit;
  }
  function years(p) {
    var b = p.born || p.dateOfBirth || '?';
    return String(b) + ' – ' + (p.died ? String(p.died) : 'present');
  }
  function confidenceLabel(c) {
    if (c === 'VERIFIED') return '<span class="chip ok">VERIFIED</span>';
    if (c === 'UNVERIFIED') return '<span class="chip warn">UNVERIFIED</span>';
    return '<span class="chip dim">' + esc(c || 'PENDING') + '</span>';
  }
  function adminArea(p) {
    var a = p.admin || {};
    var bits = [a.province, a.district, a.ward].filter(Boolean);
    if (a.chief) bits.push('Chief ' + a.chief);
    return bits.length ? bits.join(' · ') : (p.location || '—');
  }
  function houseLabel(p) {
    var r = (p.kinship || {}).houseRank;
    return (r == null || r === '') ? '—' : 'House ' + esc(String(r));
  }
  function renderLineageTable(mount, p, ctx) {
    var access = ctx.access;
    var scoped = (window.PEOPLE || []).filter(access.inGeography);
    function rel(ids) {
      ids = ids || [];
      var shown = [], hidden = 0;
      ids.forEach(function (id) {
        var q = byId(id);
        if (!q) return;
        if (access.inGeography(q)) shown.push(q); else hidden++;
      });
      return { shown: shown, hidden: hidden };
    }
    /* parents: relations.parentIds preferred, kinship fallback */
    var parentIds = (((p.relations || {}).parentIds) || []).slice();
    if (!parentIds.length && ((p.kinship || {}).parentIds)) parentIds = p.kinship.parentIds.slice();
    var parents = rel(parentIds);
    var kids = rel(((window.PEOPLE || []).filter(function (q) {
      var rp = ((q.relations || {}).parentIds) || ((q.kinship || {}).parentIds) || [];
      return rp.indexOf(p.id) !== -1;
    }).map(function (q) { return q.id; })));
    /* collateral: siblings (shared parent) + spouses */
    var sibIds = [];
    parentIds.forEach(function (pid) {
      (window.PEOPLE || []).forEach(function (q) {
        if (q.id === p.id) return;
        var rp = ((q.relations || {}).parentIds) || ((q.kinship || {}).parentIds) || [];
        if (rp.indexOf(pid) !== -1 && sibIds.indexOf(q.id) === -1) sibIds.push(q.id);
      });
    });
    var spouseIds = (((p.relations || {}).spouseIds) || []).slice();
    var coll = rel(sibIds.concat(spouseIds));
    var k = p.kinship || {};
    var totem = (k.mutupo || '—') + (k.chidawo ? ' (' + k.chidawo + ')' : '');
    var src = p.sourceName ? (p.sourceName + (p.sourceNote ? ' — ' + p.sourceNote : '')) : '—';

    mount.innerHTML =
      '<div class="ws-panel"><div class="ws-panel-head"><h4>🧾 Lineage table — ' + esc(p.name) + '</h4>' +
      '<button class="ws-mini" id="ltClose">CLOSE</button></div>' +
      '<table class="ws-table"><tbody>' +
      row('Years', years(p)) +
      row('Person', '<b>' + esc(p.name) + '</b>' + (p.relation ? ' <i>' + esc(p.relation) + '</i>' : '') +
        (p.gender ? ' · ' + (p.gender === 'm' ? 'male' : 'female') : '')) +
      row('Parents', relList(parents, 'None recorded')) +
      row('Children', relList(kids, 'None recorded')) +
      row('Collateral', relList(coll, 'None recorded') +
        (sibIds.length ? ' <small class="sub">incl. ' + sibIds.length + ' sibling(s)</small>' : '')) +
      row('Totem', esc(totem) + ((k.zvidawo || []).length ? ' · praises: ' + esc(k.zvidawo.join(', ')) : '')) +
      row('House', houseLabel(p)) +
      row('Administrative area', esc(adminArea(p))) +
      row('Source', esc(src) + ' ' + confidenceLabel(p.dataConfidence)) +
      '</tbody></table>' +
      '<p class="sub" style="margin:8px 0 0;">Read-only reference compiled under approved scope (' +
      esc(access.scopeLabel) + '). Records outside scope are counted, not listed.</p></div>';

    document.getElementById('ltClose').addEventListener('click', function () { mount.innerHTML = ''; });
    mount.querySelectorAll('[data-lt]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = byId(b.dataset.lt);
        if (q) renderLineageTable(mount, q, ctx);
      });
    });
    window.RootsInstStore.logOrgAudit('VIEW_LINEAGE_TABLE', 'Person', p.id, {});

    function row(label, val) {
      return '<tr><th>' + label + '</th><td>' + val + '</td></tr>';
    }
    function relList(r, none) {
      if (!r.shown.length && !r.hidden) return none;
      return r.shown.map(function (q) {
        return '<button class="ws-inline-link" data-lt="' + esc(q.id) + '">' + esc(q.name) + '</button>';
      }).join(', ') +
        (r.hidden ? ' <span class="chip dim">+' + r.hidden + ' outside scope</span>' : '');
    }
  }

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

  /* ---------------- lifecycle & customary register (§63-65) ----------------
     Lifecycle state machine view + customary-law tools driven by the
     pure functions in customary.js. Marriage registry / exogamy
     statistics beyond the pairwise check are labelled as awaiting the
     data model — no data is invented (Setup 4 §63). */
  window.RootsInstViews.push({
    id: 'lifecycle',
    label: 'Lifecycle',
    icon: '⚖️',
    perm: 'inst.lifecycle',
    module: 'TRADITIONAL_SUITE',
    altModule: 'GOVERNMENT_SUITE',
    moduleTitle: 'Customary Law Register',
    render: function (host, ctx) {
      var access = ctx.access;
      if (!access.datasetAllowed('LIFECYCLE')) {
        host.innerHTML = ctx.lockCard('approval', 'Lifecycle records');
        return;
      }
      var scoped = (window.PEOPLE || []).filter(access.inGeography);
      var states = Object.keys(LIFECYCLE_STATES).map(function (k) { return LIFECYCLE_STATES[k]; });
      var counts = {};
      states.forEach(function (s) { counts[s] = 0; });
      var unknown = 0;
      scoped.forEach(function (p) {
        var s = p.lifecycleState;
        if (s && counts[s] != null) counts[s]++; else unknown++;
      });
      var living = scoped.filter(function (p) { return !p.died; }).length;

      host.innerHTML =
        '<div class="ws-page-head"><div><h2>Lifecycle &amp; Customary Law Register</h2>' +
        '<p class="sub">Deceased-node lifecycle states, marriage feasibility, house seniority and totem drift — read-only</p></div></div>' +

        '<div class="ws-cards">' + states.map(function (s) {
          return '<button class="ws-card" data-state="' + esc(s) + '"><b>' + counts[s] + '</b><span>' +
            esc(s.replace(/_/g, ' ')) + '</span></button>';
        }).join('') +
          '<div class="ws-card static"><b>' + unknown + '</b><span>state unrecorded</span></div>' +
          '<div class="ws-card static"><b>' + living + '</b><span>living in scope</span></div>' +
        '</div>' +

        '<div id="lcStateList"></div>' +

        '<div class="ws-two-col" style="margin-top:14px;">' +

        '<div class="ws-panel"><h4>💍 Marriage feasibility (exogamy check)</h4>' +
        '<p class="sub">Mutupo-neChidawo prohibition — customary.js §6.1</p>' +
        '<select id="mcA" style="max-width:100%;"></select>' +
        '<select id="mcB" style="max-width:100%; margin-top:6px;"></select>' +
        '<div style="margin-top:8px;"><button class="ws-btn" id="mcGo">CHECK</button></div>' +
        '<div id="mcOut" style="margin-top:8px;"></div>' +
        '<p class="sub" style="margin-top:10px;">A full marriage registry is not yet supported by the dataset model.</p></div>' +

        '<div class="ws-panel"><h4>🏠 Polygamous house seniority</h4>' +
        '<p class="sub">Children ordered by house rank, then birth (customary.js §6.4)</p>' +
        '<select id="hsP" style="max-width:100%;"></select>' +
        '<div style="margin-top:8px;"><button class="ws-btn" id="hsGo">ORDER HOUSES</button></div>' +
        '<div id="hsOut" style="margin-top:8px;"></div></div>' +

        '</div>' +

        '<div class="ws-panel" style="margin-top:14px;"><h4>🕊️ Totem drift (out-of-wedlock children)</h4>' +
        '<p class="sub">Active totem computed from maternal grandfather / cleared ledger (customary.js §6.3)</p>' +
        '<div id="tdOut"></div>' +
        '<p class="sub" style="margin-top:8px;">Maputiro/chiredzwa ledger payments are not recorded in this dataset; drift resolves via maternal line where no father is recorded.</p></div>';

      /* state drill-down */
      host.querySelectorAll('[data-state]').forEach(function (c) {
        c.addEventListener('click', function () {
          var s = c.dataset.state;
          var list = scoped.filter(function (p) { return p.lifecycleState === s; }).slice(0, 40);
          document.getElementById('lcStateList').innerHTML =
            '<div class="ws-panel"><h4>' + esc(s.replace(/_/g, ' ')) + ' — ' + list.length + ' shown</h4>' +
            (list.length ? list.map(function (p) {
              var acts = [];
              try { acts = getAllowedActions(p.lifecycleState) || []; } catch (e) {}
              return '<button class="ws-row person" data-person="' + esc(p.id) + '"><span><b>' + esc(p.name) + '</b>' +
                '<small>' + esc(years(p)) + ' · ' + esc(adminArea(p)) + '</small></span>' +
                '<span class="chip dim">' + esc(acts.length ? acts.length + ' permitted action(s)' : 'no actions') + '</span></button>';
            }).join('') : '<div class="ws-empty">No records in this state.</div>') + '</div>';
          bindPeople('lcStateList');
        });
      });

      /* person pickers for the two tools */
      var pickList = scoped.filter(function (p) { return !p.died; }).slice(0, 400)
        .map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + ' (' + esc((p.kinship || {}).mutupo || '—') + ')</option>'; })
        .join('');
      ['mcA', 'mcB'].forEach(function (id) {
        document.getElementById(id).innerHTML = '<option value="">— select person —</option>' + pickList;
      });
      document.getElementById('hsP').innerHTML = '<option value="">— select parent —</option>' + pickList;

      document.getElementById('mcGo').addEventListener('click', function () {
        var a = byId(document.getElementById('mcA').value);
        var b = byId(document.getElementById('mcB').value);
        var out = document.getElementById('mcOut');
        if (!a || !b) { out.innerHTML = '<div class="ws-empty">Select both people.</div>'; return; }
        if (a.id === b.id) { out.innerHTML = '<div class="ws-empty">Select two different people.</div>'; return; }
        var v = validateMarriageFeasibility(a, b);
        out.innerHTML = v.allowed
          ? '<div class="ws-row static ok">✔ Permitted under the totem-exogamy rule.<small>' + esc(v.message || '') + '</small></div>'
          : '<div class="ws-row static bad">✘ ' + esc(v.message) + '</div>';
        window.RootsInstStore.logOrgAudit('RUN_MARRIAGE_CHECK', 'Person', a.id, { with: b.id, allowed: !!v.allowed });
      });

      document.getElementById('hsGo').addEventListener('click', function () {
        var p = byId(document.getElementById('hsP').value);
        var out = document.getElementById('hsOut');
        if (!p) { out.innerHTML = '<div class="ws-empty">Select a parent first.</div>'; return; }
        var kidsAll = scoped.filter(function (q) {
          var rp = ((q.relations || {}).parentIds) || ((q.kinship || {}).parentIds) || [];
          return rp.indexOf(p.id) !== -1;
        });
        if (!kidsAll.length) { out.innerHTML = '<div class="ws-empty">No children recorded in scope.</div>'; return; }
        /* group children by mother to form houses */
        var houses = {};
        var motherless = [];
        kidsAll.forEach(function (c) {
          var mId = null;
          (((c.relations || {}).parentIds) || ((c.kinship || {}).parentIds) || []).forEach(function (pid) {
            if (pid === p.id) return;
            var cand = byId(pid);
            if (cand && cand.gender === 'f') mId = pid;
          });
          if (mId) (houses[mId] = houses[mId] || []).push(c); else motherless.push(c);
        });
        var keys = Object.keys(houses);
        if (!keys.length) {
          out.innerHTML = '<div class="ws-empty">No matrilineal houses derivable — ' +
            kidsAll.length + ' child record(s) without a recorded mother in scope.</div>';
          return;
        }
        out.innerHTML = keys.map(function (mId) {
          var m = byId(mId);
          var ordered = sortByHouseSeniority(houses[mId]);
          return '<div class="ws-row static"><b>House of ' + esc(m ? m.name : mId) + '</b>' +
            '<small>' + ordered.map(function (c) {
              var r = (c.kinship || {}).houseRank;
              return esc(c.name) + (r != null && r !== '' ? ' [rank ' + esc(String(r)) + ']' : '');
            }).join(' → ') + '</small></div>';
        }).join('') +
          (motherless.length ? '<div class="ws-row static"><small>' + motherless.length +
            ' child record(s) not attached to a house (mother unrecorded).</small></div>' : '');
        window.RootsInstStore.logOrgAudit('VIEW_HOUSE_SENIORITY', 'Person', p.id, { houses: keys.length });
      });

      /* totem drift sample: scoped people with a recorded mother but no father */
      var driftRows = [];
      scoped.slice(0, 600).forEach(function (c) {
        var rp = (((c.relations || {}).parentIds) || ((c.kinship || {}).parentIds) || []);
        if (!rp.length) return;
        var father = null, mother = null;
        rp.forEach(function (pid) {
          var q = byId(pid);
          if (!q) return;
          if (q.gender === 'm' && !father) father = q;
          if (q.gender === 'f' && !mother) mother = q;
        });
        if (!mother || father) return;
        var gfaId = ((((mother.relations || {}).parentIds) || ((mother.kinship || {}).parentIds) || [])[0]);
        var gfa = gfaId ? byId(gfaId) : null;
        if (!gfa || gfa.gender !== 'm') return;
        var r = resolveChildTotem(c, gfa, null);
        driftRows.push({ c: c, r: r });
      });
      document.getElementById('tdOut').innerHTML = driftRows.length
        ? driftRows.slice(0, 12).map(function (d) {
          return '<div class="ws-row static"><span><b>' + esc(d.c.name) + '</b><br><small>active totem: <i>' +
            esc(d.r.activeTotem) + '</i> · anchor: ' + esc(d.r.anchor) + '</small></span>' +
            '<button class="ws-inline-link" data-td="' + esc(d.c.id) + '">open</button></div>';
        }).join('')
        : '<div class="ws-empty">No totem-drift cases derivable in scope (each candidate needs a recorded mother and maternal grandfather, with no father).</div>';
      bindPeople('tdOut');

      function bindPeople(rootId) {
        document.getElementById(rootId).querySelectorAll('[data-person]').forEach(function (b) {
          b.addEventListener('click', function () { window.RootsInstPerson.open(b.dataset.person, ctx); });
        });
        document.getElementById(rootId).querySelectorAll('[data-td]').forEach(function (b) {
          b.addEventListener('click', function () { window.RootsInstPerson.open(b.dataset.td, ctx); });
        });
      }
    }
  });
})();
