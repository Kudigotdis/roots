/* ============================================================
   INSTITUTIONAL DISPUTE QUEUE (Setup 4 §30-33).
   Records flagged DISPUTED by the sync conflict resolver.
   Institutions review, resolve locally (with audit trail) or
   escalate to the Roots Administrator. Filters + detail with
   side-by-side values.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  var Store = window.RootsInstStore;

  function conflictFields(p) {
    /* Fields most likely contested in a sync conflict. */
    var k = p.kinship || {};
    return [
      ['Name', p.name],
      ['Totem', k.mutupo],
      ['Praise name', k.chidawo],
      ['Born', p.born || p.dateOfBirth],
      ['Died', p.died]
    ];
  }

  window.RootsInstViews.push({
    id: 'disputes',
    label: 'Disputes',
    icon: '⚖️',
    perm: 'inst.disputes.view',
    render: function (host, ctx) {
      var access = ctx.access;

      function draw() {
        var all = (window.PEOPLE || []).filter(access.inGeography);
        var open = all.filter(function (p) { return p.sync && p.sync._disputed; });
        var resolved = Store.get('ORG_AUDIT').filter(function (e) {
          return e.action === 'RESOLVE_DISPUTE' || e.action === 'ESCALATE_DISPUTE';
        });

        var html = '<div class="ws-page-head"><div><h2>Dispute Queue</h2>' +
          '<p class="sub">Records flagged by the sync conflict resolver require review by elders or council administrators</p></div></div>' +
          '<div class="ws-filters">' +
          '<select id="dqType"><option value="">All record types</option><option>Living</option><option>Deceased</option></select>' +
          '<select id="dqSeverity"><option value="">All severities</option><option value="1">Single-version conflict</option><option value="2">Multi-version conflict</option></select>' +
          '<button class="ws-btn" id="dqGo">APPLY</button>' +
          '<span class="chip bad" style="align-self:center;">' + open.length + ' OPEN</span>' +
          '</div><div id="dqList"></div>';

        if (access.can('inst.disputes.resolve') === false && !open.length) { /* viewer still sees list */ }

        html += '<div class="ws-panel" style="margin-top:14px;"><h4>Institution dispute history</h4>' +
          (resolved.length ? resolved.slice(0, 8).map(function (e2) {
            return '<div class="ws-row static">' + esc(e2.action) + ' · <code>' + esc(e2.targetId) + '</code> by ' + esc(e2.user) +
              '<span class="when">' + esc(ctx.fmtDateTime(e2.at)) + '</span></div>';
          }).join('') : '<div class="ws-empty">No resolutions recorded yet.</div>') + '</div>';

        host.innerHTML = html;
        document.getElementById('dqGo').addEventListener('click', drawList);

        function drawList() {
          var t = document.getElementById('dqType').value;
          var sev = document.getElementById('dqSeverity').value;
          var list = open.filter(function (p) {
            if (t === 'Living' && p.died) return false;
            if (t === 'Deceased' && !p.died) return false;
            if (sev === '1' && ((p.sync || {}).versionSequence || 0) > 1) return false;
            if (sev === '2' && ((p.sync || {}).versionSequence || 0) <= 1) return false;
            return true;
          });
          var box = document.getElementById('dqList');
          if (!list.length) {
            box.innerHTML = '<div class="ws-empty ok">✅ No disputed records match. All sync resolutions are clean.</div>';
            return;
          }
          box.innerHTML = list.map(function (p) {
            var s = p.sync || {};
            return '<button class="ws-row person" data-dispute="' + esc(p.id) + '">' +
              '<span>⚠️ <b>' + esc(p.name) + '</b> <i>' + esc(p.relation || '') + '</i><br>' +
              '<small>Version seq: ' + (s.versionSequence || 0) + ' · Last mutated by device: ' + esc(s.lastMutatedByDevice || 'local') + '</small></span>' +
              '<span class="chip bad">DISPUTED</span></button>';
          }).join('');
          box.querySelectorAll('[data-dispute]').forEach(function (b) {
            b.addEventListener('click', function () { detail(b.dataset.dispute); });
          });
        }
        drawList();
      }

      function detail(id) {
        var p = null;
        (window.PEOPLE || []).forEach(function (x) { if (x.id === id) p = x; });
        if (!p) return;
        var fields = conflictFields(p);
        var ov = document.createElement('div');
        ov.className = 'ws-overlay';
        ov.innerHTML =
          '<div class="ws-sheet"><div class="ws-sheet-head"><div><span class="chip bad">DISPUTED RECORD</span>' +
          '<h3>' + esc(p.name) + '</h3></div><button class="ws-icon-btn" id="dqClose">✕</button></div>' +
          '<div class="ws-sheet-body">' +
          table(fields) +
          '<p class="hint">Local value is what this device holds. The remote value is the conflicting synced version. Choose a resolution — every action is audited and escalated items go to the Roots Administrator.</p></div>' +
          '<div class="ws-sheet-foot" id="dqActions"></div></div>';
        document.body.appendChild(ov);
        document.getElementById('dqClose').addEventListener('click', function () { ov.remove(); });
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });

        function table(fs) {
          return '<table class="ws-table"><thead><tr><th>FIELD</th><th>A · LOCAL</th></tr></thead><tbody>' +
            fs.map(function (f) {
              return '<tr><td>' + esc(f[0]) + '</td><td>' + esc(f[1] || '—') + '</td></tr>';
            }).join('') + '</tbody></table>';
        }

        var actions = document.getElementById('dqActions');
        var canResolve = access.can('inst.disputes.resolve');
        actions.innerHTML =
          '<button class="ws-btn" data-act="resolve">✅ MARK RESOLVED</button>' +
          '<button class="ws-btn ghost" data-act="escalate">⬆ ESCALATE TO ROOTS ADMIN</button>';
        if (!canResolve) {
          actions.querySelector('[data-act="resolve"]').disabled = true;
          actions.querySelector('[data-act="resolve"]').title = 'Your role cannot resolve disputes';
        }
        actions.querySelectorAll('[data-act]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (b.dataset.act === 'resolve') {
              p.sync._disputed = false;
              Store.logOrgAudit('RESOLVE_DISPUTE', 'Person', p.id, {});
              /* Mirror into admin console dispute resolutions so both consoles agree. */
              var res = Store.readJson('roots_admin_dispute_resolutions', []);
              res.unshift({ personId: p.id, action: 'ACCEPTED_LOCAL', by: ctx.session.adminName, institution: access.institutionName, at: new Date().toISOString() });
              Store.writeJson('roots_admin_dispute_resolutions', res.slice(0, 500));
              ctx.toast('✅ Dispute marked resolved for ' + p.name);
            } else {
              Store.logOrgAudit('ESCALATE_DISPUTE', 'Person', p.id, {});
              Store.notify('dispute', 'Dispute on ' + p.name + ' escalated to the Roots Administrator.');
              ctx.toast('⬆ Escalated to the Roots Administrator.');
            }
            if (window.RootsInstShell) window.RootsInstShell.updateBell();
            ov.remove();
            draw();
          });
        });
      }

      draw();
    }
  });
})();
