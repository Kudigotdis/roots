/* ============================================================
   ROOTS STORE — shared localStorage bridge for roots_app_state
   app.js owns the full state object; standalone pages use
   read()/patch() to merge their own changes safely (one page
   is loaded at a time, so last-writer-wins is not a risk).
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'roots_app_state';

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function patch(partial) {
    try {
      var s = read();
      Object.keys(partial).forEach(function (k) { s[k] = partial[k]; });
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
      if (window.RootsShell) RootsShell.toast('⚠️ Storage full — change not saved.');
    }
  }

  window.RootsStore = {
    KEY: KEY,
    read: read,
    patch: patch
  };
})();
