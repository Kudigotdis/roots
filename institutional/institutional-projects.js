/* ============================================================
   INSTITUTIONAL PROJECTS & SAVED QUERIES (Setup 4 §22, §23).
   Research projects with progress tracking; reusable saved
   searches. Stored per-institution in roots_inst_* stores.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  var Store = window.RootsInstStore;

  /* ---------------- research projects ---------------- */
  window.RootsInstViews.push({
    id: 'projects',
    label: 'Projects',
    icon: '📁',
    perm: 'inst.projects.manage',
    render: function (host, ctx) {
      function draw() {
        var list = Store.get('PROJECTS');
        var html = '<div class="ws-page-head"><div><h2>Research Projects</h2>' +
          '<p class="sub">Organise lineage work into trackable cases</p></div>' +
          '<button class="ws-btn" id="prNew">+ NEW PROJECT</button></div>';

        if (!list.length) {
          html += '<div class="ws-empty">No projects yet. Create your first project to group records and track progress.</div>';
        } else {
          html += '<div class="ws-grid">' + list.map(function (p) {
            var pct = p.total ? Math.round((p.done / p.total) * 100) : (p.status === 'COMPLETE' ? 100 : 0);
            return '<div class="ws-card left"><b>' + esc(p.title) + '</b>' +
              '<small>' + esc(p.description || '') + '</small>' +
              '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
              '<span class="chip ' + (p.status === 'ACTIVE' ? 'ok' : 'warn') + '">' + esc(p.status) + '</span>' +
              '<small>Updated ' + esc(ctx.fmtDate(p.at)) + '</small>' +
              '<div class="row-actions"><button class="ws-btn ghost sm" data-open="' + esc(p.id) + '">OPEN</button>' +
              '<button class="ws-btn ghost sm" data-del="' + esc(p.id) + '">DELETE</button></div></div>';
          }).join('') + '</div>';
        }
        host.innerHTML = html;

        document.getElementById('prNew').addEventListener('click', function () {
          var title = prompt('Project title:');
          if (!title) return;
          var description = prompt('Short description (optional):') || '';
          Store.push('PROJECTS', {
            id: 'PRJ-' + Date.now().toString(36).toUpperCase(),
            title: title.trim(), description: description,
            status: 'ACTIVE', total: 0, done: 0,
            createdBy: ctx.session.adminName, at: new Date().toISOString()
          });
          Store.logOrgAudit('CREATE_PROJECT', 'Project', title.trim(), {});
          if (window.RootsInstShell) window.RootsInstShell.updateBell();
          draw();
        });

        host.querySelectorAll('[data-open]').forEach(function (b) {
          b.addEventListener('click', function () {
            ctx.go('records');
            setTimeout(function () { ctx.toast('Use Record Search to add findings to "' + b.closest('.ws-card').querySelector('b').textContent + '".'); }, 250);
          });
        });
        host.querySelectorAll('[data-del]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (!confirm('Delete this project?')) return;
            Store.set('PROJECTS', Store.get('PROJECTS').filter(function (p) { return p.id !== b.dataset.del; }));
            Store.logOrgAudit('DELETE_PROJECT', 'Project', b.dataset.del, {});
            draw();
          });
        });
      }
      draw();
    }
  });

  /* ---------------- saved queries ---------------- */
  window.RootsInstViews.push({
    id: 'saved',
    label: 'Saved',
    icon: '🔎',
    perm: 'inst.saved.queries',
    render: function (host, ctx) {
      /* gap G2: Run / Edit / Duplicate / Export / Delete on saved queries */
      var FIELDS = ['Totem', 'Province', 'Language', 'Status', 'Village book'];
      var peopleAllowed = access_ok();
      function access_ok() {
        return !!(ctx.access && typeof ctx.access.datasetAllowed === 'function' && ctx.access.datasetAllowed('PEOPLE'));
      }
      function fieldHay(p, field) {
        var k = p.kinship || {}, a = p.admin || {}, e = p.ethnicity || {};
        if (field === 'Totem') return String(k.mutupo || '');
        if (field === 'Province') return String(a.province || '');
        if (field === 'Language') return String(e.languageCluster || '');
        if (field === 'Status') return String(p.lifecycleState || 'ALIVE');
        if (field === 'Village book') return String(a.villageBookId || '');
        return '';
      }
      function queryMatches(q) {
        if (!peopleAllowed) return [];
        var base = (window.PEOPLE || []).filter(ctx.access.inGeography);
        return base.filter(function (p) {
          return (q.filters || []).every(function (f) {
            var v = String(f.value || '').trim().toLowerCase();
            return !v || fieldHay(p, f.field).toLowerCase().indexOf(v) !== -1;
          });
        });
      }
      function byId(id) {
        return Store.get('SAVED').filter(function (x) { return x.id === id; })[0];
      }
      function draw() {
        var list = Store.get('SAVED');
        var reports = list.filter(function (q) { return q.kind === 'report'; });
        var queries = list.filter(function (q) { return q.kind !== 'report'; });
        var html = '<div class="ws-page-head"><div><h2>Saved Queries &amp; Reports</h2>' +
          '<p class="sub">Reusable searches and report definitions across approved datasets</p></div></div>';
        if (!list.length) {
          html += '<div class="ws-empty">Nothing saved yet. Save a search in Records or a report in Reports.</div>';
        } else {
          if (reports.length) {
            html += '<div class="ws-panel"><h4>📊 Saved reports</h4>' + reports.map(function (r) {
              return '<div class="ws-row static"><b>' + esc(r.name) + '</b><br><small><code>' + esc(r.summary || '') + '</code></small>' +
                '<span class="row-actions"><span class="chip">REPORT</span>' +
                '<button class="ws-btn ghost sm" data-openrpt="' + esc(r.id) + '">OPEN IN REPORTS</button></span></div>';
            }).join('') + '</div>';
          }
          if (queries.length) {
            html += '<div class="ws-panel"><h4>Saved queries</h4>' + queries.map(function (q) {
              return '<div class="ws-row static" id="qrow-' + esc(q.id) + '"><b>' + esc(q.name) + '</b><br><small><code>' + esc(q.summary || '') + '</code></small>' +
                '<span class="when">' + esc(ctx.fmtDate(q.at)) + '</span>' +
                '<span class="row-actions">' +
                '<button class="ws-btn ghost sm" data-qrun="' + esc(q.id) + '">RUN</button>' +
                '<button class="ws-btn ghost sm" data-qedit="' + esc(q.id) + '">EDIT</button>' +
                '<button class="ws-btn ghost sm" data-qdup="' + esc(q.id) + '">DUPLICATE</button>' +
                '<button class="ws-btn ghost sm" data-qexp="' + esc(q.id) + '">EXPORT CSV</button>' +
                '<button class="ws-btn ghost sm" data-qdel="' + esc(q.id) + '">DELETE</button>' +
                '</span><div id="qres-' + esc(q.id) + '"></div></div>';
            }).join('') + '</div>';
          }
        }
        html += '<div class="ws-panel"><h4>+ Save the current filters</h4>' +
          '<input id="sqName" placeholder="Query name" style="max-width:320px;"> ' +
          '<select id="sqField" style="max-width:180px;"><option>Totem</option><option>Province</option><option>Language</option><option>Status</option><option>Village book</option></select> ' +
          '<input id="sqValue" placeholder="Value" style="max-width:200px;"> ' +
          '<button class="ws-btn" id="sqGo">SAVE QUERY</button></div>';
        host.innerHTML = html;
        host.querySelectorAll('[data-openrpt]').forEach(function (b) {
          b.addEventListener('click', function () {
            window.RootsInstSavedReportToRun = b.dataset.openrpt;
            ctx.go('reports');
          });
        });
        host.querySelectorAll('[data-qrun]').forEach(function (b) {
          b.addEventListener('click', function () {
            var q = byId(b.dataset.qrun);
            if (!q) return;
            Store.logOrgAudit('RUN_QUERY', 'Query', q.name, {});
            var box = document.getElementById('qres-' + q.id);
            if (!box) return;
            if (box.dataset.open) { box.innerHTML = ''; delete box.dataset.open; return; }
            if (!peopleAllowed) { box.innerHTML = '<div class="hint">PEOPLE dataset not approved for your account.</div>'; return; }
            var m = queryMatches(q);
            box.dataset.open = '1';
            box.innerHTML = '<div class="hint">' + m.length + ' match(es)' + (m.length ? ':<br>' +
              m.slice(0, 8).map(function (p) {
                var a = p.admin || {};
                return esc(p.name + ' (' + p.id + ')' + (a.villageBookId ? ' - ' + a.villageBookId : ''));
              }).join('<br>') : '') + '</div>';
          });
        });
        host.querySelectorAll('[data-qexp]').forEach(function (b) {
          b.addEventListener('click', function () {
            var q = byId(b.dataset.qexp);
            if (!q) return;
            if (!peopleAllowed) { ctx.toast('PEOPLE dataset not approved for your account.'); return; }
            var m = queryMatches(q);
            ctx.csv('query-' + String(q.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv',
              ['id', 'name', 'gender', 'province', 'village_book', 'totem'],
              m.map(function (p) {
                return [p.id, p.name, p.gender || '', (p.admin || {}).province || '',
                  (p.admin || {}).villageBookId || '', (p.kinship || {}).mutupo || ''];
              }));
            Store.logOrgAudit('EXPORT_QUERY_CSV', 'Query', q.name, { count: m.length });
            ctx.toast(m.length + ' record(s) exported.');
          });
        });
        host.querySelectorAll('[data-qdup]').forEach(function (b) {
          b.addEventListener('click', function () {
            var all = Store.get('SAVED');
            var q = all.filter(function (x) { return x.id === b.dataset.qdup; })[0];
            if (!q) return;
            all.push({
              id: 'QRY-' + Date.now().toString(36).toUpperCase(),
              name: q.name + ' (copy)', summary: q.summary, filters: q.filters,
              createdBy: ctx.session.adminName, at: new Date().toISOString()
            });
            Store.set('SAVED', all);
            Store.logOrgAudit('DUPLICATE_QUERY', 'Query', q.name, {});
            ctx.toast('Query duplicated.');
            draw();
          });
        });
        host.querySelectorAll('[data-qdel]').forEach(function (b) {
          b.addEventListener('click', function () {
            var all = Store.get('SAVED');
            var q = all.filter(function (x) { return x.id === b.dataset.qdel; })[0];
            if (!q) return;
            if (!window.confirm('Delete saved query "' + q.name + '"?')) return;
            Store.set('SAVED', all.filter(function (x) { return x.id !== q.id; }));
            Store.logOrgAudit('DELETE_QUERY', 'Query', q.name, {});
            ctx.toast('Query deleted.');
            draw();
          });
        });
        host.querySelectorAll('[data-qedit]').forEach(function (b) {
          b.addEventListener('click', function () {
            var row = document.getElementById('qrow-' + b.dataset.qedit);
            var q = byId(b.dataset.qedit);
            if (!row || !q) return;
            var f0 = ((q.filters || [])[0] || {});
            row.innerHTML =
              '<input id="qeName" value="' + esc(q.name) + '" style="max-width:220px;"> ' +
              '<select id="qeField">' + FIELDS.map(function (f) {
                return '<option' + (f0.field === f ? ' selected' : '') + '>' + f + '</option>';
              }).join('') + '</select> ' +
              '<input id="qeValue" value="' + esc(f0.value || '') + '" placeholder="Value" style="max-width:160px;"> ' +
              '<button class="ws-btn sm" id="qeSave">SAVE</button> ' +
              '<button class="ws-btn ghost sm" id="qeCancel">CANCEL</button>';
            row.querySelector('#qeCancel').addEventListener('click', draw);
            row.querySelector('#qeSave').addEventListener('click', function () {
              var name = row.querySelector('#qeName').value.trim();
              if (!name) { ctx.toast('Name is required.'); return; }
              var f = row.querySelector('#qeField').value;
              var v = row.querySelector('#qeValue').value.trim();
              var all = Store.get('SAVED');
              all.forEach(function (x) {
                if (x.id !== q.id) return;
                x.name = name;
                x.summary = f + ' = ' + (v || '(any)');
                x.filters = [{ field: f, value: v }];
              });
              Store.set('SAVED', all);
              Store.logOrgAudit('EDIT_QUERY', 'Query', name, {});
              ctx.toast('Query updated.');
              draw();
            });
          });
        });
        document.getElementById('sqGo').addEventListener('click', function () {
          var name = document.getElementById('sqName').value.trim();
          if (!name) { ctx.toast('Name the query first.'); return; }
          var f = document.getElementById('sqField').value;
          var v = document.getElementById('sqValue').value.trim();
          Store.push('SAVED', {
            id: 'QRY-' + Date.now().toString(36).toUpperCase(),
            name: name, summary: f + ' = ' + (v || '(any)'),
            filters: [{ field: f, value: v }],
            createdBy: ctx.session.adminName, at: new Date().toISOString()
          });
          Store.logOrgAudit('SAVE_QUERY', 'Query', name, {});
          draw();
        });
      }
      draw();
    }
  });
})();
