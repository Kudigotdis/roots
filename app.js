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
  var instApp = $('institutional-app');
  var topbarTitle = $('topbarTitle');
  var toast = $('toast');
  var modalOverlay = $('modalOverlay');
  var modalSheet = $('modalSheet');

  /* ---------- SCREEN ROUTING ---------- */
  function showScreen(id){
    [welcomeScreen, regularApp, instApp].forEach(function(s){
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
    if (id === 'institutional') {
      renderInstitutional();
    }
  }

  $('btnRegular').addEventListener('click', function(){
    try { localStorage.setItem('roots_role', 'regular'); } catch(e) {}
    showScreen('regular');
  });
  $('btnInstitutional').addEventListener('click', function(){
    try { localStorage.setItem('roots_role', 'institutional'); } catch(e) {}
    showScreen('institutional');
  });
  $('topbarBack').addEventListener('click', function(){ showScreen('welcome'); });
  $('instBack').addEventListener('click', function(){ showScreen('welcome'); });

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
     INSTITUTIONAL DASHBOARD
     ============================================================ */
  function renderInstitutional(){
    var stats = $('instStats');
    var totemCount = Object.keys(totemRegistry).length;
    var peopleCount = PEOPLE.length;
    var provincesCount = provinces.length;
    var sabhukuCount = new Set(PEOPLE.map(function(p){ return p.admin && p.admin.sabhuku; }).filter(Boolean)).size;
    stats.innerHTML =
      '<div class="stat-card"><div class="stat-num">' + peopleCount + '</div><div class="stat-label">Profiles</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + totemCount + '</div><div class="stat-label">Totems Indexed</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + provincesCount + '</div><div class="stat-label">Provinces</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + sabhukuCount + '</div><div class="stat-label">Sabhuku Nodes</div></div>';

    // Filters
    var filters = $('instFilters');
    filters.innerHTML =
      '<select id="filterProvince"><option value="">Province</option>' + provinces.map(function(p){return '<option>' + p + '</option>';}).join('') + '</select>' +
      '<select id="filterTotem"><option value="">Totem</option>' + Object.keys(totemRegistry).map(function(t){return '<option>' + t.split('(')[0].trim() + '</option>';}).join('') + '</select>' +
      '<select id="filterGender"><option value="">Gender</option><option value="m">Male</option><option value="f">Female</option></select>' +
      '<select id="filterStatus"><option value="">Status</option><option value="alive">Alive</option><option value="deceased">Deceased</option></select>' +
      '<select id="filterAgeBand"><option value="">Age Band</option><option value="0-17">0–17</option><option value="18-35">18–35</option><option value="36-60">36–60</option><option value="60+">60+</option></select>' +
      '<select id="filterLanguage"><option value="">Language</option>' + all16Languages.map(function(l){return '<option>' + l + '</option>';}).join('') + '</select>' +
      '<input id="filterWard" placeholder="Ward" style="min-width:70px;">' +
      '<input id="filterChief" placeholder="Chief" style="min-width:70px;">' +
      '<input id="filterHeadman" placeholder="Headman" style="min-width:70px;">' +
      '<input id="filterBookId" placeholder="Book ID" style="min-width:70px;">' +
      '<input id="filterSearch" placeholder="Search profile…">' +
      '<button id="filterClear" style="padding:6px 12px;border-radius:8px;border:1px solid var(--accent);background:none;color:var(--accent);font-size:0.72rem;cursor:pointer;font-weight:600;">✕ Clear</button>';

    var searchInput = $('instSearch');
    var filterProvince = $('filterProvince');
    var filterTotem = $('filterTotem');
    var filterGender = $('filterGender');
    var filterStatus = $('filterStatus');
    var filterSearch = $('filterSearch');
    var filterAgeBand = $('filterAgeBand');
    var filterLanguage = $('filterLanguage');
    var filterWard = $('filterWard');
    var filterChief = $('filterChief');
    var filterHeadman = $('filterHeadman');
    var filterBookId = $('filterBookId');

    function renderProfileList(){
      var list = $('instTotemList');
      if (!list) return;
      list.innerHTML = '';
      var filtered = PEOPLE.slice();
      var prov = filterProvince ? filterProvince.value : '';
      var tot = filterTotem ? filterTotem.value : '';
      var gen = filterGender ? filterGender.value : '';
      var sts = filterStatus ? filterStatus.value : '';
      var q = (searchInput ? searchInput.value : '').toLowerCase();
      if (prov) filtered = filtered.filter(function(p){ return (p.admin && p.admin.province === prov) || (p.location && p.location.indexOf(prov) !== -1); });
      if (tot) filtered = filtered.filter(function(p){ var k = p.kinship || {}; return k.mutupo && k.mutupo.toLowerCase().indexOf(tot.toLowerCase()) !== -1; });
      if (gen) filtered = filtered.filter(function(p){ return p.gender === gen; });
      if (sts === 'alive') filtered = filtered.filter(function(p){ return !p.died; });
      if (sts === 'deceased') filtered = filtered.filter(function(p){ return p.died; });
      if (q) filtered = filtered.filter(function(p){ return p.name.toLowerCase().indexOf(q) !== -1 || (p.kinship && p.kinship.mutupo && p.kinship.mutupo.toLowerCase().indexOf(q) !== -1) || (p.kinship && p.kinship.chidawo && p.kinship.chidawo.toLowerCase().indexOf(q) !== -1); });

      var ageBand = filterAgeBand ? filterAgeBand.value : '';
      var lang = filterLanguage ? filterLanguage.value : '';
      var ward = filterWard ? filterWard.value.toLowerCase() : '';
      var chief = filterChief ? filterChief.value.toLowerCase() : '';
      var headman = filterHeadman ? filterHeadman.value.toLowerCase() : '';
      var bookId = filterBookId ? filterBookId.value.toLowerCase() : '';
      var currentYear = new Date().getFullYear();
      if (lang) filtered = filtered.filter(function(p){ var e = p.ethnicity || {}; return e.specificGroup === lang || e.languageCluster === lang; });
      if (ward) filtered = filtered.filter(function(p){ var a = p.admin || {}; return a.ward && a.ward.toLowerCase().indexOf(ward) !== -1; });
      if (chief) filtered = filtered.filter(function(p){ var a = p.admin || {}; return a.chief && a.chief.toLowerCase().indexOf(chief) !== -1; });
      if (headman) filtered = filtered.filter(function(p){ var a = p.admin || {}; return a.headman && a.headman.toLowerCase().indexOf(headman) !== -1; });
      if (bookId) filtered = filtered.filter(function(p){ var a = p.admin || {}; return a.villageBookId && a.villageBookId.toLowerCase().indexOf(bookId) !== -1; });
      if (ageBand) filtered = filtered.filter(function(p){
        var age = parseInt(p.born, 10); if (isNaN(age)) return false;
        var years = currentYear - age;
        if (ageBand === '0-17') return years >= 0 && years <= 17;
        if (ageBand === '18-35') return years >= 18 && years <= 35;
        if (ageBand === '36-60') return years >= 36 && years <= 60;
        if (ageBand === '60+') return years >= 60;
        return true;
      });

      if (!filtered.length) { list.innerHTML = '<div class="emptyState" style="color:var(--text-dim)">No profiles match your filters.</div>'; return; }
      filtered.forEach(function(p){
        var k = p.kinship || {};
        var totemStr = k.mutupo ? k.mutupo + (k.chidawo ? ' · ' + k.chidawo : '') : '';
        var div = document.createElement('div');
        div.className = 'inst-totem-item';
        div.innerHTML = '<div class="inst-totem-name">' + p.name + ' <span style="font-weight:400;font-size:0.72rem;color:var(--text-dim);">' + (p.relation||'') + '</span></div>' +
          '<div class="inst-totem-praises">' + (totemStr || '—') + (p.location ? ' · ' + p.location : '') + (p.born ? ' · b.' + p.born : '') + (p.died ? ' · d.' + p.died : '') + '</div>';
        div.addEventListener('click', function(){ openProfile(p.id); });
        list.appendChild(div);
      });
    }

    function renderTotemList(){
      var list = $('instTotemList');
      if (!list) return;
      list.innerHTML = '';
      var keys = Object.keys(totemRegistry);
      var q = (searchInput ? searchInput.value : '').toLowerCase();
      if (q) keys = keys.filter(function(k){ return k.toLowerCase().includes(q); });
      keys.forEach(function(key){
        var entry = totemRegistry[key];
        var praises = (entry.zvidawo||entry.izithakazelo||[]).join(', ');
        var div = document.createElement('div');
        div.className = 'inst-totem-item';
        div.innerHTML = '<div class="inst-totem-name">' + key + '</div><div class="inst-totem-praises">' + (praises || '—') + ' · ' + entry.system + '</div>';
        div.addEventListener('click', function(){
          showToast(entry.greeting || entry.proverb || 'Tap to learn more');
        });
        list.appendChild(div);
      });
      if(!keys.length) { list.innerHTML = '<div class="emptyState" style="color:var(--text-dim)">No totems match your search.</div>'; }
    }

    // Toggle between views
    renderProfileList();
    $('instAuditor').style.display = 'none';
    $('instDispute').style.display = 'none';

    var searchTimer;
    document.querySelectorAll('.inst-view-toggle').forEach(function(b){
      b.addEventListener('click', function(){
        document.querySelectorAll('.inst-view-toggle').forEach(function(t){ t.classList.remove('active'); });
        b.classList.add('active');
        var viewMode = b.dataset.view;
        $('instTotemList').style.display = 'none';
        $('instFilters').style.display = 'none';
        $('instSearch').style.display = 'none';
        $('instAuditor').style.display = 'none';
        $('instDispute').style.display = 'none';
        $('instExportRow').style.display = 'none';
        if (viewMode === 'totems') {
          $('instTotemList').style.display = 'block';
          $('instSearch').style.display = 'flex';
          renderTotemList();
        } else if (viewMode === 'auditor') {
          $('instAuditor').style.display = 'block';
          renderLineageAuditor();
        } else if (viewMode === 'dispute') {
          $('instDispute').style.display = 'block';
          renderDisputeQueue();
        } else {
          $('instTotemList').style.display = 'block';
          $('instFilters').style.display = 'flex';
          $('instSearch').style.display = 'flex';
          $('instExportRow').style.display = 'flex';
          renderProfileList();
        }
      });
    });

    function updateFilterIndicators(){
      [filterProvince, filterTotem, filterGender, filterStatus, filterAgeBand, filterLanguage].forEach(function(el){
        if (!el) return;
        el.style.borderColor = el.value ? 'var(--accent)' : 'var(--card-border)';
      });
      [filterWard, filterChief, filterHeadman, filterBookId, filterSearch].forEach(function(el){
        if (!el) return;
        el.style.borderColor = el.value ? 'var(--accent)' : 'var(--card-border)';
      });
    }

    function refreshList(){
      updateFilterIndicators();
      var currentView = document.querySelector('.inst-view-toggle.active');
      var viewMode = currentView ? currentView.dataset.view : 'profiles';
      if (viewMode === 'totems') renderTotemList();
      else if (viewMode === 'auditor') renderLineageAuditor();
      else if (viewMode === 'dispute') renderDisputeQueue();
      else renderProfileList();
    }

    var filterClearBtn = $('filterClear');
    if (filterClearBtn) {
      filterClearBtn.addEventListener('click', function(){
        [filterProvince, filterTotem, filterGender, filterStatus, filterAgeBand, filterLanguage].forEach(function(el){ if (el) el.value = ''; });
        [filterWard, filterChief, filterHeadman, filterBookId, filterSearch].forEach(function(el){ if (el) el.value = ''; });
        if (searchInput) searchInput.value = '';
        refreshList();
      });
    }

    searchInput.addEventListener('input', function(){
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refreshList, 200);
    });
    filterProvince.addEventListener('change', refreshList);
    filterTotem.addEventListener('change', refreshList);
    filterGender.addEventListener('change', refreshList);
    filterStatus.addEventListener('change', refreshList);
    filterAgeBand.addEventListener('change', refreshList);
    filterLanguage.addEventListener('change', refreshList);
    filterSearch.addEventListener('input', function(){
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refreshList, 200);
    });
    filterWard.addEventListener('input', function(){
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refreshList, 200);
    });
    filterChief.addEventListener('input', function(){
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refreshList, 200);
    });
    filterHeadman.addEventListener('input', function(){
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refreshList, 200);
    });
    filterBookId.addEventListener('input', function(){
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refreshList, 200);
    });

    function renderLineageAuditor(){
      var container = $('instAuditor');
      container.innerHTML =
        '<h4 style="margin:0 0 10px;">🔍 Lineage Auditor</h4>' +
        '<div class="inst-auditor-fields" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' +
          '<input id="audName" placeholder="Name" style="flex:1;min-width:100px;padding:8px;border-radius:6px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.8rem;">' +
          '<select id="audProvince" style="padding:8px;border-radius:6px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.8rem;"><option value="">Province</option>' + provinces.map(function(p){return '<option>' + p + '</option>';}).join('') + '</select>' +
          '<select id="audTotem" style="padding:8px;border-radius:6px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.8rem;"><option value="">Totem</option>' + Object.keys(totemRegistry).map(function(t){return '<option>' + t.split('(')[0].trim() + '</option>';}).join('') + '</select>' +
          '<select id="audGender" style="padding:8px;border-radius:6px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.8rem;"><option value="">Gender</option><option value="m">Male</option><option value="f">Female</option></select>' +
          '<select id="audStatus" style="padding:8px;border-radius:6px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.8rem;"><option value="">Status</option><option value="alive">Alive</option><option value="deceased">Deceased</option></select>' +
          '<select id="audLanguage" style="padding:8px;border-radius:6px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.8rem;"><option value="">Language</option>' + all16Languages.map(function(l){return '<option>' + l + '</option>';}).join('') + '</select>' +
          '<button id="audSearchBtn" class="btn-sm" style="background:var(--accent);color:var(--text);font-weight:700;">Search</button>' +
        '</div>' +
        '<div id="audResults"></div>';
      var btn = $('audSearchBtn');
      if (btn) {
        btn.addEventListener('click', function(){
          var results = PEOPLE.filter(function(p){
            var name = ($('audName')?$('audName').value:'').toLowerCase();
            var prov = ($('audProvince')?$('audProvince').value:'');
            var tot = ($('audTotem')?$('audTotem').value:'');
            var gen = ($('audGender')?$('audGender').value:'');
            var sts = ($('audStatus')?$('audStatus').value:'');
            var lang = ($('audLanguage')?$('audLanguage').value:'');
            if (name && p.name.toLowerCase().indexOf(name) === -1) return false;
            if (prov && (p.admin||{}).province !== prov) return false;
            if (tot) { var k = p.kinship||{}; if (!k.mutupo || k.mutupo.toLowerCase().indexOf(tot.toLowerCase()) === -1) return false; }
            if (gen && p.gender !== gen) return false;
            if (sts === 'alive' && p.died) return false;
            if (sts === 'deceased' && !p.died) return false;
            if (lang) { var e = p.ethnicity||{}; if (e.specificGroup !== lang && e.languageCluster !== lang) return false; }
            return true;
          });
          var resDiv = $('audResults');
          if (!results.length) { resDiv.innerHTML = '<div class="emptyState">No matching records.</div>'; return; }
          resDiv.innerHTML = '<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px;">' + results.length + ' record(s) found</div>';
          results.forEach(function(p){
            var div = document.createElement('div');
            div.className = 'inst-totem-item';
            div.innerHTML = '<div class="inst-totem-name">' + p.name + ' <span style="font-weight:400;font-size:0.72rem;color:var(--text-dim);">' + (p.relation||'') + '</span></div>' +
              '<div class="inst-totem-praises">' + ((p.kinship||{}).mutupo||'—') + (p.location ? ' · ' + p.location : '') + (p.born ? ' · b.' + p.born : '') + (p.died ? ' · d.' + p.died : '') + '</div>';
            div.addEventListener('click', function(){ openProfile(p.id); });
            resDiv.appendChild(div);
          });
        });
      }
    }

    function renderDisputeQueue(){
      var container = $('instDispute');
      var disputed = PEOPLE.filter(function(p){ return p.sync && p.sync._disputed; });
      container.innerHTML =
        '<h4 style="margin:0 0 10px;">⚖️ Dispute Queue</h4>' +
        '<div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:10px;">Records flagged as DISPUTED by sync conflict resolver require manual review by family elders or traditional council administrators.</div>';
      if (!disputed.length) {
        container.innerHTML += '<div class="emptyState" style="color:var(--lime);">✅ No disputed records. All sync resolutions are clean.</div>';
        return;
      }
      disputed.forEach(function(p){
        var div = document.createElement('div');
        div.className = 'inst-totem-item';
        div.style.borderLeft = '3px solid var(--accent)';
        div.innerHTML = '<div class="inst-totem-name">⚠️ ' + p.name + ' <span style="font-weight:400;font-size:0.72rem;color:var(--accent);">DISPUTED</span></div>' +
          '<div class="inst-totem-praises">Version seq: ' + ((p.sync||{}).versionSequence||0) + ' · Last mutated: ' + ((p.sync||{}).lastMutatedByDevice||'local') + '</div>';
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
        var viewBtn = document.createElement('button');
        viewBtn.textContent = '👤 View';
        viewBtn.className = 'btn-sm';
        viewBtn.style.cssText = 'flex:1;padding:6px;border-radius:6px;border:1px solid var(--card-border);background:var(--bg);color:var(--text);font-size:0.72rem;cursor:pointer;';
        viewBtn.addEventListener('click', function(e){ e.stopPropagation(); openProfile(p.id); });
        var resolveBtn = document.createElement('button');
        resolveBtn.textContent = '✅ Resolve';
        resolveBtn.className = 'btn-sm';
        resolveBtn.style.cssText = 'flex:1;padding:6px;border-radius:6px;border:1px solid var(--lime);background:var(--bg-alt);color:var(--lime);font-size:0.72rem;cursor:pointer;font-weight:700;';
        resolveBtn.addEventListener('click', function(e){
          e.stopPropagation();
          p.sync._disputed = false;
          showToast('✅ Dispute resolved for ' + p.name);
          renderDisputeQueue();
        });
        row.appendChild(viewBtn);
        row.appendChild(resolveBtn);
        div.appendChild(row);
        container.appendChild(div);
      });
    }

    // Export with format options
    $('instExport').addEventListener('click', function(){
      var format = $('instExportFormat') ? $('instExportFormat').value : 'json';
      var fmtLabel = format.toUpperCase();
      if (format === 'csv') {
        var headers = ['id','name','gender','born','died','relation','location','mutupo','chidawo','province','language'];
        var rows = PEOPLE.map(function(p){
          return [p.id, p.name, p.gender, p.born, p.died, p.relation, p.location, (p.kinship||{}).mutupo||'', (p.kinship||{}).chidawo||'', (p.admin||{}).province||'', ((p.ethnicity||{}).specificGroup||'')];
        });
        var csv = headers.join(',') + '\n' + rows.map(function(r){ return r.map(function(v){ return '"' + String(v).replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
        var blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'roots_export_' + new Date().toISOString().slice(0,10) + '.csv'; a.click();
        URL.revokeObjectURL(url);
        showToast('Exported CSV: ' + PEOPLE.length + ' records');
      } else if (format === 'ead3') {
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ead xmlns="urn:isbn:1-931666-22-9">\n <eadheader>\n  <eadid>ZW-ROOTS-' + new Date().toISOString().slice(0,10) + '</eadid>\n  <filedesc><titlestmt><titleproper>Roots Zimbabwe Genealogy Export</titleproper></titlestmt></filedesc>\n </eadheader>\n <archdesc level="fonds">\n  <did><unittitle>Chitate/Kepekepe Genealogical Records</unittitle></did>\n';
        PEOPLE.forEach(function(p){
          xml += '  <c level="item"><did><unittitle>' + escapeXml(p.name) + '</unittitle></did>';
          if (p.born) xml += '<unitdate type="birth">' + p.born + '</unitdate>';
          if (p.died) xml += '<unitdate type="death">' + p.died + '</unitdate>';
          if ((p.kinship||{}).mutupo) xml += '<controlaccess><persname role="mutupo">' + escapeXml(p.kinship.mutupo) + '</persname></controlaccess>';
          xml += '</c>\n';
        });
        xml += ' </archdesc>\n</ead>';
        var blob = new Blob([xml], {type:'application/xml'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'roots_export_' + new Date().toISOString().slice(0,10) + '.xml'; a.click();
        URL.revokeObjectURL(url);
        showToast('Exported EAD3 XML: ' + PEOPLE.length + ' records');
      } else {
        var data = JSON.stringify({
          exportedAt: new Date().toISOString(),
          format: 'ROOTS_Cultural_Data_Structure_v1',
          totalProfiles: peopleCount,
          totalTotems: totemCount,
          provinces: provinces,
          totemRegistry: totemRegistry,
          persons: PEOPLE.map(function(p){ return { id: p.id, name: p.name, gender: p.gender, born: p.born, died: p.died, relation: p.relation, location: p.location, mutupo: (p.kinship||{}).mutupo, chidawo: (p.kinship||{}).chidawo }; })
        }, null, 2);
        var blob = new Blob([data], {type:'application/json'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'roots_export_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
        URL.revokeObjectURL(url);
        showToast('Exported JSON: ' + peopleCount + ' profiles');
      }
    });
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
  /* ============================================================
     CHIEFTAINSHIP SUCCESSION (institutional)
     ============================================================ */
  function renderSuccessionSimulator(){
    var container = $('instTotemList');
    var sect = document.createElement('div');
    sect.className = 'death-section';
    sect.innerHTML = '<h4 style="margin-top:16px;">👑 Chieftainship Succession Simulator</h4>';

    var chiefSelect = document.createElement('select');
    chiefSelect.className = 'modal-input';
    chiefSelect.innerHTML = '<option value="">— Select a clan chief —</option>';
    PEOPLE.forEach(function(p){
      if (p.kinship && p.kinship.mutupo && (p.relation||'').toLowerCase().indexOf('chief') !== -1) {
        chiefSelect.innerHTML += '<option value="' + p.id + '">' + p.name + ' (' + p.kinship.mutupo + ')</option>';
      }
    });
    // Also add people who might have chieftainship relation
    sect.appendChild(chiefSelect);

    var resultDiv = document.createElement('div');
    resultDiv.style.marginTop = '10px';
    sect.appendChild(resultDiv);

    chiefSelect.addEventListener('change', function(){
      var cid = chiefSelect.value;
      if (!cid) { resultDiv.innerHTML = ''; return; }
      var chief = byId[cid];
      if (!chief) return;
      var candidates = [];
      // Find potential successors: same totem, male, alive
      PEOPLE.forEach(function(p){
        if (p.id === cid) return;
        if (p.gender !== 'm') return;
        if (p.lifecycleState === 'DECEASED_FROZEN' || p.died) return;
        if (p.kinship && p.kinship.mutupo && p.kinship.mutupo === chief.kinship.mutupo) {
          candidates.push(p);
        }
      });
      var result = computeNextInLine(candidates);
      if (result.candidate) {
        var flags = result.disqualifications.length ? '⚠️ ' + result.disqualifications.join(', ') : '✅ No disqualifications';
        resultDiv.innerHTML = '<div class="summaryCard"><strong style="font-size:1rem;">Next in Line:</strong> ' + result.candidate.name + '<br><span style="font-size:0.8rem;color:var(--text-dim);">' + flags + '</span></div>';
      } else {
        resultDiv.innerHTML = '<div class="summaryCard" style="color:var(--accent);">' + result.disqualifications.join(', ') + '</div>';
      }
    });

    container.appendChild(sect);
  }

  // Patch renderInstitutional to add succession simulator
  var _origRenderInstitutional = renderInstitutional;
  renderInstitutional = function(){
    _origRenderInstitutional();
    renderSuccessionSimulator();
  };

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
      showScreen('regular');
    } else if (role === 'institutional') {
      showScreen('institutional');
    } else {
      showScreen('welcome');
    }
  })();

})();
