/* ============================================================
   ROOTS TIMELINE — standalone feed engine (timeline.html)
   Same data layer as index.html: PEOPLE/byId (data.js),
   isVisibleForScope (customary.js), roots_app_state (store.js).
   Owned by: Timeline dev.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- STATE ---------- */
  var saved = window.RootsStore.read();
  var state = {
    myId: saved.myId || 'you',
    postIdCounter: saved.postIdCounter || 1,
    images: saved.images || {},
    posts: saved.posts || []
  };

  function persistPosts() {
    window.RootsStore.patch({
      posts: state.posts,
      postIdCounter: state.postIdCounter,
      images: state.images
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
  function avatarHtml(personId, colorBg) {
    var img = state.images[personId];
    var person = byId[personId];
    var inner = img
      ? '<img src="' + sanitizeImageSrc(img) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : (person ? initials(person.name) : '?');
    return '<div class="ig-post-avatar" style="background:' + colorBg + ';">' + inner + '</div>';
  }

  /* ---------- STORIES ---------- */
  function renderStories() {
    var container = $('igStories');
    container.innerHTML = '';
    var me = byId[state.myId];
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
      div.addEventListener('click', function () {
        window.RootsShell.toast('👤 ' + p.name.split(' ')[0] + '\u2019s profile lives on the Home tab.');
      });
      container.appendChild(div);
    });
  }

  /* First 12 family members (same rule as index.html) */
  var FAMILY_STORIES = PEOPLE.filter(function (p) { return p.id !== state.myId; }).slice(0, 12);

  /* ---------- FEED ---------- */
  function renderFeed() {
    var feed = $('timelineFeed');
    feed.innerHTML = '';
    renderStories();

    var visiblePosts = state.posts.filter(function (post) {
      return isVisibleForScope(post.visibilityScope || 'SIBLINGS', state.myId, post.authorId, byId);
    });

    if (!visiblePosts.length) {
      feed.innerHTML = '<div class="timeline-empty">No posts yet.<br>Tap + to share a family photo.</div>';
      return;
    }

    visiblePosts.slice().reverse().forEach(function (post, idx) {
      var author = byId[post.authorId];
      var authorName = author ? author.name : 'Unknown';
      var color = storyColors[(authorName.charCodeAt(0) || 0) % storyColors.length];
      var liked = post._liked ? ' liked' : '';
      var likeCount = post._likes || 0;
      var div = document.createElement('div');
      div.className = 'ig-post';
      div.innerHTML =
        '<div class="ig-post-header">' +
          avatarHtml(post.authorId, color) +
          '<span class="ig-post-author">' + authorName + '</span>' +
          '<span class="ig-post-more">\u22EF</span>' +
        '</div>' +
        '<div class="ig-post-img">' + (post.imageRef ? '<img src="' + sanitizeImageSrc(post.imageRef) + '" alt="">' : '\uD83D\uDCF8') + '</div>' +
        '<div class="ig-post-actions">' +
          '<button class="ig-action-btn' + liked + '" data-action="like" data-idx="' + idx + '">\u2665</button>' +
          '<button class="ig-action-btn" data-action="comment">\uD83D\uDCAC</button>' +
          '<button class="ig-action-btn" data-action="share">\u2197</button>' +
        '</div>' +
        (likeCount > 0 ? '<div class="ig-post-likes">' + likeCount + ' like' + (likeCount > 1 ? 's' : '') + '</div>' : '') +
        (post.caption ? '<div class="ig-post-caption"><strong>' + authorName.split(' ')[0] + '</strong> ' + escapeHtml(post.caption) + '</div>' : '') +
        '<div class="ig-post-time">' + (post.createdAt || '') + '</div>';

      div.querySelector('[data-action="like"]').addEventListener('click', function () {
        post._liked = !post._liked;
        post._likes = (post._likes || 0) + (post._liked ? 1 : -1);
        if (post._likes < 0) post._likes = 0;
        persistPosts();
        renderFeed();
      });
      feed.appendChild(div);
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ---------- NEW POST MODAL ---------- */
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
        '<button class="modal-btn" id="tlPickPhoto">\uD83D\uDCF7 Choose Photo</button>' +
        '<div style="margin:10px 0;"><img id="tlPreview" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;display:none;background:var(--bg-alt);"></div>' +
        '<input class="modal-input" id="tlCaption" placeholder="Write a caption\u2026" style="margin-top:6px;">' +
        '<label class="setting-label" style="margin:8px 0 4px;display:block;">Visibility</label>' +
        '<select class="modal-input" id="tlVisibility">' +
          '<option value="SIBLINGS">Siblings</option>' +
          '<option value="FIRST_COUSINS">1st Cousins</option>' +
          '<option value="SECOND_COUSINS">2nd Cousins</option>' +
          '<option value="PUBLIC_CONNECTED">Public (Connected)</option>' +
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
      state.posts.push({
        id: 'post' + (state.postIdCounter++),
        authorId: state.myId,
        imageRef: imgRef,
        caption: ($('tlCaption') || {}).value || '',
        createdAt: new Date().toLocaleDateString(),
        visibilityScope: ($('tlVisibility') || {}).value || 'SIBLINGS'
      });
      closeModal();
      persistPosts();
      renderFeed();
      window.RootsShell.toast('Post shared with family!');
    });
  }

  /* ---------- WIRE UP ---------- */
  var notif = $('igNotifBtn');
  if (notif) notif.addEventListener('click', function () {
    window.RootsShell.toast('\uD83D\uDD14 No new notifications yet');
  });

  renderFeed();
})();
