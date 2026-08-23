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
            html += '<div class="ws-panel">' + queries.map(function (q) {
              return '<div class="ws-row static"><b>' + esc(q.name) + '</b><br><small><code>' + esc(q.summary || '') + '</code></small>' +
                '<span class="when">' + esc(ctx.fmtDate(q.at)) + '</span></div>';
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
