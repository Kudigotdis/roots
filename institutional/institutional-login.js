/* ============================================================
   ROOTS INSTITUTIONAL LOGIN — B1 working local demo.
   Authenticates against institution accounts created by the
   onboarding wizard (stored locally, hashed password only).
   UI states: idle | validating | invalid | authenticating |
   success | locked | offline.
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var CFG = window.RootsInstConfig;
  var KEYS = CFG.KEYS;

  var attemptKey = 'roots_institutional_attempts';
  var MAX_ATTEMPTS = 5;
  var LOCK_SECONDS = 60;

  /* ---------- helpers ---------- */
  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (e) { return fallback; }
  }
  function writeJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  async function hashPassword(pw) {
    try {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('roots::inst::' + pw));
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) {
      var h = 5381, s = 'roots::inst::' + pw;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
      return 'x' + (h >>> 0).toString(16);
    }
  }

  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  function showToast(msg) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- country dial codes ---------- */
  (function initCountry() {
    var sel = $('institutionalLoginWhatsappCountry');
    var cs = window.RegData.countries.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    cs.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.code;
      o.textContent = c.name + ' ' + c.dial;
      o.dataset.dial = c.dial;
      sel.appendChild(o);
    });
    sel.value = 'ZW';
  })();

  /* ---------- state machine ---------- */
  var els = {
    error: $('institutionalLoginError'),
    status: $('institutionalLoginStatus'),
    submit: $('institutionalLoginSubmit')
  };

  function setState(state, message) {
    els.error.style.display = 'none';
    els.status.style.display = 'none';

    if (state !== 'authenticating' && state !== 'locked') restoreSubmitLabel();

    if (state === 'invalid') {
      els.error.textContent = message || 'Unable to sign in. Check your details and try again.';
      els.error.style.display = 'block';
    } else if (state === 'validating') {
      els.status.textContent = 'Checking your details…';
      els.status.style.display = 'block';
    } else if (state === 'authenticating') {
      els.status.textContent = 'Signing in…';
      els.status.style.display = 'block';
      els.submit.disabled = true;
      els.submit.innerHTML = '<span class="inst-spinner"></span>Signing in…';
    } else if (state === 'locked') {
      els.error.textContent = message;
      els.error.style.display = 'block';
      els.submit.disabled = true;
    } else if (state === 'offline') {
      els.status.textContent = 'Institutional access requires a previously authorised local session.';
      els.status.style.display = 'block';
    } else if (state === 'success') {
      els.status.textContent = 'Signed in. Opening your workspace…';
      els.status.style.display = 'block';
    }
  }

  function restoreSubmitLabel() {
    els.submit.disabled = false;
    els.submit.textContent = 'LOG IN';
  }

  /* ---------- lockout ---------- */
  function getAttempts() { return readJson(attemptKey, { count: 0, lockedUntil: 0 }); }
  function isLocked() { return getAttempts().lockedUntil > Date.now(); }
  function lockCountdown() {
    var a = getAttempts();
    var left = Math.max(0, Math.ceil((a.lockedUntil - Date.now()) / 1000));
    setState('locked', 'Too many failed attempts. Try again in ' + left + 's.');
    if (left > 0) setTimeout(lockCountdown, 1000);
    else restoreSubmitLabel();
  }
  function registerFailure() {
    var a = getAttempts();
    a.count += 1;
    if (a.count >= MAX_ATTEMPTS) {
      a.lockedUntil = Date.now() + LOCK_SECONDS * 1000;
      a.count = 0;
    }
    writeJson(attemptKey, a);
    return a.lockedUntil > Date.now();
  }

  /* ---------- submit ---------- */
  async function handleInstitutionalLoginSubmit(ev) {
    ev.preventDefault();
    if (isLocked()) { lockCountdown(); return; }

    var name = $('institutionalLoginName').value.trim();
    var ccSel = $('institutionalLoginWhatsappCountry');
    var ccOpt = ccSel.options[ccSel.selectedIndex];
    var dial = ccOpt ? (ccOpt.dataset.dial || '') : '';
    var waLocal = digits($('institutionalLoginWhatsapp').value);
    var password = $('institutionalLoginPassword').value;

    setState('validating');

    if (!name || waLocal.length < 7 || password.length < 6) {
      registerFailure();
      setState('invalid');
      return;
    }

    setState('authenticating');
    await new Promise(function (r) { setTimeout(r, 500); });

    var accounts = readJson(KEYS.ACCOUNTS, []);
    var hash = await hashPassword(password);
    var wantedWa = digits(dial) + waLocal;
    var match = null;
    for (var i = 0; i < accounts.length; i++) {
      var acc = accounts[i];
      if (acc.adminName.toLowerCase() !== name.toLowerCase()) continue;
      if (acc.adminWhatsappDigits !== waLocal && acc.adminWhatsappFull !== wantedWa) continue;
      if (acc.authHash !== hash) continue;
      match = acc;
      break;
    }

    if (!match) {
      var lockedNow = registerFailure();
      if (lockedNow) { lockCountdown(); return; }
      setState('invalid');
      return;
    }

    /* Phase C hook: Roots Administrator suspension gate. Credentials were
       correct, so reset the attempt counter before rejecting. */
    var susp = readJson('roots_admin_user_suspensions', []).filter(function (s) {
      return s.active && s.key === (match.applicationId || '') + '|' + String(match.adminName || '').toLowerCase();
    })[0];
    if (susp) {
      writeJson(attemptKey, { count: 0, lockedUntil: 0 });
      setState('invalid', 'Account suspended by the Roots Administrator.' + (susp.reason ? ' Reason: ' + susp.reason : ''));
      return;
    }

    writeJson(attemptKey, { count: 0, lockedUntil: 0 });
    writeJson(KEYS.SESSION, {
      applicationId: match.applicationId,
      institutionName: match.institutionName,
      typeCode: match.typeCode,
      adminName: match.adminName,
      role: 'ADMINISTRATOR',
      signInAt: new Date().toISOString()
    });

    setState('success');
    setTimeout(function () { location.href = 'institutional-workspace.html'; }, 450);
  }

  $('institutionalLoginForm').addEventListener('submit', handleInstitutionalLoginSubmit);

  /* ---------- forgot password ---------- */
  $('institutionalForgotPassword').addEventListener('click', function () {
    setState('idle');
    showToast('Password recovery is not available in this offline demo. Register again or contact your administrator.');
  });

  /* ---------- navigation ---------- */
  $('institutionalRegisterBtn').addEventListener('click', function () {
    location.href = 'institutional-onboarding.html';
  });
  $('institutionalBackBtn').addEventListener('click', function () {
    location.href = '../index.html';
  });

  /* ---------- offline handling ---------- */
  window.addEventListener('offline', function () {
    setState('offline');
    restoreSubmitLabel();
  });
  window.addEventListener('online', function () {
    setState('idle');
    restoreSubmitLabel();
  });
  if (!navigator.onLine) {
    var sess = readJson(KEYS.SESSION, null);
    if (sess && sess.institutionName) {
      setState('offline');
      els.status.textContent = 'Institutional access requires a previously authorised local session. Continue to your cached workspace.';
      var cont = document.createElement('button');
      cont.type = 'button';
      cont.className = 'inst-btn inst-btn-primary';
      cont.style.marginTop = '10px';
      cont.textContent = 'Continue offline as ' + sess.adminName;
      cont.addEventListener('click', function () {
        location.href = 'institutional-workspace.html';
      });
      els.status.parentNode.insertBefore(cont, els.status.nextSibling);
    } else {
      setState('offline');
    }
  }

  /* ---------- application status checker ---------- */
  $('instStatusToggle').addEventListener('click', function () {
    var panel = $('instApplicationStatusPanel');
    if (panel.style.display === 'none') {
      renderApplicationStatuses();
      panel.style.display = '';
      this.textContent = 'Hide application status';
    } else {
      panel.style.display = 'none';
      this.textContent = 'Check application status';
    }
  });

  function renderApplicationStatuses() {
    var list = $('instApplicationStatusList');
    var apps = readJson(KEYS.APPLICATIONS, []);
    list.innerHTML = '';
    if (!apps.length) {
      list.innerHTML = '<li>No applications submitted from this device yet.</li>';
      return;
    }
    apps.slice().reverse().forEach(function (app) {
      var li = document.createElement('li');
      var badgeClass = app.status === 'ACTIVE' ? 'inst-badge-active' : 'inst-badge-underreview';
      var statusLabel = app.status === 'ACTIVE' ? 'APPROVED — PROVISIONAL ACCESS' : app.status;
      li.innerHTML =
        '<div class="nm">' + escape(appIdText(app)) + '</div>' +
        '<div>' + escape(app.organisation.name) + '</div>' +
        '<div class="meta">Submitted ' + new Date(app.submittedAt).toLocaleDateString() + '</div>' +
        '<div style="margin-top:6px;"><span class="inst-badge ' + badgeClass + '">' + statusLabel + '</span></div>';
      list.appendChild(li);
    });
  }

  function appIdText(app) {
    return app.applicationId + ' · ' + typeTitle(app.typeCode);
  }
  function typeTitle(code) {
    var t = CFG.typeByCode(code);
    return t ? t.title : code;
  }
  function escape(s) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(s == null ? '' : s)));
    return div.innerHTML;
  }

  /* ---------- boot ---------- */
  setState('idle');
})();
