/* ============================================================
   ROOTS — MAIN APPLICATION ENGINE
   State machine routing + all view renderers + tree engine
   ============================================================ */
(function(){
  'use strict';

  /* ---------- STATE ---------- */
  var state = {
    screen: 'welcome',
    activeView: 'profile',      // regular user tab
    activeProfileTab: 'lifestory',
    scale: 0.85,
    tx: 0, ty: 0,
    expanded: new Set(),
    images: {},
    gallery: {},
    notes: {},
    activePersonId: null,
    isPanning: false,
    panStart: {x:0,y:0}, txStart:0, tyStart:0,
    settings: { thumbs: true, ribbon: true, hideCousins: false, maxGen: 5, quickAddParents: true, cardColorStyle: 'gender', cardOrientation: 'vertical' },
    // Premium unlocks — verified via local EcoCash reference code (no live gateway)
    unlocks: { bloodline: false, pdfExport: false, sdBackup: false, audioLibrary: false },
    ecocashCodes: [],
    posts: [],
    groups: [
      { id:'g1', name:'Siblings', icon:'👥', members:[], preset:'SIBLINGS' },
      { id:'g2', name:'1st Cousins', icon:'👤', members:[], preset:'FIRST_COUSINS' },
      { id:'g3', name:'2nd Cousins', icon:'👤', members:[], preset:'SECOND_COUSINS' },
    ],
    groupIdCounter: 4,
    postIdCounter: 1,
    myId: 'you',
    deathRecords: {},
  };

  var PERSIST_KEY = 'roots_app_state';

  function persistState(){
    try {
      // Merge into existing store — tree.html owns extra keys (bloodlineStack, marriageLedgers…)
      var save = {};
      try { save = JSON.parse(localStorage.getItem(PERSIST_KEY)) || {}; } catch(e) { save = {}; }
      var persistKeys = ['myId', 'postIdCounter', 'groupIdCounter', 'images', 'gallery', 'posts', 'notes', 'deathRecords', 'unlocks', 'ecocashCodes', 'settings', 'groups'];
      persistKeys.forEach(function(k){ save[k] = state[k]; });
      save.expanded = state.expanded instanceof Set ? Array.from(state.expanded) : [];
      localStorage.setItem(PERSIST_KEY, JSON.stringify(save));
    } catch(e) {
      if (e.name === 'QuotaExceededError') {
        showToast('⚠️ Storage full. Some photos may not be saved. Consider exporting backup.');
      }
    }
  }

  function restoreState(){
    try {
      var raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      Object.keys(saved).forEach(function(k){
        if (k === 'expanded') {
          state.expanded = new Set(saved.expanded || []);
        } else if (state.hasOwnProperty(k) || k === 'deathRecords') {
          state[k] = saved[k];
        }
      });
    } catch(e) { /* ignore corrupt storage */ }
  }

  restoreState();

  function isFeatureUnlocked(feature){
    if (state.unlocks[feature]) return true;
    return false;
  }

  /* ---------- DOM REFS ---------- */
  var $ = function(id){ return document.getElementById(id); };
  var welcomeScreen = $('welcome-screen');
  var regularApp = $('regular-app');
  var topbarTitle = $('topbarTitle');
  var toast = $('toast');
  var modalOverlay = $('modalOverlay');
  var modalSheet = $('modalSheet');

  /* ---------- SCREEN ROUTING ---------- */
  function showScreen(id){
    [welcomeScreen, regularApp].forEach(function(s){
      s.classList.toggle('active', s.id === id + '-screen' || s.id === id + '-app');
    });
    state.screen = id;
    if (id === 'welcome') return;
    if (id === 'regular') {
      state.activeView = 'profile';
      switchView('profile');
      renderMyProfile();
      renderGroups();
      handleIndexHash();
    }
  }

  $('btnRegular').addEventListener('click', function(){
    try { localStorage.setItem('roots_role', 'regular'); } catch(e) {}
    showScreen('account');
  });
  $('btnInstitutional').addEventListener('click', function(){
    try { localStorage.setItem('roots_role', 'institutional'); } catch(e) {}
    location.href = 'institutional/institutional-login.html';
  });
  $('btnAdministrator').addEventListener('click', function(){
    try { localStorage.setItem('roots_role', 'admin'); } catch(e) {}
    location.href = 'admin/admin-login.html';
  });
  $('topbarBack').addEventListener('click', function(){ showScreen('welcome'); });

  /* ---------- ACCOUNT GATE ---------- */
  $('btnLoginFamily').addEventListener('click', function(){
    var focus = window.RootsDataset ? RootsDataset.focus() : null;
    window.RootsSession.set({
      accountType: 'regular',
      mode: 'family',
      personId: (focus && focus.id) || 'R001'
    });
    location.reload();
  });
  $('btnCreateProfile').addEventListener('click', function(){
    location.href = 'onboarding.html';
  });
  $('accountBack').addEventListener('click', function(){ showScreen('welcome'); });

  var switchAccountBtn = $('switchAccountBtn');
  if (switchAccountBtn) switchAccountBtn.addEventListener('click', function(){
    try {
      ['roots_session', 'roots_user', 'roots_auth', 'roots_role'].forEach(function(k){ localStorage.removeItem(k); });
    } catch(e) {}
    location.href = 'index.html';
  });

  /* ---------- TAB SWITCHING (regular user) ---------- */
  var navItems = document.querySelectorAll('.nav-item');
  var views = {
    groups: $('groups-view'),
    profile: $('profile-view')
  };

  function switchView(id){
    state.activeView = id;
    Object.keys(views).forEach(function(k){
      views[k].classList.toggle('active', k === id);
    });
    navItems.forEach(function(n){
      n.classList.toggle('active', n.dataset.view === id);
    });
    var titles = { groups:'Groups', profile:'Profile' };
    topbarTitle.textContent = titles[id] || 'Roots';
  }

  navItems.forEach(function(n){
    n.addEventListener('click', function(){
      if (n.getAttribute('data-href')) return; // external page — shell.js navigates
      switchView(n.dataset.view);
    });
  });

  /* ---------- HASH ROUTING (index.html#profile / #settings) ---------- */
  function handleIndexHash(){
    var h = (location.hash || '').replace('#', '');
    if (!h) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch(e) {}
    if (h === 'profile') {
      switchView('profile');
    } else if (h === 'settings') {
      if (window.RootsSettings) RootsSettings.open();
    }
  }

  var goGroupsBtn = $('goGroupsBtn');
  if (goGroupsBtn) goGroupsBtn.addEventListener('click', function(){ switchView('groups'); });

  /* ============================================================
     GROUPS VIEW
     ============================================================ */
  function renderGroups(){
    var list = $('groupsList');
    list.innerHTML = '';
    if(state.groups.length === 0){
      list.innerHTML = '<div class="groups-empty">No groups yet.<br>Tap "+ New" to create a group.</div>';
      return;
    }
    state.groups.forEach(function(g){
      var div = document.createElement('div');
      div.className = 'group-card';
      div.innerHTML =
        '<div class="group-icon">' + (g.icon||'👥') + '</div>' +
        '<div class="group-info"><div class="group-name">' + escapeHtml(g.name) + '</div><div class="group-meta">' + (g.members ? g.members.length + ' members' : 'Preset group') + '</div></div>';
      var delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style.cssText = 'background:none;border:none;color:var(--accent);font-size:1rem;cursor:pointer;padding:4px 8px;align-self:center;flex-shrink:0;';
      delBtn.title = 'Delete group';
      delBtn.addEventListener('click', function(e){
        e.stopPropagation();
        if (!confirm('Delete "' + g.name + '"?')) return;
        var idx = state.groups.indexOf(g);
        if (idx !== -1) state.groups.splice(idx, 1);
        renderGroups();
        persistState();
        showToast('🗑️ Group deleted');
      });
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.appendChild(delBtn);
      list.appendChild(div);
    });
  }

  $('newGroupBtn').addEventListener('click', function(){
    openModal('New Group',
      '<input class="modal-input" id="modalGroupName" placeholder="Group name (e.g. Siblings)">' +
      '<select class="modal-input" id="modalGroupType">' +
        '<option value="CUSTOM">Custom group</option>' +
        '<option value="SIBLINGS">Siblings</option>' +
        '<option value="FIRST_COUSINS">1st Cousins</option>' +
        '<option value="SECOND_COUSINS">2nd Cousins</option>' +
        '<option value="THIRD_COUSINS">3rd Cousins</option>' +
      '</select>' +
      '<button class="modal-btn" id="modalCreateGroup">Create Group</button>',
      function(){ closeModal(); }
    );
    $('modalCreateGroup').addEventListener('click', function(){
      var name = ($('modalGroupName')||{}).value || 'New Group';
      var type = ($('modalGroupType')||{}).value || 'CUSTOM';
      state.groups.push({
        id: 'g' + (state.groupIdCounter++),
        name: name,
        icon: '👥',
        members: [],
        preset: type
      });
      closeModal();
      renderGroups();
      persistState();
      showToast('Group "' + name + '" created!');
    });
  });

  /* ============================================================
     PROFILE TAB (self)
     ============================================================ */
  function renderMyProfile(){
    var me = byId[state.myId];
    if(!me) return;
    var img = state.images[state.myId];
    var avatar = $('myAvatar');
    avatar.innerHTML = img ? '<img src="' + img + '" alt="">' : '👤';
    $('myName').textContent = me.name;
    var k = me.kinship || {};
    $('myTotem').textContent = (k.mutupo ? k.mutupo : '') + (k.chidawo ? ' · ' + k.chidawo : '');
    var body = $('myProfileBody');
    body.innerHTML = '';
    var sections = [
      { title: 'Identity', rows: [
        ['Full Name', me.name],
        ['Relation', me.relation||'—'],
        ['Born', me.born||'—'],
        ['Location', me.location||'—'],
        ['Gender', me.gender==='m'?'Male':me.gender==='f'?'Female':'—'],
      ]},
      { title: 'Cultural', rows: [
        ['Mutupo', k.mutupo||'—'],
        ['Chidawo', k.chidawo||'—'],
        ['System', k.culturalSystem||'SHONA'],
      ]},
    ];
    sections.forEach(function(s){
      var sec = document.createElement('div');
      sec.className = 'profile-section';
      sec.innerHTML = '<h4>' + s.title + '</h4>';
      s.rows.forEach(function(r){
        var row = document.createElement('div'); row.className='info-row';
        row.innerHTML = '<span class="info-label">' + r[0] + '</span><span class="info-val">' + r[1] + '</span>';
        sec.appendChild(row);
      });
      body.appendChild(sec);
    });
    // WhatsApp contact button
    var waBtn = document.createElement('button');
    waBtn.style.cssText = 'width:100%;padding:12px;border:none;border-radius:50px;background:var(--wa-green);color:#fff;font-weight:700;font-size:0.88rem;cursor:pointer;margin-top:14px;';
    waBtn.textContent = '📱 Share via WhatsApp';
    waBtn.addEventListener('click', function(){
      var payload = generateWhatsAppPayload(me);
      window.location.href = payload;
    });
    body.appendChild(waBtn);
  }


  /* ============================================================
     MODAL SYSTEM
     ============================================================ */
  function openModal(title, bodyHtml, onCancel){
    $('modalTitle').textContent = title;
    $('modalBody').innerHTML = bodyHtml;
    modalOverlay.classList.add('show');
    modalSheet.classList.add('show');
    $('modalCancel').onclick = function(){
      closeModal();
      if(onCancel) onCancel();
    };
  }
  function closeModal(){
    modalOverlay.classList.remove('show');
    modalSheet.classList.remove('show');
  }
  modalOverlay.addEventListener('click', function(e){
    if(e.target === modalOverlay) closeModal();
  });

  /* ============================================================
     TOAST
     ============================================================ */
  var toastQueue = [];
  var toastTimer = null;

  var loadingEl = null;
  function showLoading(msg){
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
      loadingEl.innerHTML = '<div style="background:var(--card);padding:24px 32px;border-radius:16px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);"><div style="width:28px;height:28px;border:3px solid var(--divider);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px;"></div><div style="color:var(--text);font-size:0.85rem;font-weight:600;">' + (msg||'Loading…') + '</div></div>';
      document.body.appendChild(loadingEl);
    }
  }
  function hideLoading(){
    if (loadingEl) { loadingEl.remove(); loadingEl = null; }
  }
  function showToast(msg){
    toastQueue.push(msg);
    if (toastTimer) return;
    function showNext(){
      if (!toastQueue.length) { toast.classList.remove('show'); toastTimer = null; return; }
      toast.textContent = toastQueue.shift();
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function(){
        toast.classList.remove('show');
        toastTimer = setTimeout(showNext, 200);
      }, 3000);
    }
    showNext();
  }

  /* ============================================================
     UTILITY
     ============================================================ */
  function escapeHtml(str){
    if (str === null || str === undefined) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
  function escapeXml(str){
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }
  function sanitizeImageSrc(src){
    if (!src || typeof src !== 'string') return '';
    if (src.indexOf('data:image/') === 0) return src;
    if (src.indexOf('blob:') === 0) return src;
    return '';
  }

  /* ============================================================
     INIT
     ============================================================ */
  (function boot(){
    var role = null;
    try { role = localStorage.getItem('roots_role'); } catch(e) {}
    if (role === 'regular') {
      // Session decides entry: no account chosen yet -> account gate
      var sess = window.RootsSession ? RootsSession.get() : null;
      showScreen(sess && sess.personId ? 'regular' : 'account');
    } else if (role === 'institutional') {
      // Institutional lives behind its own login gate now.
      location.href = 'institutional/institutional-login.html';
    } else {
      showScreen('welcome');
    }
  })();

})();
