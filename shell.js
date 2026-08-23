/* ============================================================
   ROOTS SHELL — shared top bar / bottom nav controller
   Included by every page. No dependencies.
   Pages declare: <body data-page="home|timeline|tree|library"
                       data-back="index.html">
   Nav items may carry data-href="timeline.html" to become links.
   ============================================================ */
(function () {
  'use strict';

  var page = document.body.getAttribute('data-page') || '';

  /* ---------- 1. Bottom nav: active state + link navigation ---------- */
  var items = document.querySelectorAll('.bottom-nav .nav-item');
  Array.prototype.forEach.call(items, function (item) {
    var target = item.getAttribute('data-page') || item.getAttribute('data-view');

    if (target && target === page && !item.getAttribute('data-href')) {
      item.classList.add('active');
    }

    item.addEventListener('click', function () {
      var href = item.getAttribute('data-href');
      if (href) window.location.href = href;
    });
  });

  /* ---------- 2. Top bar back button (sub-pages only) ---------- */
  var back = document.getElementById('topbarBack');
  if (back && document.body.hasAttribute('data-back')) {
    back.addEventListener('click', function () {
      window.location.href = document.body.getAttribute('data-back');
    });
  }

  /* ---------- 3. Shared toast (for pages without app.js) ---------- */
  var toastQueue = [];
  var toastTimer = null;

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    toastQueue.push(msg);
    if (toastTimer) return;
    (function showNext() {
      if (!toastQueue.length) {
        el.classList.remove('show');
        toastTimer = null;
        return;
      }
      el.textContent = toastQueue.shift();
      el.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        el.classList.remove('show');
        toastTimer = setTimeout(showNext, 200);
      }, 3000);
    })();
  }

  /* ---------- Public API ---------- */
  window.RootsShell = {
    page: page,
    toast: toast,
    version: '1.0'
  };
})();
