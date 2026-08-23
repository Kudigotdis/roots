/* ============================================================
   ROOTS SETTINGS — shared Tree Display Settings + Premium panel
   Included by index.html AND tree.html (injects its own markup).
   Persistence: roots_app_state via RootsStore (merge-safe).
   Owned by: Shell owner.
   ============================================================ */
(function () {
  'use strict';

  var page = document.body.getAttribute('data-page') || '';
  var $ = function (id) { return document.getElementById(id); };

  function toast(msg) { if (window.RootsShell) RootsShell.toast(msg); }

  /* ---------- STATE MIRROR ---------- */
  var saved = window.RootsStore.read();
  var settings = Object.assign(
    { thumbs: true, ribbon: true, hideCousins: false, maxGen: 5, quickAddParents: true, cardColorStyle: 'gender', cardOrientation: 'vertical' },
    saved.settings || {}
  );
  var unlocks = Object.assign(
    { bloodline: false, pdfExport: false, sdBackup: false, audioLibrary: false },
    saved.unlocks || {}
  );
  var ecocashCodes = saved.ecocashCodes || [];

  function persist() {
    window.RootsStore.patch({ settings: settings, unlocks: unlocks, ecocashCodes: ecocashCodes });
  }

  function isFeatureUnlocked(f) { return !!unlocks[f]; }

  function verifyEcoCashCode(code) {
    if (!code || code.trim().length < 8) return false;
    var normalized = code.trim().toUpperCase();
    if (ecocashCodes.indexOf(normalized) !== -1) return false;
    ecocashCodes.push(normalized);
    return true;
  }

  /* Refresh hook — tree.js registers __rootsTreeRefresh so toggles
     re-render the visible tree instantly on tree.html. */
  function afterSettingChange() {
    if (page === 'tree' && window.__rootsTreeRefresh) window.__rootsTreeRefresh();
  }

  /* ---------- MARKUP INJECTION ---------- */
  var PANEL_HTML =
    '<div class="panel-handle"></div>' +
    '<div class="settings-title">Tree Display Settings</div>' +
    '<div class="setting-row"><div><div class="setting-label">Thumbnail photos</div><div class="setting-sub">Show uploaded photos on tree cards</div></div><div class="toggle" id="toggleThumbs"></div></div>' +
    '<div class="setting-row"><div><div class="setting-label">Deceased ribbon</div><div class="setting-sub">Dark ribbon on deceased members</div></div><div class="toggle" id="toggleRibbon"></div></div>' +
    '<div class="setting-row"><div><div class="setting-label">Hide extended cousins</div><div class="setting-sub">Show direct line only</div></div><div class="toggle" id="toggleCousins"></div></div>' +
    '<div class="setting-row"><div><div class="setting-label">Quick-add parents</div><div class="setting-sub">Ghost cards for missing parents</div></div><div class="toggle" id="toggleQuickAdd"></div></div>' +
    '<div class="setting-row"><div><div class="setting-label">Card color style</div><div class="setting-sub">Gender color vs thin frame</div></div>' +
      '<select id="cardColorStyle" style="background:var(--bg);color:var(--text);border:1px solid var(--divider);border-radius:6px;padding:4px 8px;font-size:0.78rem;">' +
        '<option value="gender">Solid gender</option><option value="frame">Thin frame</option></select></div>' +
    '<div class="setting-row"><div><div class="setting-label">Card orientation</div><div class="setting-sub">Vertical vs horizontal</div></div>' +
      '<select id="cardOrientation" style="background:var(--bg);color:var(--text);border:1px solid var(--divider);border-radius:6px;padding:4px 8px;font-size:0.78rem;">' +
        '<option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></div>' +
    '<div class="gen-row"><div class="gen-label"><span>Max generations</span><strong id="genValue">5</strong></div>' +
      '<input type="range" min="1" max="7" value="5" id="genSlider"></div>' +
    '<div style="border-top:1px solid var(--divider);margin-top:14px;padding-top:10px;">' +
      '<div class="setting-label" style="margin-bottom:4px;">\uD83C\uDF1F Premium Features</div>' +
      '<div class="setting-sub" style="margin-bottom:8px;">Enter an EcoCash payment reference code to unlock features ($10/yr each). Codes are stored locally \u2014 no network call.</div>' +
      '<div id="premiumStatus"></div>' +
      '<div style="display:flex;gap:6px;">' +
        '<input id="ecocashInput" placeholder="EcoCash ref code (e.g. EC12345678)" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.78rem;">' +
        '<select id="ecocashFeature" style="padding:8px;border-radius:8px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.78rem;">' +
          '<option value="bloodline">Bloodline Switch</option><option value="pdfExport">PDF Export</option>' +
          '<option value="sdBackup">SD Backup</option><option value="audioLibrary">Audio Library</option></select>' +
        '<button class="btn-sm" id="ecocashVerifyBtn" style="background:var(--accent);color:var(--text);font-weight:700;">Verify</button></div>' +
      '<div id="premiumList" style="margin-top:8px;"></div></div>' +
    '<div style="display:flex;gap:6px;margin-top:10px;border-top:1px solid var(--divider);padding-top:10px;">' +
      '<button class="btn-sm" id="pdfExportBtn" style="flex:1;background:var(--accent);color:var(--text);font-weight:600;">\uD83D\uDDD6\uFE0F PDF Export</button>' +
      '<button class="btn-sm" id="backupExportBtn" style="flex:1;background:var(--accent);color:var(--text);font-weight:600;">\uD83D\uDCBE Backup</button>' +
      '<button class="btn-sm" id="backupImportBtn" style="flex:1;background:var(--bg-alt);color:var(--text);font-weight:600;">\uD83D\uDCC2 Restore</button></div>' +
    '<div style="border-top:1px solid var(--divider);margin-top:14px;padding-top:10px;">' +
      '<div class="setting-label" style="margin-bottom:4px;">\uD83D\uDCF2 Sync Import</div>' +
      '<div class="setting-sub" style="margin-bottom:8px;">Paste a ROOTS_SYNC payload received via WhatsApp</div>' +
      '<textarea id="syncPayload" placeholder="Paste ROOTS_SYNC:base64 payload here\u2026" style="width:100%;height:60px;padding:8px;border-radius:8px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.78rem;resize:none;box-sizing:border-box;"></textarea>' +
      '<button class="btn-sm" id="syncImportBtn" style="background:var(--lime);color:var(--text);font-weight:700;width:100%;margin-top:6px;">Import Sync Data</button></div>' +
    '<div style="border-top:1px solid var(--divider);margin-top:14px;padding-top:10px;">' +
      '<div class="setting-label" style="margin-bottom:6px;">\uD83D\uDC64 Account</div>' +
      '<div class="setting-sub" id="accountModeInfo" style="margin-bottom:8px;"></div>' +
      '<button class="btn-sm" id="switchAccountBtn" style="width:100%;">\u21C4 Switch Account</button></div>' +
    '<button class="btn-done" id="settingsDone">Done</button>';

  function ensureMarkup() {
    if (!$('settingsOverlay')) {
      var host = $('app') || document.body;
      var ov = document.createElement('div');
      ov.className = 'panel-overlay';
      ov.id = 'settingsOverlay';
      var panelEl = document.createElement('div');
      panelEl.className = 'settings-panel';
      panelEl.id = 'settingsPanel';
      panelEl.innerHTML = PANEL_HTML;
      ov.appendChild(panelEl);
      host.appendChild(ov);
    }
    if (!$('toast')) {
      var t = document.createElement('div');
      t.id = 'toast';
      ($('app') || document.body).appendChild(t);
    }
  }

  /* ---------- PREMIUM STATUS ---------- */
  function renderPremiumStatus() {
    var statusEl = $('premiumStatus');
    var listEl = $('premiumList');
    if (!statusEl) return;
    var unlocked = [], locked = [];
    var names = { bloodline: 'Bloodline Switch', pdfExport: 'PDF Export', sdBackup: 'SD Backup', audioLibrary: 'Audio Library' };
    Object.keys(unlocks).forEach(function (k) {
      if (unlocks[k]) unlocked.push(names[k] || k); else locked.push(names[k] || k);
    });
    statusEl.innerHTML = unlocked.length
      ? '<div style="font-size:0.72rem;color:var(--lime);margin-bottom:4px;">\u2705 Unlocked: ' + unlocked.join(', ') + '</div>'
      : '<div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:4px;">\uD83D\uDD12 No premium features unlocked yet</div>';
    if (listEl) {
      listEl.innerHTML = '<div style="font-size:0.68rem;color:var(--text-dim);">Used codes: ' + ecocashCodes.length + '</div>';
    }
  }

  /* ---------- OPEN / CLOSE ---------- */
  var overlayEl = null, panelElRef = null;

  function openSettings() {
    overlayEl.classList.add('show');
    panelElRef.classList.add('show');
    renderPremiumStatus();
  }
  function closeSettings() {
    overlayEl.classList.remove('show');
    panelElRef.classList.remove('show');
  }

  /* ---------- BACKUP (paid unlock) ---------- */
  function exportBackup() {
    if (!isFeatureUnlocked('sdBackup')) {
      toast('\uD83D\uDD12 SD Backup requires EcoCash verification ($10/yr).');
      return;
    }
    var data = JSON.stringify({ exportedAt: new Date().toISOString(), version: 'ROOTS_V1', persons: PEOPLE.map(function (p) {
      return { id:p.id, name:p.name, gender:p.gender, born:p.born, died:p.died, relation:p.relation, location:p.location, notes:p.notes, spouseId:p.spouseId, parentIds:p.parentIds, admin:p.admin, ethnicity:p.ethnicity, kinship:p.kinship, oral:p.oral, relations:p.relations, lifecycleState:p.lifecycleState, media:p.media, sync:p.sync };
    }), totemRegistry: totemRegistry, provinces: provinces, proverbs: proverbs }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'roots_backup_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    URL.revokeObjectURL(url);
    toast('\uD83D\uDCBE Full backup downloaded (' + PEOPLE.length + ' records)');
  }

  function importBackup() {
    if (!isFeatureUnlocked('sdBackup')) {
      toast('\uD83D\uDD12 SD Backup restore requires EcoCash verification.');
      return;
    }
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (data.persons && Array.isArray(data.persons)) {
            var added = 0;
            data.persons.forEach(function (imp) {
              if (!byId[imp.id]) {
                PEOPLE.push(imp);
                byId[imp.id] = imp;
                imp._upgraded = true;
                added++;
              }
            });
            toast('\u2705 Restored ' + added + ' new profiles (' + data.persons.length + ' in backup)');
            afterSettingChange();
          } else {
            toast('\u274C Invalid backup format');
          }
        } catch (err) { toast('\u274C Error reading backup: ' + err.message); }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  /* ---------- SYNC IMPORT ---------- */
  function importSyncPayload(raw) {
    if (!raw) { toast('Paste a ROOTS_SYNC payload first'); return; }
    var b64 = raw.replace(/^ROOTS_SYNC:/, '').trim();
    try {
      var decoded = atob(decodeURIComponent(b64));
      var parts = decoded.split('|');
      if (parts[0] !== 'ROOTS_V1') { toast('Invalid payload format'); return; }
      var incoming = {
        province: parts[1] || '', district: parts[2] || '',
        villageBookId: parts[3] || '', mutupo: parts[4] || '',
        chidawo: parts[5] || '', nationalId: parts[6] || ''
      };
      var match = PEOPLE.filter(function (p) {
        var k = p.kinship || {};
        var a = p.admin || {};
        return k.mutupo && k.mutupo === incoming.mutupo && a.villageBookId === incoming.villageBookId;
      });
      if (match.length) {
        var p = match[0];
        var incomingVersion = (p.sync ? p.sync.versionSequence : 0) + 1;
        if (!p.sync) p.sync = { versionSequence: 0, lastMutatedByDevice: 'local', utcTimestampApprox: '' };
        if (incomingVersion > p.sync.versionSequence) {
          p.sync.versionSequence = incomingVersion;
          p.sync.lastMutatedByDevice = 'remote';
          p.sync.utcTimestampApprox = new Date().toISOString();
          toast('\u2705 Synced: ' + p.name + ' (v' + p.sync.versionSequence + ')');
        } else if (incomingVersion === p.sync.versionSequence) {
          p.sync._disputed = true;
          toast('\u26A0\uFE0F Conflict flagged: ' + p.name + ' \u2014 marked DISPUTED');
        } else {
          toast('\u23ED\uFE0F Skipped ' + p.name + ' (local version is newer)');
        }
      } else {
        var newId = 'sync_' + Date.now();
        var names = incoming.mutupo ? incoming.mutupo + ' (from sync)' : 'Unknown (sync import)';
        window.createPerson({
          id: newId, fullName: names, gender: 'u', relation: 'Sync import',
          isAlive: true,
          admin: { province: incoming.province, district: incoming.district, villageBookId: incoming.villageBookId },
          kinship: { mutupo: incoming.mutupo, chidawo: incoming.chidawo },
          sync: { versionSequence: 1, lastMutatedByDevice: 'remote', utcTimestampApprox: new Date().toISOString() }
        });
        toast('\uD83D\uDCE5 New profile created from sync: ' + names);
      }
      afterSettingChange();
    } catch (e) {
      toast('\u274C Invalid sync payload: ' + e.message);
    }
  }

  /* ---------- INIT / BINDINGS ---------- */
  function init() {
    ensureMarkup();
    overlayEl = $('settingsOverlay');
    panelElRef = $('settingsPanel');

    /* reflect persisted values into controls */
    $('toggleThumbs').classList.toggle('on', settings.thumbs);
    $('toggleRibbon').classList.toggle('on', settings.ribbon);
    $('toggleCousins').classList.toggle('on', settings.hideCousins);
    $('toggleQuickAdd').classList.toggle('on', settings.quickAddParents);
    $('cardColorStyle').value = settings.cardColorStyle;
    $('cardOrientation').value = settings.cardOrientation;
    $('genSlider').value = settings.maxGen;
    $('genValue').textContent = settings.maxGen;

    $('settingsBtn') && $('settingsBtn').addEventListener('click', openSettings);
    $('settingsDone').addEventListener('click', closeSettings);
    $('switchAccountBtn') && $('switchAccountBtn').addEventListener('click', function () {
      try {
        ['roots_session', 'roots_user', 'roots_auth', 'roots_role'].forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
      location.href = 'index.html';
    });
    var modeInfo = $('accountModeInfo');
    if (modeInfo) {
      try {
        var sess = JSON.parse(localStorage.getItem('roots_session') || 'null');
        modeInfo.textContent = sess && sess.mode === 'family'
          ? 'Signed in as Kudzanai Chitate — full family tree'
          : 'Personal profile — build your own tree';
      } catch (e) { modeInfo.textContent = ''; }
    }
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) closeSettings();
    });

    ['toggleThumbs', 'toggleRibbon', 'toggleCousins', 'toggleQuickAdd'].forEach(function (id) {
      var el = $(id);
      el.addEventListener('click', function () {
        el.classList.toggle('on');
        var key = id.replace('toggle', '').toLowerCase();
        if (key === 'thumbs') settings.thumbs = el.classList.contains('on');
        if (key === 'ribbon') settings.ribbon = el.classList.contains('on');
        if (key === 'cousins') settings.hideCousins = el.classList.contains('on');
        if (key === 'quickadd') settings.quickAddParents = el.classList.contains('on');
        persist();
        afterSettingChange();
      });
    });

    $('cardColorStyle').addEventListener('change', function () {
      settings.cardColorStyle = this.value;
      persist();
      afterSettingChange();
    });
    $('cardOrientation').addEventListener('change', function () {
      settings.cardOrientation = this.value;
      persist();
      afterSettingChange();
    });
    $('genSlider').addEventListener('input', function () {
      $('genValue').textContent = this.value;
      settings.maxGen = parseInt(this.value, 10);
      persist();
      afterSettingChange();
    });

    $('ecocashVerifyBtn').addEventListener('click', function () {
      var code = $('ecocashInput') ? $('ecocashInput').value.trim() : '';
      var feature = $('ecocashFeature') ? $('ecocashFeature').value : 'bloodline';
      if (!verifyEcoCashCode(code)) {
        toast('\u274C Invalid or duplicate code (must be 8+ chars)');
        return;
      }
      unlocks[feature] = true;
      persist();
      $('ecocashInput').value = '';
      renderPremiumStatus();
      toast('\u2705 ' + feature + ' unlocked!');
    });

    var pdfBtn = $('pdfExportBtn');
    if (page === 'tree') {
      pdfBtn.addEventListener('click', function () {
        if (window.__rootsPdfExport) window.__rootsPdfExport();
      });
    } else {
      pdfBtn.style.display = 'none'; // PDF prints the tree — tree page only
    }

    $('backupExportBtn').addEventListener('click', exportBackup);
    $('backupImportBtn').addEventListener('click', function () {
      if (!confirm('Import backup? New records will be added. Existing records with the same ID will be skipped.')) return;
      importBackup();
    });
    $('syncImportBtn').addEventListener('click', function () {
      importSyncPayload(($('syncPayload') || {}).value ? $('syncPayload').value.trim() : '');
    });
  }

  init();

  /* ---------- PUBLIC API ---------- */
  window.RootsSettings = { open: openSettings, close: closeSettings };
})();
