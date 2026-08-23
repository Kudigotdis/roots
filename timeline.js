/* ============================================================
   ROOTS TIMELINE — standalone feed engine (timeline.html)
   Same data layer as index.html: PEOPLE/byId (data.js),
   isVisibleForScope (customary.js), roots_app_state (store.js).
   Owned by: Timeline dev.
   Phase E1: comment threads · share · delete own post ·
   story viewer · activity bell (unseen posts / birthdays /
   flagged records — single-user offline, no simulated likes)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- STATE ---------- */
  var saved = window.RootsStore.read();
  var state = {
    myId: saved.myId || 'you',
    postIdCounter: saved.postIdCounter || 1,
    images: saved.images || {},
    posts: saved.posts || [],
    groups: saved.groups || [],
    lastSeenFeedAt: saved.lastSeenFeedAt || null
  };

  function persistPosts() {
    window.RootsStore.patch({
      posts: state.posts,
      postIdCounter: state.postIdCounter,
      images: state.images,
      lastSeenFeedAt: state.lastSeenFeedAt
    });
  }

  /* ---------- HELPERS ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var storyColors = ['#e1306c', '#f77737', '#fcaf45', '#c13584', '#833ab4', '#fd1d1d', '#405de6'];

  function initials(name) {
    return String(name || '').replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  function sanitizeImageSrc(src) {
    if (!src || typeof src !== 'string') return '';
    if (src.indexOf('data:image/') === 0) return src;
    if (src.indexOf('blob:') === 0) return src;
    return '';
  }
  function authorName(personId) {
    var p = byId[personId];
    return p ? p.name : 'Unknown';
  }
  function avatarHtml(personId, colorBg) {
    var img = state.images[personId];
    var person = byId[personId];
    var inner = img
      ? '<img src="' + sanitizeImageSrc(img) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : (person ? initials(person.name) : '?');
    return '<div class="ig-post-avatar" style="background:' + colorBg + ';">' + inner + '</div>';
  }
  function postVisible(post) {
    if (post.groupId) { /* E2: group-targeted post */
      var g = null;
      state.groups.forEach(function (x) { if (x.id === post.groupId) g = x; });
      if (!g) return post.authorId === state.myId;
      return g.members.indexOf(state.myId) !== -1 || post.authorId === state.myId;
    }
    return isVisibleForScope(post.visibilityScope || 'SIBLINGS', state.myId, post.authorId, byId);
  }
  function visiblePosts() {
    return state.posts.filter(postVisible);
  }

  /* ---------- STORIES ---------- */
  var FAMILY_STORIES = PEOPLE.filter(function (p) { return p.id !== state.myId; }).slice(0, 12);

  function renderStories() {
    var container = $('igStories');
    container.innerHTML = '';
    var addDiv = document.createElement('div');
    addDiv.className = 'ig-story add-story';
    addDiv.innerHTML = '<div class="ig-story-avatar"><span class="ig-add-icon">+</span></div><div class="ig-story-name">Your story</div>';
    addDiv.addEventListener('click', openNewPostModal);
    container.appendChild(addDiv);

    FAMILY_STORIES.forEach(function (p, i) {
      var div = document.createElement('div');
      div.className = 'ig-story';
      var color = storyColors[i % storyColors.length];
      var img = state.images[p.id];
      var avatarContent = img
        ? '<img src="' + sanitizeImageSrc(img) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
        : initials(p.name);
      div.innerHTML = '<div class="ig-story-avatar" style="background:' + color + ';">' + avatarContent + '</div>' +
        '<div class="ig-story-name">' + p.name.split(' ')[0] + '</div>';
      div.addEventListener('click', function () { openStoryViewer(p, color); });
      container.appendChild(div);
    });
  }

  /* ---------- STORY VIEWER (E1) ---------- */
  function closeStoryViewer() {
    var ov = $('tlStoryViewer');
    if (ov) ov.parentNode.removeChild(ov);
  }
  function openStoryViewer(person, color) {
    closeStoryViewer();
    var k = person.kinship || {};
    var yrs = (person.born ? String(person.born) : '') + (person.died ? '–' + String(person.died) : '');
    var latest = null;
    state.posts.forEach(function (p) { if (p.authorId === person.id && postVisible(p)) latest = p; });
    var ov = document.createElement('div');
    ov.id = 'tlStoryViewer';
    ov.className = 'tl-story-viewer show';
    ov.innerHTML =
      '<div class="tl-story-progress"><span></span></div>' +
      '<button class="tl-story-close" id="tlStoryClose">✕</button>' +
      '<div class="tl-story-card">' +
        '<div class="tl-story-avatar-big" style="background:' + color + ';">' + initials(person.name) + '</div>' +
        '<div class="tl-story-name-big">' + escapeHtml(person.name) + '</div>' +
        '<div class="tl-story-sub">' + escapeHtml(person.relation || '') +
          (yrs ? ' · ' + yrs : '') + (k.mutupo ? ' · ' + escapeHtml(k.mutupo) : '') + '</div>' +
        (latest && latest.imageRef
          ? '<img class="tl-story-img" src="' + sanitizeImageSrc(latest.imageRef) + '" alt="">'
          : '<div class="tl-story-img tl-story-empty">' + (latest ? '📷' : '👤') + '</div>') +
        (latest && latest.caption ? '<div class="tl-story-caption">' + escapeHtml(latest.caption) + '</div>' : '') +
      '</div>';
    document.body.appendChild(ov);
    $('tlStoryClose').addEventListener('click', closeStoryViewer);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeStoryViewer(); });
    setTimeout(closeStoryViewer, 6000);
  }

  /* ---------- ACTIVITY BELL (E1 — honest digest, no simulated social) ---------- */
  function computeActivity() {
    var items = [];
    var last = state.lastSeenFeedAt ? Date.parse(state.lastSeenFeedAt) : 0;
    if (!last) last = Date.now(); /* first launch: nothing is "new" */
    visiblePosts().forEach(function (p) {
      if (p.authorId === state.myId) return;
      var t = p.createdAtISO ? Date.parse(p.createdAtISO) : 0;
      if (t > last) items.push({ icon: '📸', msg: authorName(p.authorId) + ' shared a post' + (p.caption ? ' — ' + p.caption.slice(0, 40) : ''), go: 'post-' + p.id });
    });
    var now = new Date();
    var md = ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    (window.PEOPLE || []).forEach(function (p) {
      if (String(p.dateOfBirth || '').slice(5) === md) items.push({ icon: '🎂', msg: p.name.split(' ')[0] + ' celebrates a birthday today', go: 'tree' });
    });
    var disp = (window.PEOPLE || []).filter(function (p) { return p.sync && p.sync._disputed; }).length;
    if (disp) items.push({ icon: '⚖️', msg: disp + ' record(s) flagged for review', go: 'tree' });
    return items;
  }
  function updateBell() {
    var n = computeActivity().length;
    var b = $('igNotifCount');
    if (!b) return;
    b.textContent = String(n);
    b.style.display = n ? '' : 'none';
  }
  function closeNotifPanel() {
    var pn = $('tlNotifPanel');
    if (pn) pn.parentNode.removeChild(pn);
  }
  function openNotifPanel() {
    closeNotifPanel();
    var items = computeActivity();
    state.lastSeenFeedAt = new Date().toISOString(); /* mark seen on open */
    persistPosts();
    updateBell();
    var pn = document.createElement('div');
    pn.id = 'tlNotifPanel';
    pn.className = 'tl-notif-panel show';
    pn.innerHTML = '<div class="tl-notif-head">Activity</div>' +
      (items.length
        ? items.map(function (a, i) {
          return '<button class="tl-notif-item" data-go="' + escapeHtml(a.go || '') + '" data-i="' + i + '">' +
            '<b>' + a.icon + '</b><span>' + escapeHtml(a.msg) + '</span></button>';
        }).join('')
        : '<div class="tl-notif-empty">You\'re all caught up.</div>');
    document.body.appendChild(pn);
    pn.querySelectorAll('.tl-notif-item').forEach(function (b2) {
      b2.addEventListener('click', function () {
        var go = b2.dataset.go;
        closeNotifPanel();
        if (go === 'tree') { window.location.href = 'tree.html'; return; }
        var el = go && document.getElementById(go);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('tl-flash');
          setTimeout(function () { el.classList.remove('tl-flash'); }, 1600);
        }
      });
    });
    setTimeout(function () {
      document.addEventListener('click', function _off(ev) {
        if (!ev.target.closest || (!ev.target.closest('#tlNotifPanel') && !ev.target.closest('#igNotifBtn'))) {
          closeNotifPanel();
          document.removeEventListener('click', _off);
        }
      });
    }, 0);
  }

  /* ---------- FEED ---------- */
  function renderFeed() {
    var feed = $('timelineFeed');
    feed.innerHTML = '';
    renderStories();
    updateBell();

    var posts = visiblePosts();

    if (!posts.length) {
      feed.innerHTML = '<div class="timeline-empty">No posts yet.<br>Tap + to share a family photo.</div>';
      return;
    }

    posts.slice().reverse().forEach(function (post) {
      var author = byId[post.authorId];
      var authorNameStr = author ? author.name : 'Unknown';
      var color = storyColors[(authorNameStr.charCodeAt(0) || 0) % storyColors.length];
      var liked = post._liked ? ' liked' : '';
      var likeCount = post._likes || 0;
      var comments = post.comments || [];
      var mine = post.authorId === state.myId;
      var div = document.createElement('div');
      div.className = 'ig-post';
      div.id = 'post-' + post.id;
      div.innerHTML =
        '<div class="ig-post-header">' +
          avatarHtml(post.authorId, color) +
          '<span class="ig-post-author">' + authorNameStr + '</span>' +
          (post.groupId ? '<span class="tl-group-chip">👥 ' + escapeHtml((state.groups.filter(function (g) { return g.id === post.groupId; })[0] || {}).name || 'Group') + '</span>' : '') +
          '<span class="row-actions">' +
            (mine ? '<button class="tl-post-del" data-del="' + post.id + '" title="Delete post">🗑</button>' : '') +
            '<span class="ig-post-more">⋯</span>' +
          '</span>' +
        '</div>' +
        '<div class="ig-post-img">' + (post.imageRef ? '<img src="' + sanitizeImageSrc(post.imageRef) + '" alt="">' : '📷') + '</div>' +
        '<div class="ig-post-actions">' +
          '<button class="ig-action-btn' + liked + '" data-action="like" data-id="' + post.id + '">♥</button>' +
          '<button class="ig-action-btn" data-action="comment" data-id="' + post.id + '">💬' + (comments.length ? ' ' + comments.length : '') + '</button>' +
          '<button class="ig-action-btn" data-action="share" data-id="' + post.id + '">↗</button>' +
        '</div>' +
        (likeCount > 0 ? '<div class="ig-post-likes">' + likeCount + ' like' + (likeCount > 1 ? 's' : '') + '</div>' : '') +
        (post.caption ? '<div class="ig-post-caption"><strong>' + authorNameStr.split(' ')[0] + '</strong> ' + escapeHtml(post.caption) + '</div>' : '') +
        '<div class="ig-post-time">' + (post.createdAt || '') + '</div>';

      div.querySelector('[data-action="like"]').addEventListener('click', function () {
        post._liked = !post._liked;
        post._likes = (post._likes || 0) + (post._liked ? 1 : -1);
        if (post._likes < 0) post._likes = 0;
        persistPosts();
        renderFeed();
      });
      div.querySelector('[data-action="comment"]').addEventListener('click', function () { openComments(post); });
      div.querySelector('[data-action="share"]').addEventListener('click', function () { sharePost(post, authorNameStr); });
      feed.appendChild(div);
    });

    feed.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var pid = b.dataset.del;
        var p = null;
        state.posts.forEach(function (x) { if (x.id === pid) p = x; });
        if (!p) return;
        if (!window.confirm('Delete this post?')) return;
        state.posts.splice(state.posts.indexOf(p), 1);
        persistPosts();
        renderFeed();
        window.RootsShell.toast('Post deleted.');
      });
    });
  }

  /* ---------- SHARE (E1) ---------- */
  function sharePost(post, authorNameStr) {
    var text = (authorNameStr ? authorNameStr.split(' ')[0] + ' shared on Roots' : 'Roots') +
      (post.caption ? ': ' + post.caption : '') + ' — https://roots.app';
    if (navigator.share) {
      navigator.share({ title: 'Roots', text: text }).catch(function () {});
      return;
    }
    try { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); } catch (e) {}
  }

  /* ---------- COMMENTS (E1) ---------- */
  function closeComments() {
    var sh = $('tlCommentSheet');
    if (sh) sh.parentNode.removeChild(sh);
  }
  function openComments(post) {
    closeComments();
    var comments = post.comments || [];
    var sh = document.createElement('div');
    sh.id = 'tlCommentSheet';
    sh.className = 'modal-overlay show';
    sh.innerHTML =
      '<div class="modal-sheet show tl-sheet">' +
        '<div class="panel-handle"></div>' +
        '<div class="modal-title">Comments</div>' +
        '<div id="tlCommentList" class="tl-comment-list">' +
        (comments.length
          ? comments.map(function (c) {
            return '<div class="tl-comment-row"><b>' + escapeHtml(authorName(c.authorId).split(' ')[0]) + '</b> ' +
              escapeHtml(c.text) + '<span class="when">' + escapeHtml(String(c.at || '').slice(0, 10)) + '</span></div>';
          }).join('')
          : '<div class="tl-comment-empty">No comments yet. Start the conversation.</div>') +
        '</div>' +
        '<input class="modal-input" id="tlCommentInput" placeholder="Write a comment…">' +
        '<button class="modal-btn" id="tlCommentBtn">COMMENT</button>' +
        '<button class="modal-btn secondary" id="tlCommentClose">CLOSE</button>' +
      '</div>';
    document.body.appendChild(sh);
    $('tlCommentClose').addEventListener('click', closeComments);
    sh.addEventListener('click', function (e) { if (e.target === sh) closeComments(); });
    $('tlCommentBtn').addEventListener('click', function () {
      var txt = ($('tlCommentInput') || {}).value || '';
      txt = txt.trim();
      if (!txt) { window.RootsShell.toast('Write something first.'); return; }
      post.comments = post.comments || [];
      post.comments.push({
        id: 'c' + Date.now().toString(36),
        authorId: state.myId,
        text: txt.slice(0, 300),
        at: new Date().toISOString()
      });
      persistPosts();
      closeComments();
      renderFeed();
      window.RootsShell.toast('Comment added.');
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ---------- NEW POST MODAL (now with group target, E2) ---------- */
  function closeModal() {
    var ov = $('tlModalOverlay');
    if (ov) ov.parentNode.removeChild(ov);
  }

  function openNewPostModal() {
    var ov = document.createElement('div');
    ov.id = 'tlModalOverlay';
    ov.className = 'modal-overlay show';
    ov.innerHTML =
      '<div class="modal-sheet show">' +
        '<div class="panel-handle"></div>' +
        '<div class="modal-title">New Post</div>' +
        '<label class="setting-label" style="margin-bottom:8px;display:block;">Select photo</label>' +
        '<button class="modal-btn" id="tlPickPhoto">📷 Choose Photo</button>' +
        '<div style="margin:10px 0;"><img id="tlPreview" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;display:none;background:var(--bg-alt);"></div>' +
        '<input class="modal-input" id="tlCaption" placeholder="Write a caption…" style="margin-top:6px;">' +
        '<label class="setting-label" style="margin:8px 0 4px;display:block;">Audience</label>' +
        '<select class="modal-input" id="tlVisibility">' +
          '<option value="SIBLINGS">Siblings</option>' +
          '<option value="FIRST_COUSINS">1st Cousins</option>' +
          '<option value="SECOND_COUSINS">2nd Cousins</option>' +
          '<option value="PUBLIC_CONNECTED">Public (Connected)</option>' +
        '</select>' +
        '<select class="modal-input" id="tlGroup" style="margin-top:6px;">' +
          '<option value="">Family scope (use audience above)</option>' +
          state.groups.map(function (g) {
            return '<option value="' + escapeHtml(g.id) + '">👥 Group: ' + escapeHtml(g.name) + '</option>';
          }).join('') +
        '</select>' +
        '<button class="modal-btn" id="tlPostBtn">Post to Timeline</button>' +
        '<button class="modal-btn secondary" id="tlCancelBtn">Cancel</button>' +
      '</div>';
    document.body.appendChild(ov);

    $('tlCancelBtn').addEventListener('click', closeModal);
    $('tlPickPhoto').addEventListener('click', function () { $('tlFileInput').click(); });
    $('tlFileInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var preview = $('tlPreview');
        if (!preview) return;
        preview.src = reader.result;
        preview.style.display = 'block';
        preview.dataset.ref = reader.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
    $('tlPostBtn').addEventListener('click', function () {
      var preview = $('tlPreview');
      var imgRef = (preview && preview.dataset.ref) || '';
      if (!imgRef) { window.RootsShell.toast('Please select a photo first.'); return; }
      var groupId = ($('tlGroup') || {}).value || '';
      state.posts.push({
        id: 'post' + (state.postIdCounter++),
        authorId: state.myId,
        imageRef: imgRef,
        caption: ($('tlCaption') || {}).value || '',
        createdAt: new Date().toLocaleDateString(),
        createdAtISO: new Date().toISOString(),
        visibilityScope: ($('tlVisibility') || {}).value || 'SIBLINGS',
        groupId: groupId,
        comments: []
      });
      closeModal();
      persistPosts();
      renderFeed();
      window.RootsShell.toast(groupId ? 'Posted to your group!' : 'Post shared with family!');
    });
  }

  /* ---------- WIRE UP ---------- */
  var notif = $('igNotifBtn');
  if (notif) notif.addEventListener('click', openNotifPanel);

  renderFeed();
})();
