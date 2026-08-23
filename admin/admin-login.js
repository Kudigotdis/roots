/* ============================================================
   ROOTS ADMINISTRATOR — login gate (Setup 3 §3-4).
   Independently protected: no route from regular or
   institutional sessions reaches the admin console.
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var Store = window.RootsAdminStore;
  var KEYS = Store.KEYS;
  var MAX_ATTEMPTS = 5;
  var LOCK_SECONDS = 60;

  /* ---------- country dial codes ---------- */
  (function populateCountry() {
    var sel = $('adminLoginWhatsappCountry');
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

  /* ---------- state ---------- */
  var els = { error: $('adminLoginError'), status: $('adminLoginStatus'), submit: $('adminLoginSubmit') };

  function setState(state, message) {
    els.error.style.display = 'none';
    els.status.style.display = 'none';
    if (state !== 'authenticating' && state !== 'locked') restoreSubmitLabel();

    if (state === 'invalid') {
      els.error.textContent = message || 'Unable to sign in. Check your administrator details and try again.';
      els.error.style.display = 'block';
    } else if (state === 'validating') {
      els.status.textContent = 'Checking your details…';
      els.status.style.display = 'block';
    } else if (state === 'authenticating') {
      els.status.textContent = 'Signing in…';
      els.status.style.display = 'block';
      els.submit.disabled = true;
      els.submit.innerHTML = '<span class="adm-spinner" style="width:14px;height:14px;border-width:2px;margin:0;"></span> Signing in…';
    } else if (state === 'locked') {
      els.error.textContent = message;
      els.error.style.display = 'block';
      els.submit.disabled = true;
    } else if (state === 'success') {
      els.status.textContent = 'Signed in. Opening the console…';
      els.status.style.display = 'block';
    }
  }
  function restoreSubmitLabel() {
    els.submit.disabled = false;
    els.submit.textContent = 'LOG IN';
  }

  /* ---------- lockout ---------- */
  function getAttempts() { return Store.readJson(KEYS.ATTEMPTS, { count: 0, lockedUntil: 0 }); }
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
      Store.logAdminAction('ADMIN_LOGIN_LOCKED', 'AdminAccount', a.count, { result: 'FAILED' });
    }
    Store.writeJson(KEYS.ATTEMPTS, a);
    return a.lockedUntil > Date.now();
  }

  /* ---------- submit ---------- */
  async function handleLogin(ev) {
    ev.preventDefault();
    if (isLocked()) { lockCountdown(); return; }

    var name = $('adminLoginName').value.trim();
    var ccSel = $('adminLoginWhatsappCountry');
    var ccOpt = ccSel.options[ccSel.selectedIndex];
    var dial = ccOpt ? (ccOpt.dataset.dial || '') : '';
    var waLocal = Store.digits($('adminLoginWhatsapp').value);
    var password = $('adminLoginPassword').value;

    setState('validating');
    if (!name || waLocal.length < 7 || password.length < 6) {
      registerFailure();
      setState('invalid');
      return;
    }

    setState('authenticating');
    await new Promise(function (r) { setTimeout(r, 400); });

    /* Seed runs once (async hash build) — wait for it when needed. */
    if (!localStorage.getItem(KEYS.ACCOUNTS)) {
      Store.seed();
      await new Promise(function (r) { setTimeout(r, 350); });
    }

    var accounts = Store.readJson(KEYS.ACCOUNTS, []);
    var hash = await Store.hashPassword(password);
    var wantedWa = Store.digits(dial) + waLocal;
    var match = null;
    for (var i = 0; i < accounts.length; i++) {
      var acc = accounts[i];
      if (acc.name.toLowerCase() !== name.toLowerCase()) continue;
      if (acc.whatsappDigits !== waLocal && acc.whatsappFull !== wantedWa) continue;
      if (acc.authHash !== hash) continue;
      match = acc;
      break;
    }

    if (!match || match.status !== 'ACTIVE') {
      var lockedNow = registerFailure();
      Store.logAdminAction('ADMIN_LOGIN_FAILED', 'AdminAccount', name, { result: 'FAILED' });
      if (lockedNow) { lockCountdown(); return; }
      setState('invalid');
      return;
    }

    Store.writeJson(KEYS.ATTEMPTS, { count: 0, lockedUntil: 0 });
    Store.writeJson(KEYS.SESSION, {
      adminId: match.adminId,
      name: match.name,
      role: match.role,
      signInAt: new Date().toISOString()
    });
    Store.logAdminAction('ADMIN_LOGIN', 'AdminSession', match.adminId, {});
    setState('success');
    setTimeout(function () { location.href = 'admin.html'; }, 450);
  }

  $('adminLoginForm').addEventListener('submit', handleLogin);

  /* ---------- boot ---------- */
  Store.seed();
  if (Store.currentSession()) location.replace('admin.html');
})();
