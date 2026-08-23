/* ============================================================
   INSTITUTIONAL EXPORTS (Setup 4 §25, §42).
   Configure -> preview -> run. Formats limited by approved
   modules; anonymisation enforced where the grant requires it;
   every export is mirrored into the Roots Administrator
   export log (roots_admin_export_log).
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  var Store = window.RootsInstStore;

  var FIELD_DEFS = [
    { key: 'ageBand', label: 'Age band', anon: true },
    { key: 'gender', label: 'Gender', anon: true },
    { key: 'language', label: 'Language', anon: true },
    { key: 'totem', label: 'Totem / praise name', anon: false },
    { key: 'province', label: 'Province', anon: true },
    { key: 'district', label: 'District', anon: true },
    { key: 'ward', label: 'Ward', anon: true },
    { key: 'status', label: 'Living status', anon: true }
  ];

  function ageBand(p) {
    var m = String(p.dateOfBirth || p.born || '').match(/\d{4}/);
    if (!m) return '';
    var a = new Date().getFullYear() - parseInt(m[0], 10);
    if (a <= 12) return '0-12'; if (a <= 17) return '13-17';
    if (a <= 35) return '18-35'; if (a <= 59) return '36-59';
    return '60+';
  }

  window.RootsInstViews.push({
    id: 'exports',
    label: 'Exports',
    icon: '📤',
    perm: 'inst.exports.request',
    render: function (host, ctx) {
      var access = ctx.access;
      var provinces = window.RootsInstConfig.PROVINCES_ZW;
      var formats = access.allowedExports.slice();
      ['EAD3', 'EAC-CPF', 'GEDCOM'].forEach(function (f) {
        if (formats.indexOf(f) === -1 && f !== 'GEDCOM') formats.push('🔒' + f);
      });

      host.innerHTML =
        '<div class="ws-page-head"><div><h2>Export Centre</h2>' +
        '<p class="sub">Configure → preview → run · every export is logged for the Roots Administrator</p></div></div>' +
        '<div class="ws-two-col"><div class="ws-panel"><h4>1 · Configuration</h4>' +
        '<label class="lbl">Dataset</label>' +
        '<select id="exDataset">' + (access.datasetAllowed('PEOPLE')
          ? '<option value="PEOPLE">People (' + access.datasets.join(', ') + ')</option>'
          : '') + '</select>' +
        '<label class="lbl">Geographic filter</label>' +
        '<select id="exGeo"><option value="">Whole approved scope</option>' +
        provinces.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('') + '</select>' +
        '<label class="lbl">Fields</label><div class="checks" id="exFields">' +
        FIELD_DEFS.map(function (f) {
          return '<label class="chk"><input type="checkbox" value="' + f.key + '"' +
            (access.anonymizationRequired && !f.anon ? ' disabled title="Removed under anonymisation"' : ' checked') +
            '> ' + esc(f.label) + '</label>';
        }).join('') + '</div>' +
        '<label class="chk big"><input type="checkbox" id="exAnon"' + (access.anonymizationRequired ? ' checked disabled' : '') + '> Anonymised dataset' +
        (access.anonymizationRequired ? ' <span class="chip warn">required by your approval</span>' : '') + '</label>' +
        '<label class="lbl">Format</label>' +
        '<select id="exFormat">' + formats.map(function (f) { return '<option>' + esc(f) + '</option>'; }).join('') + '</select>' +        '<div style="margin-top:10px;display:flex;gap:8px;">' +
        '<button class="ws-btn ghost" id="exPreview">PREVIEW</button>' +
        '<button class="ws-btn" id="exRun">EXPORT</button></div></div>' +

        '<div class="ws-panel"><h4>2 · Preview</h4><div id="exPreviewOut">' +
        '<div class="ws-empty">Run a preview to see scope and privacy impact.</div></div></div></div>' +
        '<div class="ws-panel" style="margin-top:14px;"><h4>3 · Recent exports</h4><div id="exRecent"></div></div>';

      if (!access.datasetAllowed('PEOPLE')) {
        document.getElementById('exDataset').innerHTML = '<option>No datasets approved</option>';
      }

      /* §66 default format from Organisation → Exports */
      var defFmt = (window.RootsInstStore.get('ORG_EXPORT_DEFAULTS')[0] || {}).format;
      if (defFmt) {
        var fmtSel = document.getElementById('exFormat');
        Array.prototype.forEach.call(fmtSel.options, function (o) {
          if (o.text === defFmt) fmtSel.value = o.value;
        });
      }

      function collect() {
        var fmtRaw = document.getElementById('exFormat').value;
        return {
          format: fmtRaw.replace('🔒', ''),
          locked: fmtRaw.indexOf('🔒') === 0,
          geo: document.getElementById('exGeo').value,
          fields: Array.prototype.slice.call(document.querySelectorAll('#exFields input:checked')).map(function (c) { return c.value; }),
          anon: document.getElementById('exAnon').checked,
          dataset: document.getElementById('exDataset').value || 'PEOPLE'
        };
      }

      function subsetOf(cfg) {
        return (window.PEOPLE || []).filter(access.inGeography).filter(function (p) {
          return !cfg.geo || ((p.admin || {}).province === cfg.geo);
        });
      }

      function rowsFor(p, fields, anon) {
        var k = p.kinship || {}, e = p.ethnicity || {}, a = p.admin || {};
        var map = {
          ageBand: ageBand(p),
          gender: p.gender === 'm' ? 'Male' : p.gender === 'f' ? 'Female' : String(p.gender || '').toUpperCase(),
          language: e.languageCluster || e.specificGroup || '',
          totem: anon ? '' : [k.mutupo, k.chidawo].filter(Boolean).join(' (') + (k.chidawo ? ')' : ''),
          province: a.province || '',
          district: a.district || '',
          ward: anon ? '' : (a.ward || ''),
          status: p.died ? 'Deceased' : 'Living'
        };
        return fields.map(function (f) { return map[f] == null ? '' : map[f]; });
      }

      function preview() {
        var c = collect();
        var out = document.getElementById('exPreviewOut');
        if (c.locked) {
          out.innerHTML = ctx.lockCard('plan', c.format + ' export');
          return;
        }
        var subset = subsetOf(c);
        out.innerHTML = '<div class="kv">' +
          '<div><span>Records in scope</span><b>' + subset.length + '</b></div>' +
          '<div><span>Fields selected</span><b>' + (c.fields.length || 0) + '</b></div>' +
          '<div><span>Anonymised</span><b>' + (c.anon ? 'YES — identifiers removed' : 'NO') + '</b></div>' +
          '<div><span>Person-level data</span><b>' + (access.personLevelAllowed ? 'Approved' : 'Not approved') + '</b></div>' +
          '<div><span>Geographic scope</span><b>' + esc(c.geo || access.scopeLabel) + '</b></div>' +
          '<div><span>Format</span><b>' + esc(c.format) + '</b></div></div>' +
          '<p class="hint">No restricted fields will be exported. The Roots Administrator receives a copy of this export entry.</p>';
      }

      function runExport() {
        var c = collect();
        if (c.locked) { preview(); return; }
        if (!access.datasetAllowed('PEOPLE')) { ctx.toast('No datasets approved for export.'); return; }
        var subset = subsetOf(c);
        var fields = c.fields;
        if (!fields.length) { ctx.toast('Select at least one field.'); return; }

        var headers = fields.map(function (f) {
          return (FIELD_DEFS.filter(function (d) { return d.key === f; })[0] || {}).label || f;
        });
        var stamp = new Date().toISOString().slice(0, 10);

        if (c.format === 'JSON') {
          var payload = subset.map(function (p) {
            var vals = rowsFor(p, fields, c.anon);
            var o = {};
            fields.forEach(function (f, i) { o[f] = vals[i]; });
            return o;
          });
          ctx.downloadBlob(JSON.stringify({ institution: access.institutionName, generatedAt: new Date().toISOString(), anonymized: c.anon, records: payload }, null, 2),
            'roots-export-' + stamp + '.json', 'application/json');
        } else if (c.format === 'EAD3') {
          var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ead xmlns="http://ead3.archivists.org/schema/">' +
            '<eadheader><eadid>roots-' + stamp + '</eadid><filedesc><titlestmt><titleproper>' +
            esc(access.institutionName) + ' people index</titleproper></titlestmt></filedesc></eadheader>' +
            '<archdesc level="collection"><did><unittitle>People records</unittitle></did>' +
            '<dsc>' + subset.map(function (p) {
              var vals = rowsFor(p, fields, c.anon);
              return '<c><did><unittitle><![CDATA[' + vals.join(' | ') + ']]></unittitle></did></c>';
            }).join('') + '</dsc></archdesc></ead>';
          ctx.downloadBlob(xml, 'roots-export-' + stamp + '.xml', 'application/xml');
        } else {
          ctx.csv('roots-export-' + stamp + '.csv', headers, subset.map(function (p) { return rowsFor(p, fields, c.anon); }));
        }

        /* Mirror to admin console log (§42). */
        var logs = Store.readJson('roots_admin_export_log', []);
        logs.unshift({
          exportId: 'EXP-' + Date.now().toString(36).toUpperCase(),
          institution: access.institutionName,
          user: ctx.session.adminName,
          dataset: 'People', format: c.format,
          records: subset.length, anonymized: c.anon,
          date: new Date().toISOString(), status: 'COMPLETED'
        });
        Store.writeJson('roots_admin_export_log', logs.slice(0, 500));

        Store.push('RECENT_EXPORTS', {
          format: c.format, dataset: 'People', records: subset.length,
          at: new Date().toISOString()
        });
        Store.logOrgAudit('EXPORT_DATASET', 'People', c.format, {});
        Store.notify('export', c.format + ' export of ' + subset.length + ' record(s) completed.');
        if (window.RootsInstShell) window.RootsInstShell.updateBell();
        drawRecent();
        ctx.toast('✅ Export downloaded — ' + subset.length + ' record(s), ' + (c.anon ? 'anonymised' : 'standard') + '.');
      }

      function drawRecent() {
        var list = Store.get('RECENT_EXPORTS');
        document.getElementById('exRecent').innerHTML = list.length
          ? list.map(function (r) {
            return '<div class="ws-row static">' + esc(r.format) + ' · ' + r.records + ' record(s)' +
              '<span class="when">' + esc(ctx.fmtDateTime(r.at)) + '</span></div>';
          }).join('')
          : '<div class="ws-empty">No exports yet.</div>';
      }

      document.getElementById('exPreview').addEventListener('click', preview);
      document.getElementById('exRun').addEventListener('click', runExport);
      drawRecent();
    }
  });
})();
