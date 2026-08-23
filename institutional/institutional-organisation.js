/* ============================================================
   INSTITUTIONAL ORGANISATION (Setup 4 §34-45).
   Org profile, staff roster (invite / change role / suspend /
   reactivate / remove), role matrix, subscription panel
   (no financial data), own-org audit trail. Distinct from the
   Roots Administrator console — institutions never manage the
   platform, only their own workspace.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  var Store = window.RootsInstStore;
  var WSC = window.RootsInstWorkspaceConfig;

  window.RootsInstViews.push({
    id: 'organisation',
    label: 'Organisation',
    icon: '⚙️',
    perm: 'inst.organisation.manage',
    render: function (host, ctx) {
      var access = ctx.access;

      function roster() {
        var accounts = Store.readJson('roots_institutional_accounts', []).filter(function (a) {
          return a.applicationId === ctx.session.applicationId && a.status !== 'REMOVED';
        });
        var local = Store.get('ORG_USERS');
        var rows = [];
        rows.push({
          name: ctx.session.adminName || 'Primary administrator',
          role: ctx.session.role || 'ADMINISTRATOR',
          status: 'ACTIVE', primary: true
        });
        accounts.forEach(function (a) {
          rows.push({ name: a.adminName || a.name || 'Staff user', role: a.role || 'Researcher', status: a.status || 'ACTIVE' });
        });
        local.forEach(function (u) { rows.push(u); });
        return rows;
      }

      function draw(tab) {
        tab = tab || 'profile';
        var html = '<div class="ws-page-head"><div><h2>Organisation</h2>' +
          '<p class="sub">' + esc(access.institutionName) + ' · workspace administration</p></div></div>' +
          '<div class="ws-tabs" id="orTabs">' +
          [['profile', 'Profile'], ['users', 'Users'], ['roles', 'Roles'], ['notifications', 'Notifications'], ['exports', 'Exports'], ['privacy', 'Privacy'], ['subscription', 'Subscription'], ['audit', 'Audit']].map(function (t) {
            return '<button data-t="' + t[0] + '" class="' + (t[0] === tab ? 'active' : '') + '">' + t[1] + '</button>';
          }).join('') + '</div><div id="orBody"></div>';
        host.innerHTML = html;
        host.querySelectorAll('#orTabs button').forEach(function (b) {
          b.addEventListener('click', function () { draw(b.dataset.t); });
        });

        var body = document.getElementById('orBody');

        if (tab === 'profile') {
          var app = access.application || {};
          var profile = Store.get('ORG_PROFILE', {})[0] || {};
          body.innerHTML = '<div class="ws-panel"><h4>Institution profile</h4><div class="kv">' +
            '<div><span>Institution ID</span><b>' + esc(access.institutionId) + '</b></div>' +
            '<div><span>Type</span><b>' + esc(ctx.typeInfo ? ctx.typeInfo.title : access.institutionType) + '</b></div>' +
            '<div><span>Status</span><b>' + esc(app.status || 'ACTIVE') + '</b></div>' +
            '<div><span>Contact</span><b>' + esc(app.contactEmail || app.email || '—') + '</b></div>' +
            '<div><span>City</span><b>' + esc(profile.city || app.cityOrTown || '—') + '</b></div>' +
            '<div><span>Description</span><b>' + esc(profile.description || app.description || '—') + '</b></div></div>' +
            '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
            '<input id="ofCity" placeholder="Update city" style="max-width:200px;">' +
            '<input id="ofDesc" placeholder="Update description" style="flex:2;min-width:220px;">' +
            '<button class="ws-btn" id="ofSave">SAVE PROFILE</button></div></div>';
          document.getElementById('ofSave').addEventListener('click', function () {
            Store.set('ORG_PROFILE', [{
              city: document.getElementById('ofCity').value.trim(),
              description: document.getElementById('ofDesc').value.trim(),
              at: new Date().toISOString()
            }]);
            Store.logOrgAudit('UPDATE_ORG_PROFILE', 'Organisation', access.institutionId, {});
            ctx.toast('Profile saved.');
            draw('profile');
          });
        }

        if (tab === 'users') {
          var rows = roster();
          body.innerHTML = '<div class="ws-panel"><h4>Workspace users (' + rows.length + ')</h4>' +
            rows.map(function (u, i) {
              return '<div class="ws-row static"><b>' + esc(u.name) + '</b>' + (u.primary ? ' <span class="chip ok">PRIMARY</span>' : '') +
                ' <i>' + esc(u.role) + '</i>' +
                '<span class="chip ' + (u.status === 'ACTIVE' ? 'ok' : u.status === 'SUSPENDED' ? 'bad' : '') + '">' + esc(u.status) + '</span>' +
                (u.primary ? '' :
                  '<span class="row-actions">' +
                  '<button class="ws-btn ghost sm" data-susp="' + i + '">' + (u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend') + '</button>' +
                  '<button class="ws-btn ghost sm" data-rm="' + i + '">Remove</button></span>') +
                '</div>';
            }).join('') +
            '<h4 style="margin-top:14px;">Invite staff member</h4><div class="ws-filters">' +
            '<input id="ouName" placeholder="Full name" style="max-width:200px;">' +
            '<select id="ouRole" style="max-width:180px;"><option>Administrator</option><option>Researcher</option><option>Archivist</option><option>Data Officer</option><option>Viewer</option></select>' +
            '<button class="ws-btn" id="ouGo">INVITE (WhatsApp link)</button></div>' +
            '<p class="hint">Invited members appear once they accept. Institutions manage their own staff here — the Roots Administrator only intervenes for platform-level suspension.</p></div>';

          body.querySelectorAll('[data-susp]').forEach(function (b) {
            b.addEventListener('click', function () {
              var u = roster()[parseInt(b.dataset.susp, 10)];
              var local = Store.get('ORG_USERS');
              var hit = null;
              local.forEach(function (x) { if (x.name === u.name) hit = x; });
              if (!hit) { hit = { name: u.name, role: u.role, status: u.status }; local.unshift(hit); }
              hit.status = hit.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
              hit.at = new Date().toISOString();
              Store.set('ORG_USERS', local);
              Store.logOrgAudit(hit.status === 'SUSPENDED' ? 'SUSPEND_STAFF' : 'REACTIVATE_STAFF', 'OrgUser', u.name, {});
              draw('users');
            });
          });
          body.querySelectorAll('[data-rm]').forEach(function (b) {
            b.addEventListener('click', function () {
              var u = roster()[parseInt(b.dataset.rm, 10)];
              if (!confirm('Remove ' + u.name + ' from the workspace?')) return;
              Store.set('ORG_USERS', Store.get('ORG_USERS').filter(function (x) { return x.name !== u.name; }));
              var accs = Store.readJson('roots_institutional_accounts', []);
              accs.forEach(function (a) { if (a.applicationId === ctx.session.applicationId && (a.adminName || a.name) === u.name) a.status = 'REMOVED'; });
              Store.writeJson('roots_institutional_accounts', accs);
              Store.logOrgAudit('REMOVE_STAFF', 'OrgUser', u.name, {});
              draw('users');
            });
          });
          document.getElementById('ouGo').addEventListener('click', function () {
            var name = document.getElementById('ouName').value.trim();
            if (!name) { ctx.toast('Enter the person\'s name.'); return; }
            var role = document.getElementById('ouRole').value;
            Store.push('ORG_USERS', { name: name, role: role, status: 'INVITED', at: new Date().toISOString() });
            Store.logOrgAudit('INVITE_STAFF', 'OrgUser', name, {});
            try {
              var msg = encodeURIComponent('You are invited to join ' + access.institutionName + ' on Roots as ' + role + '. Open the institutional sign-up to accept.');
              window.open('https://wa.me/?text=' + msg, '_blank');
            } catch (e) {}
            ctx.toast('Invitation prepared.');
            draw('users');
          });
        }

        if (tab === 'roles') {
          body.innerHTML = '<div class="ws-panel"><h4>Role matrix</h4>' +
            table() + '<p class="hint">Roles are assigned per staff member in Users. The institution Administrator manages this list; Roots Administrators cannot see your internal roles beyond platform moderation.</p></div>';
          function table() {
            var perms = WSC.PERMISSIONS;
            var head = '<tr><th>PERMISSION</th>' + ['ADMINISTRATOR', 'Researcher', 'Archivist', 'Data Officer', 'Viewer'].map(function (r) {
              return '<th>' + r.toUpperCase() + '</th>';
            }).join('') + '</tr>';
            var rows = perms.map(function (pm) {
              return '<tr><td><code>' + esc(pm) + '</code></td>' + Object.keys(WSC.ROLE_PERMISSIONS).map(function (r) {
                return '<td>' + (WSC.ROLE_PERMISSIONS[r].indexOf(pm) !== -1 ? '✓' : '—') + '</td>';
              }).join('') + '</tr>';
            }).join('');
            return '<div class="ws-table-wrap"><table class="ws-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
          }
        }

        if (tab === 'notifications') { /* §66 */
          var st = Store.get('ORG_NOTIF_SETTINGS')[0] || {};
          var cats = [
            ['disputes', 'Record review alerts', '⚖️', 'A flagged record needs institutional review.'],
            ['access', 'Dataset access & expiry', '⏳', 'Approaching expiry or revocation of approvals.'],
            ['corrections', 'Correction status', '📝', 'Submitted corrections moving through review.'],
            ['notices', 'Roots Administrator notices', '🔔', 'Grant decisions, suspensions, platform messages.']
          ];
          body.innerHTML = '<div class="ws-panel"><h4>Notification preferences</h4>' +
            cats.map(function (c) {
              var on = st[c[0]] !== false;
              return '<div class="ws-row static"><b>' + c[2] + '</b><span style="flex:1;padding-right:8px;">' + esc(c[1]) +
                '<br><i class="hint">' + esc(c[3]) + '</i></span>' +
                '<button class="ws-btn ghost sm" data-cat="' + c[0] + '">' + (on ? 'ON ✓' : 'MUTED') + '</button></div>';
            }).join('') +
            '<p class="hint">Per-workspace setting (all staff share one bell). Muted categories are hidden from the bell but still appear in Audit.</p></div>';
          body.querySelectorAll('[data-cat]').forEach(function (b) {
            b.addEventListener('click', function () {
              var cur = Store.get('ORG_NOTIF_SETTINGS')[0] || {};
              cur[b.dataset.cat] = cur[b.dataset.cat] === false;
              cur.at = new Date().toISOString();
              Store.set('ORG_NOTIF_SETTINGS', [cur]);
              Store.logOrgAudit('UPDATE_NOTIFICATION_SETTINGS', 'OrgSettings', b.dataset.cat + '=' + (cur[b.dataset.cat] ? 'ON' : 'MUTED'), {});
              draw('notifications');
              if (window.RootsInstShell) window.RootsInstShell.updateBell();
            });
          });
        }

        if (tab === 'exports') { /* §66 */
          var defCfg = Store.get('ORG_EXPORT_DEFAULTS')[0] || {};
          var recents = Store.get('RECENT_EXPORTS');
          body.innerHTML = '<div class="ws-panel"><h4>Export defaults</h4>' +
            '<div class="ws-filters"><div><label class="lbl">Default format</label>' +
            '<select id="oeFormat">' + access.allowedExports.map(function (f) {
              return '<option' + (f === defCfg.format ? ' selected' : '') + '>' + esc(f) + '</option>';
            }).join('') + '</select></div>' +
            '<button class="ws-btn" id="oeSave">SAVE DEFAULT</button></div>' +
            '<div class="kv" style="margin-top:12px;">' +
            '<div><span>Approved formats</span><b>' + esc(access.allowedExports.join(', ')) + '</b></div>' +
            '<div><span>Anonymisation posture</span><b>' + (access.anonymizationRequired ? 'REQUIRED by your approval' : 'Optional') + '</b></div>' +
            '<div><span>Exports run so far</span><b>' + recents.length + '</b></div></div>' +
            '<div style="margin-top:10px;"><button class="ws-btn ghost sm" id="oeGo">OPEN EXPORT CENTRE →</button></div>' +
            '<p class="hint">The Export Centre pre-selects this format. Every export stays logged for the Roots Administrator (§42).</p></div>';
          document.getElementById('oeSave').addEventListener('click', function () {
            var f = document.getElementById('oeFormat').value;
            Store.set('ORG_EXPORT_DEFAULTS', [{ format: f, at: new Date().toISOString() }]);
            Store.logOrgAudit('UPDATE_EXPORT_DEFAULTS', 'OrgSettings', f, {});
            ctx.toast('Default export format: ' + f);
          });
          document.getElementById('oeGo').addEventListener('click', function () { ctx.go('exports'); });
        }

        if (tab === 'privacy') { /* §66 — read-only posture mirror */
          var corrAll = Store.get('CORRECTIONS');
          var corrOpen = corrAll.filter(function (c) { return c.status === 'SUBMITTED'; }).length;
          body.innerHTML = '<div class="ws-panel"><h4>Data privacy posture</h4><div class="kv">' +
            '<div><span>Person-level data</span><b>' + (access.personLevelAllowed ? 'APPROVED' : 'NOT APPROVED — aggregate only') + '</b></div>' +
            '<div><span>Anonymisation</span><b>' + (access.anonymizationRequired ? 'REQUIRED on all exports' : 'Optional') + '</b></div>' +
            '<div><span>Geographic scope</span><b>' + esc(access.scopeLabel) + '</b></div>' +
            '<div><span>Approved datasets</span><b>' + esc((access.datasets || []).join(', ') || '—') + '</b></div>' +
            '<div><span>National ID visibility</span><b>' + (access.personLevelAllowed ? 'Masked (last 4 digits)' : 'RESTRICTED') + '</b></div>' +
            '<div><span>Corrections on file</span><b>' + corrAll.length + ' (' + corrOpen + ' awaiting Roots review)</b></div></div>' +
            '<p class="hint">Set by your Roots Administrator approval — not editable here. Widen scope or request person-level data via Access Requests (§41).</p></div>';
        }

        if (tab === 'subscription') {
          var sub = Store.readJson('roots_admin_subscriptions', []).filter(function (s) {
            return s.institutionId === access.institutionId;
          })[0] || null;
          var rosterN = Store.get('ORG_USERS').length || 1;
          var used = sub ? (sub.usersUsed || rosterN) : rosterN;
          var limit = sub ? sub.userLimit : null;
          var overLimit = limit != null && used >= limit;
          body.innerHTML = '<div class="ws-panel"><h4>Subscription & plan</h4><div class="kv">' +
            '<div><span>Plan</span><b>' + esc(access.planName) + '</b></div>' +
            '<div><span>Status</span><b>' + esc(access.subscriptionStatus) + '</b></div>' +
            '<div><span>Included modules</span><b>' + esc(access.modules.join(', ') || 'CORE') + '</b></div>' +
            '<div><span>Users</span><b>' + used + (limit != null ? ' / ' + limit : '') +
            (limit != null ? ' <span class="chip ' + (overLimit ? 'bad' : 'ok') + '">' + (overLimit ? 'AT LIMIT' : 'OK') + '</span>' : '') +
            '</b></div>' +
            '<div><span>Renewal date</span><b>' + esc(sub && sub.renewal ? sub.renewal : (access.grantExpiry ? String(access.grantExpiry).slice(0, 10) : '—')) +
            (sub ? ' <span class="chip">' + esc(sub.interval || '') + '</span>' : '') + '</b></div>' +
            '<div><span>Billing</span><b>Handled by the Roots Administrator — no card details are stored in-app</b></div></div>' +
            '<div style="margin-top:12px;"><button class="ws-btn" id="subManage">MANAGE SUBSCRIPTION</button></div>' +
            '<p class="hint">Upgrades and renewals are arranged with the Roots Administrator via WhatsApp. This panel is read-only by design.</p></div>';
          document.getElementById('subManage').addEventListener('click', function () {
            ctx.toast('Contact the Roots Administrator on WhatsApp to manage your plan.');
          });
        }

        if (tab === 'audit') {
          var log = Store.get('ORG_AUDIT');
          body.innerHTML = '<div class="ws-panel"><h4>Own-organisation audit trail (' + log.length + ')</h4>' +
            (log.length ? log.slice(0, 40).map(function (e2) {
              return '<div class="ws-row static"><code>' + esc(e2.id) + '</code> · ' + esc(e2.action) + ' · ' + esc(e2.dataset || e2.targetId || '') + ' · ' + esc(e2.user) +
                '<span class="when">' + esc(ctx.fmtDateTime(e2.at)) + '</span></div>';
            }).join('')
              : '<div class="ws-empty">No organisation activity recorded yet.</div>') +
            (log.length ? '<button class="ws-btn ghost sm" id="auCsv" style="margin-top:8px;">⬇ CSV</button>' : '') + '</div>';
          var cbtn = document.getElementById('auCsv');
          if (cbtn) cbtn.addEventListener('click', function () {
            ctx.csv('org-audit.csv', ['ID', 'AT', 'USER', 'ACTION', 'DATASET', 'TARGET', 'RESULT'],
              log.map(function (e2) { return [e2.id, e2.at, e2.user, e2.action, e2.dataset, e2.targetId, e2.result]; }));
          });
        }
      }

      draw('profile');
    }
  });
})();
