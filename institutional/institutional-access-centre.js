/* ============================================================
   INSTITUTIONAL ACCESS CENTRE (Setup 4 §40-43, §49).
   Shows exactly what the institution can access, expiry
   warnings, and REQUEST MORE ACCESS — which files into the
   Roots Administrator queue (roots_admin_access_requests).
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  var Store = window.RootsInstStore;
  var SUITES = (window.RootsInstConfig && window.RootsInstConfig.MODULE_SUITES) || {};

  window.RootsInstViews.push({
    id: 'access',
    label: 'Access',
    icon: '🛡️',
    perm: 'inst.access.request',
    render: function (host, ctx) {
      var access = ctx.access;

      function suiteRow(id) {
        var s = SUITES[id] || { title: id };
        var has = access.hasModule(id);
        return '<div class="ws-row static"><b>' + esc(s.title || id) + '</b><small>' +
          esc((s.items || []).join(' · ') || '') + '</small>' +
          '<span class="chip ' + (has ? 'ok' : 'warn') + '">' + (has ? 'INCLUDED' : 'NOT INCLUDED') + '</span></div>';
      }

      var daysLeft = '';
      if (access.grantExpiry) {
        var d = Math.ceil((new Date(access.grantExpiry) - Date.now()) / 864e5);
        daysLeft = '<span class="chip ' + (d > 30 ? 'ok' : d > 0 ? 'warn' : 'bad') + '">' +
          (d > 0 ? 'expires in ' + d + ' day(s)' : 'EXPIRED') + '</span>';
      }

      host.innerHTML =
        '<div class="ws-page-head"><div><h2>Access Centre</h2>' +
        '<p class="sub">What this organisation can see and do today</p></div></div>' +

        '<div class="ws-two-col"><div class="ws-panel"><h4>Approved datasets</h4>' +
        (access.datasets.map(function (d) { return '<div class="ws-row static">🗃️ ' + esc(d) + '</div>'; }).join('') ||
          '<div class="ws-empty">No datasets approved.</div>') +
        '<div class="kv" style="margin-top:10px;">' +
        '<div><span>Person-level data</span><b>' + (access.personLevelAllowed ? 'APPROVED' : 'NOT APPROVED') + '</b></div>' +
        '<div><span>Anonymisation</span><b>' + (access.anonymizationRequired ? 'REQUIRED' : 'Not required') + '</b></div>' +
        '<div><span>Geographic scope</span><b>' + esc(access.scopeLabel) + '</b></div>' +
        '<div><span>Grant expiry</span><b>' + esc(access.grantExpiry ? ctx.fmtDate(access.grantExpiry) : 'No fixed expiry') + ' </b>' + daysLeft + '</div>' +
        '<div><span>Export formats</span><b>' + esc(access.allowedExports.join(', ')) + '</b></div>' +
        '</div></div>' +

        '<div class="ws-panel"><h4>Modules & suites</h4>' +
        Object.keys(SUITES).map(suiteRow).join('') + '</div></div>' +

        '<div class="ws-panel"><h4>REQUEST MORE ACCESS</h4>' +
        '<p class="hint">Requests are sent to the Roots Administrator. Nothing changes until they approve it.</p>' +
        '<div class="ws-filters" style="align-items:flex-end;">' +
        '<div style="flex:2;min-width:180px;"><label class="lbl">Dataset / module requested</label>' +
        '<select id="arItem"><option value="">— Select —</option>' +
        Object.keys(SUITES).map(function (k) { return '<option value="' + k + '">' + esc(SUITES[k].title || k) + '</option>'; }).join('') +
        '<option value="PERSON_LEVEL">Person-level data approval</option>' +
        '<option value="PEOPLE">PEOPLE dataset</option></select></div>' +
        '<div style="flex:1;min-width:120px;"><label class="lbl">Duration (days)</label>' +
        '<select id="arDays"><option>30</option><option>90</option><option>365</option><option value="0">Ongoing</option></select></div>' +
        '<div style="flex:3;min-width:200px;"><label class="lbl">Purpose</label>' +
        '<input id="arPurpose" placeholder="Why is this needed?"></div>' +
        '<button class="ws-btn" id="arGo">SUBMIT REQUEST</button></div>' +
        '<div id="arHistory" style="margin-top:10px;"></div></div>';

      function drawHistory() {
        var mine = Store.readJson('roots_admin_access_requests', []).filter(function (r) {
          return r.institutionId === access.institutionId;
        });
        document.getElementById('arHistory').innerHTML = mine.length
          ? mine.slice(0, 6).map(function (r) {
            return '<div class="ws-row static">📨 <code>' + esc(r.requestId) + '</code> · ' + esc((r.datasets || []).join(', ')) +
              '<span class="chip ' + (r.status === 'APPROVED' ? 'ok' : r.status === 'REJECTED' ? 'bad' : 'warn') + '">' + esc(r.status) + '</span></div>';
          }).join('')
          : '<div class="ws-empty">No requests filed yet.</div>';
      }

      document.getElementById('arGo').addEventListener('click', function () {
        var item = document.getElementById('arItem').value;
        if (!item) { ctx.toast('Choose what you are requesting.'); return; }
        var purpose = document.getElementById('arPurpose').value.trim();
        if (!purpose) { ctx.toast('State the purpose of the request.'); return; }
        var days = parseInt(document.getElementById('arDays').value, 10);
        var seq = Store.readJson('roots_admin_access_seq', 500) + 1;
        Store.writeJson('roots_admin_access_seq', seq);
        Store.push('roots_admin_access_requests', {
          requestId: 'REQ-' + String(seq).padStart(5, '0'),
          institutionId: access.institutionId,
          institutionName: access.institutionName,
          requestedBy: ctx.session.adminName,
          purpose: purpose,
          datasets: [item],
          geography: '',
          personLevel: item === 'PERSON_LEVEL',
          exportFormat: item.indexOf('EAD') === 0 ? item : 'CSV',
          durationDays: days,
          submittedAt: new Date().toISOString(),
          status: 'PENDING',
          fields: []
        }, 500);
        Store.logOrgAudit('REQUEST_ACCESS', 'AccessRequest', item, {});
        Store.notify('access', 'Access request for ' + item + ' submitted.');
        if (window.RootsInstShell) window.RootsInstShell.updateBell();
        ctx.toast('📨 Request submitted to the Roots Administrator.');
        drawHistory();
      });

      drawHistory();
    }
  });
})();
