/* ============================================================
   ROOTS — MAIN APPLICATION ENGINE
   State machine routing + all view renderers + tree engine
   ============================================================ */
(function(){
  'use strict';

  /* ---------- STATE ---------- */
  var state = {
    screen: 'welcome',
    activeView: 'timeline',      // regular user tab
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
      var save = {};
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
  function verifyEcoCashCode(code){
    // Simple validation: code must be non-empty, 8+ chars
    if (!code || code.trim().length < 8) return false;
    var normalized = code.trim().toUpperCase();
    // Check duplicates
    if (state.ecocashCodes.indexOf(normalized) !== -1) return false;
    state.ecocashCodes.push(normalized);
    return true;
  }

  /* ---------- DOM REFS ---------- */
  var $ = function(id){ return document.getElementById(id); };
  var welcomeScreen = $('welcome-screen');
  var regularApp = $('regular-app');
  var instApp = $('institutional-app');
  var topbarTitle = $('topbarTitle');
  var tcCanvas, tcSvg, tcRailEl, tcViewport;
  var overlay = $('profilePanelOverlay');
  var panel = $('profilePanel');
  var panelThumb = $('panelThumb');
  var panelThumbInner = $('panelThumbInner');
  var panelName = $('panelName');
  var panelMeta = $('panelMeta');
  var fileInput = $('hiddenFileInput');
  var toast = $('toast');
  var settingsOverlay = $('settingsOverlay');
  var settingsPanel = $('settingsPanel');
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
      state.activeView = 'timeline';
      switchView('timeline');
      renderTree();
      renderMyProfile();
      renderGroups();
      renderTimeline();
    }
    if (id === 'institutional') {
      renderInstitutional();
    }
  }

  $('btnRegular').addEventListener('click', function(){ showScreen('regular'); });
  $('btnInstitutional').addEventListener('click', function(){ showScreen('institutional'); });
  $('topbarBack').addEventListener('click', function(){ showScreen('welcome'); });
  $('instBack').addEventListener('click', function(){ showScreen('welcome'); });

  /* ---------- TAB SWITCHING (regular user) ---------- */
  var navItems = document.querySelectorAll('.nav-item');
  var views = {
    timeline: $('timeline-view'),
    tree: $('tree-view'),
    library: $('library-view'),
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
    var titles = { timeline:'Timeline', tree:'Family Tree', library:'Library', groups:'Groups', profile:'Profile' };
    topbarTitle.textContent = titles[id] || 'Roots';
    if (id === 'tree') {
      requestAnimationFrame(function(){ renderTree(); });
    }
    if (id === 'library') {
      renderLibraryTab('totems');
    }
  }

  navItems.forEach(function(n){
    n.addEventListener('click', function(){ switchView(n.dataset.view); });
  });

  var goGroupsBtn = $('goGroupsBtn');
  if (goGroupsBtn) goGroupsBtn.addEventListener('click', function(){ switchView('groups'); });

  /* ============================================================
     TIMELINE VIEW — Instagram Style
     ============================================================ */
  var storyColors = ['#e1306c','#f77737','#fcaf45','#c13584','#833ab4','#fd1d1d','#405de6'];

  var igNotifBtn = $('igNotifBtn');
  if (igNotifBtn) igNotifBtn.addEventListener('click', function(){
    showToast('🔔 No new notifications yet');
  });

  function renderStories(){
    var container = $('igStories');
    if(!container) return;
    container.innerHTML = '';
    var me = byId[state.myId];
    var myInitials = me ? getInitials(me.name) : '?';
    var addDiv = document.createElement('div');
    addDiv.className = 'ig-story add-story';
    addDiv.innerHTML = '<div class="ig-story-avatar"><span class="ig-add-icon">+</span></div><div class="ig-story-name">Your story</div>';
    addDiv.addEventListener('click', function(){
      openNewPostModal();
    });
    container.appendChild(addDiv);
    var family = PEOPLE.filter(function(p){ return p.id !== state.myId; }).slice(0, 12);
    family.forEach(function(p, i){
      var div = document.createElement('div');
      div.className = 'ig-story';
      var color = storyColors[i % storyColors.length];
      var init = getInitials(p.name);
      var img = state.images && state.images[p.id];
      var avatarContent = img ? '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : init;
      div.innerHTML = '<div class="ig-story-avatar" style="background:' + color + ';">' + avatarContent + '</div><div class="ig-story-name">' + p.name.split(' ')[0] + '</div>';
      container.appendChild(div);
    });
  }

  function renderTimeline(){
    var feed = $('timelineFeed');
    feed.innerHTML = '';
    renderStories();
    var visiblePosts = state.posts.filter(function(post){
      return isVisibleForScope(post.visibilityScope || 'SIBLINGS', state.myId, post.authorId, byId);
    });
    if(visiblePosts.length === 0){
      feed.innerHTML = '<div class="timeline-empty">No posts yet.<br>Tap + to share a family photo.</div>';
      return;
    }
    visiblePosts.slice().reverse().forEach(function(post, idx){
      var author = byId[post.authorId];
      var authorName = author ? author.name : 'Unknown';
      var color = storyColors[(authorName.charCodeAt(0) || 0) % storyColors.length];
      var init = author ? getInitials(author.name) : '?';
      var img = state.images && state.images[post.authorId];
      var avatarContent = img ? '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : init;
      var liked = post._liked ? ' liked' : '';
      var likeCount = post._likes || 0;
      var div = document.createElement('div');
      div.className = 'ig-post';
      div.innerHTML =
        '<div class="ig-post-header">' +
          '<div class="ig-post-avatar" style="background:' + color + ';">' + avatarContent + '</div>' +
          '<span class="ig-post-author">' + authorName + '</span>' +
          '<span class="ig-post-more">⋯</span>' +
        '</div>' +
        '<div class="ig-post-img">' + (post.imageRef ? '<img src="' + sanitizeImageSrc(post.imageRef) + '" alt="">' : '📸') + '</div>' +
        '<div class="ig-post-actions">' +
          '<button class="ig-action-btn' + liked + '" data-action="like" data-idx="' + idx + '">♥</button>' +
          '<button class="ig-action-btn" data-action="comment">💬</button>' +
          '<button class="ig-action-btn" data-action="share">↗</button>' +
        '</div>' +
        (likeCount > 0 ? '<div class="ig-post-likes">' + likeCount + ' like' + (likeCount > 1 ? 's' : '') + '</div>' : '') +
        (post.caption ? '<div class="ig-post-caption"><strong>' + authorName.split(' ')[0] + '</strong> ' + escapeHtml(post.caption) + '</div>' : '') +
        '<div class="ig-post-time">' + (post.createdAt || '') + '</div>';
      div.querySelector('[data-action="like"]').addEventListener('click', function(){
        post._liked = !post._liked;
        post._likes = (post._likes || 0) + (post._liked ? 1 : -1);
        if(post._likes < 0) post._likes = 0;
        renderTimeline();
      });
      feed.appendChild(div);
    });
  }

  function openNewPostModal(){
    openModal('New Post',
      '<label class="setting-label" style="margin-bottom:8px;display:block;">Select photo</label>' +
      '<button class="modal-btn" id="modalPickPhoto">📷 Choose Photo</button>' +
      '<div style="margin:10px 0;"><img id="modalPreview" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;display:none;background:var(--bg-alt);"></div>' +
      '<input class="modal-input" id="modalCaption" placeholder="Write a caption…" style="margin-top:6px;">' +
      '<label class="setting-label" style="margin:8px 0 4px;display:block;">Visibility</label>' +
      '<select class="modal-input" id="modalVisibility">' +
        '<option value="SIBLINGS">Siblings</option>' +
        '<option value="FIRST_COUSINS">1st Cousins</option>' +
        '<option value="SECOND_COUSINS">2nd Cousins</option>' +
        '<option value="PUBLIC_CONNECTED">Public (Connected)</option>' +
      '</select>' +
      '<button class="modal-btn" id="modalPostBtn">Post to Timeline</button>',
      function(){ closeModal(); }
    );
    var previewImg = $('modalPreview');
    $('modalPickPhoto').addEventListener('click', function(){
      var cb = function(dataUrl){
        previewImg.src = dataUrl;
        previewImg.style.display = 'block';
        previewImg.dataset.ref = dataUrl;
      };
      triggerImageUpload(cb);
    });
    $('modalPostBtn').addEventListener('click', function(){
      var imgRef = previewImg.dataset.ref || '';
      if (!imgRef) { showToast('Please select a photo first.'); return; }
      state.posts.push({
        id: 'post' + (state.postIdCounter++),
        authorId: state.myId,
        imageRef: imgRef,
        caption: ($('modalCaption')||{}).value || '',
        createdAt: new Date().toLocaleDateString(),
        visibilityScope: ($('modalVisibility')||{}).value || 'SIBLINGS'
      });
      closeModal();
      renderTimeline();
      persistState();
      showToast('Post shared with family!');
    });
  }
  var _newPostBtn = $('newPostBtn');
  if (_newPostBtn) _newPostBtn.addEventListener('click', openNewPostModal);

  /* ============================================================
     TREE VIEW — Temporal Cascade Matrix Engine
     ============================================================ */
  function initials(name){
    return name.replace(/\(.*?\)/g,'').trim().split(/\s+/).slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
  }
  function getInitials(name){ return initials(name); }
  function childrenOf(id){ return PEOPLE.filter(function(p){ return (p.parentIds||[]).includes(id) && (p.parentIds[0]===id || !byId[p.parentIds[0]]); }); }
  function primaryChildrenOf(id){ return PEOPLE.filter(function(p){ return p.parentIds && p.parentIds[0] === id; }); }
  function spouseOf(p){ return p.spouseId ? byId[p.spouseId] : null; }
  function personLabelYears(p){
    if(p.born && p.died) return p.born + '\u2013' + p.died;
    if(p.born) return 'b. ' + p.born;
    if(p.died) return 'd. ' + p.died;
    return '';
  }

  function allPartnersOf(p){
    var ids = new Set();
    if(p.spouseId) ids.add(p.spouseId);
    primaryChildrenOf(p.id).forEach(function(kid){
      var secondParentId = kid.parentIds && kid.parentIds[1];
      if(secondParentId) ids.add(secondParentId);
    });
    var result = [];
    ids.forEach(function(id){ var pp = byId[id]; if(pp) result.push(pp); });
    return result;
  }

  /* ---------- TCM3 REFERENCE TABLES ---------- */
  var TCM3_MALE_SVG = '<svg class="silhouette" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="34" r="20"/><path d="M50 58c-24 0-38 14-38 34v8h76v-8c0-20-14-34-38-34z"/></svg>';
  var TCM3_FEMALE_SVG = '<svg class="silhouette" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="32" r="19"/><path d="M50 53c-4 6-4 10-2 14l-14 6c-14 6-20 16-20 27v0h72v0c0-11-6-21-20-27l-14-6c2-4 2-8-2-14z"/></svg>';

  var TCM3_MARITAL_STATUSES = ['Single','Married','Divorced/Severed','Widowed','Cohabiting'];
  var TCM3_MARRIAGE_TYPES = ['Civil Marriage','Customary Union','Cohabiting / Unregistered','Severed / Divorced'];
  var TCM3_ROORA_STATUSES = ['Paid','Partial','Pending','Not Applicable'];
  var TCM3_PROVINCES = ['Harare','Bulawayo','Manicaland','Mashonaland Central','Mashonaland East','Mashonaland West','Masvingo','Matabeleland North','Matabeleland South','Midlands'];
  var TCM3_STATUS_TO_CSS = {
    'Civil Marriage':'status-civil',
    'Customary Union':'status-customary',
    'Cohabiting / Unregistered':'status-cohabit',
    'Severed / Divorced':'status-severed',
  };
  var TCM3_COL_W = 168;
  var TCM3_ROW_H = 180;

  /* ---------- TCM3 STATE ---------- */
  var tcPeople = {};
  var tcLayout = {};
  var tcCurrentEgo = 'you';
  var tcZoomLevel = 1;
  var tcVisible = {};
  var tcChildrenRevealed = {};
  var tcSearchTerm = '';
  var tcNodeEls = {};
  var tcActivePopover = null;
  var tcProfileTargetId = null;
  var tcProfileEditMode = false;
  var tcSelectModalCtx = null;

  /* ---------- TCM3 DATA ADAPTER ---------- */
  function tcAdaptPeopleData(){
    tcPeople = {};
    PEOPLE.forEach(function(p){
      var spouses = [];
      if(p.spouseId) spouses.push(p.spouseId);
      PEOPLE.forEach(function(q){
        if(q.parentIds && q.parentIds[1] === p.id && q.parentIds[0] !== p.id){
          var secondOfFirst = q.parentIds[0];
          var sp = byId[secondOfFirst];
          if(sp && sp.spouseId === p.id && !spouses.includes(secondOfFirst)){
            spouses.push(secondOfFirst);
          }
        }
      });

      var tc = {
        id: p.id, name: p.name, surname: '', born: p.born || 0,
        deceased: !!p.died, date_of_passing: p.died ? String(p.died) : '',
        gender: p.gender || 'm', image: state.images[p.id] || null,
        parents: (p.parentIds || []).slice(),
        children: [], spouses: spouses,
        spouseStatus: {}, branch: null,
        relationship_type: 'Bloodline',
        mutupo: p.mutupo || '', chidawo: p.chidawo || '',
        language_cluster: p.ethnicity || '',
        province: p.location || '',
        notes: (state.notes && state.notes[p.id]) || '',
        marital_status: '', marriage_type: '', marriage_date: '',
        residential_address: p.location || '',
        occupation: p.profession || '',
      };
      tcPeople[p.id] = tc;
    });

    Object.keys(tcPeople).forEach(function(id){
      var p = tcPeople[id];
      p.parents.forEach(function(pid){
        if(tcPeople[pid]) tcPeople[pid].children.push(id);
      });
      if(p.spouses.length){
        p.spouses.forEach(function(spId){
          if(tcPeople[spId]){
            if(!tcPeople[spId].spouses.includes(id)) tcPeople[spId].spouses.push(id);
          }
        });
      }
    });

    var egoId = tcCurrentEgo || 'you';
    var branchIdx = 0;
    var branchLetters = ['a','b','c','d','e','f','g','h'];
    Object.keys(tcPeople).forEach(function(id){
      var p = tcPeople[id];
      if(p.id === egoId){ p.relationship_type = 'Bloodline'; return; }
      var inBloodline = false;
      var cur = p;
      var guard = new Set();
      while(cur && !guard.has(cur.id)){
        guard.add(cur.id);
        if(cur.id === egoId){ inBloodline = true; break; }
        if(cur.parents.length && tcPeople[cur.parents[0]]){
          cur = tcPeople[cur.parents[0]];
        } else { break; }
      }
      p.relationship_type = inBloodline ? 'Bloodline' : 'Married In';
    });

    var wifeIdx = 0;
    var ego = tcPeople[egoId];
    if(ego){
      var seenBranches = {};
      ego.spouses.forEach(function(spId){
        var sp = tcPeople[spId];
        if(!sp) return;
        var letter = branchLetters[wifeIdx % branchLetters.length];
        wifeIdx++;
        sp.branch = letter;
        sp.children.forEach(function(cid){
          if(tcPeople[cid]) tcPeople[cid].branch = letter;
        });
        var statusMap = {};
        statusMap[spId] = 'Customary Union';
        sp.spouseStatus = statusMap;
        var egoStatus = {};
        egoStatus[egoId] = 'Customary Union';
        if(!ego.spouseStatus) ego.spouseStatus = {};
        ego.spouseStatus[spId] = 'Customary Union';
      });
    }

    Object.keys(tcPeople).forEach(function(id){
      var p = tcPeople[id];
      if(p.id === egoId) return;
      if(!p.spouses.length) return;
      p.spouses.forEach(function(spId){
        var sp = tcPeople[spId];
        if(!sp) return;
        if(!p.spouseStatus) p.spouseStatus = {};
        if(!p.spouseStatus[spId]) p.spouseStatus[spId] = 'Customary Union';
        if(!sp.spouseStatus) sp.spouseStatus = {};
        if(!sp.spouseStatus[id]) sp.spouseStatus[id] = 'Customary Union';
      });
    });
  }

  /* ---------- TCM3 AUTO-LAYOUT ---------- */
  function tcComputeGenerations(){
    var gen = {};
    var visited = {};
    function walk(id, depth){
      if(visited[id]) return;
      visited[id] = true;
      gen[id] = depth;
      var p = tcPeople[id];
      if(!p) return;
      (p.children || []).forEach(function(cid){ walk(cid, depth + 1); });
    }
    Object.keys(tcPeople).forEach(function(id){
      var p = tcPeople[id];
      if(!p.parents.length || !tcPeople[p.parents[0]]){
        walk(id, 0);
      }
    });
    Object.keys(tcPeople).forEach(function(id){
      if(!visited[id]) gen[id] = 1;
    });
    return gen;
  }

  function tcComputeLayout(){
    var generations = tcComputeGenerations();
    var genGroups = {};
    Object.keys(tcPeople).forEach(function(id){
      var g = generations[id] || 0;
      if(!genGroups[g]) genGroups[g] = [];
      genGroups[g].push(id);
    });

    var egoId = tcCurrentEgo || 'you';
    var egoGen = generations[egoId] || 0;
    var layout = {};
    var nextCol = 0;

    var sortedGens = Object.keys(genGroups).map(Number).sort(function(a,b){ return a - b; });

    sortedGens.forEach(function(g){
      var members = genGroups[g];
      members.sort(function(a,b){
        var pa = tcPeople[a], pb = tcPeople[b];
        var aBlood = pa.relationship_type === 'Bloodline' ? 0 : 1;
        var bBlood = pb.relationship_type === 'Bloodline' ? 0 : 1;
        if(aBlood !== bBlood) return aBlood - bBlood;
        return (pa.born || 0) - (pb.born || 0);
      });

      var egoInGen = members.indexOf(egoId);
      if(egoInGen > 0){
        members.splice(egoInGen, 1);
        members.unshift(egoId);
      }

      var genStartCol = nextCol;
      var placed = {};
      var wifeOffsets = {};

      members.forEach(function(id){
        if(placed[id]) return;
        var p = tcPeople[id];

        if(id === egoId){
          var col = genStartCol + Math.floor(members.length * 0.4);
          layout[id] = { col: col, row: g };
          placed[id] = true;

          (p.spouses || []).forEach(function(spId, i){
            if(!tcPeople[spId] || placed[spId]) return;
            var offset = (i + 1) * 1.3;
            wifeOffsets[spId] = offset;
            layout[spId] = { col: col + offset, row: g + 0.1 };
            placed[spId] = true;
          });
          return;
        }

        if(p.spouses && p.spouses.length && p.relationship_type === 'Bloodline'){
          var baseCol = genStartCol + Object.keys(placed).length * 1.8;
          layout[id] = { col: baseCol, row: g };
          placed[id] = true;

          p.spouses.forEach(function(spId, i){
            if(!tcPeople[spId] || placed[spId]) return;
            var offset = (i + 1) * 1.3;
            layout[spId] = { col: baseCol + offset, row: g + 0.1 };
            placed[spId] = true;
          });
        } else {
          var spCol = genStartCol + Object.keys(placed).length * 1.8;
          layout[id] = { col: spCol, row: g + 0.1 };
          placed[id] = true;
        }
      });

      var maxCol = 0;
      Object.values(layout).forEach(function(c){ if(c.col > maxCol) maxCol = c.col; });
      nextCol = maxCol + 2;
    });

    sortedGens.forEach(function(g){
      var members = genGroups[g];
      members.forEach(function(id){
        if(layout[id]) return;
        layout[id] = { col: nextCol, row: g };
        nextCol += 1.5;
      });
    });

    Object.keys(tcPeople).forEach(function(id){
      if(!layout[id]){
        layout[id] = { col: nextCol, row: 2 };
        nextCol += 1.5;
      }
    });

    tcLayout = layout;
  }

  function tcPx(coord){
    return { x: coord.col * TCM3_COL_W, y: coord.row * TCM3_ROW_H };
  }

  /* ---------- TCM3 VISIBILITY ENGINE ---------- */
  function tcIsVisible(id){ return !!tcVisible[id]; }

  function tcResetState(){
    tcVisible = {};
    tcChildrenRevealed = {};
    var egoId = tcCurrentEgo || 'you';
    tcVisible[egoId] = true;
    var ego = tcPeople[egoId];
    if(!ego) return;
    (ego.parents || []).forEach(function(pid){ tcVisible[pid] = true; });
    (ego.spouses || []).forEach(function(sid){
      tcVisible[sid] = true;
      tcChildrenRevealed[sid] = true;
      (tcPeople[sid].children || []).forEach(function(cid){ tcVisible[cid] = true; });
    });
    (ego.children || []).forEach(function(cid){ tcVisible[cid] = true; });
    tcGetSiblingsOf(egoId).forEach(function(sid){ tcVisible[sid] = true; });
  }

  function tcToggleCascade(id){
    tcClosePopover();
    var egoId = tcCurrentEgo || 'you';
    var ego = tcPeople[egoId];
    if(!ego) return;

    if(id === egoId){
      var anyVisible = (ego.spouses || []).some(function(s){ return tcVisible[s]; });
      if(anyVisible){
        (ego.spouses || []).forEach(function(s){
          tcVisible[s] = false;
          tcCollapseSpouseBranch(s);
        });
      } else {
        (ego.spouses || []).forEach(function(s){ tcVisible[s] = true; });
      }
    } else if((ego.spouses || []).includes(id)){
      if(tcChildrenRevealed[id]){
        tcChildrenRevealed[id] = false;
        (tcPeople[id].children || []).forEach(function(c){
          tcVisible[c] = false;
          tcCollapseChildBranch(c);
        });
      } else {
        tcChildrenRevealed[id] = true;
        (tcPeople[id].children || []).forEach(function(c){ tcVisible[c] = true; });
      }
    } else {
      var p = tcPeople[id];
      if(p && p.spouses && p.spouses.length){
        var anySp = p.spouses.some(function(s){ return tcVisible[s]; });
        if(anySp){
          p.spouses.forEach(function(s){
            tcVisible[s] = false;
            tcCollapseSpouseBranch(s);
          });
          (p.children || []).forEach(function(c){
            tcVisible[c] = false;
            tcCollapseChildBranch(c);
          });
        } else {
          p.spouses.forEach(function(s){ tcVisible[s] = true; });
          (p.children || []).forEach(function(c){ tcVisible[c] = true; });
        }
      } else if(p && p.children && p.children.length){
        var anyKids = p.children.some(function(c){ return tcVisible[c]; });
        if(anyKids){
          p.children.forEach(function(c){
            tcVisible[c] = false;
            tcCollapseChildBranch(c);
          });
        } else {
          p.children.forEach(function(c){ tcVisible[c] = true; });
        }
      }
    }
    tcRender();
  }

  function tcCollapseSpouseBranch(spouseId){
    tcChildrenRevealed[spouseId] = false;
    (tcPeople[spouseId].children || []).forEach(function(c){
      tcVisible[c] = false;
      tcCollapseChildBranch(c);
    });
  }
  function tcCollapseChildBranch(childId){
    var p = tcPeople[childId];
    if(!p) return;
    (p.spouses || []).forEach(function(s){ tcVisible[s] = false; });
    (p.children || []).forEach(function(c){ tcVisible[c] = false; });
  }

  function tcExpandAll(){
    Object.keys(tcPeople).forEach(function(id){ tcVisible[id] = true; });
    Object.keys(tcPeople).forEach(function(id){
      var p = tcPeople[id];
      if(p.spouses && p.spouses.length) tcChildrenRevealed[id] = true;
    });
  }

  /* ---------- TCM3 RELATIONSHIP CALCULATOR ---------- */
  function tcGetParentsOf(id){ return tcPeople[id] ? (tcPeople[id].parents || []) : []; }
  function tcGetChildrenOf(id){ return tcPeople[id] ? (tcPeople[id].children || []) : []; }
  function tcGetSpousesOf(id){ return tcPeople[id] ? (tcPeople[id].spouses || []) : []; }
  function tcGetSiblingsOf(id){
    var parents = tcGetParentsOf(id);
    if(!parents.length) return [];
    var sibSet = new Set();
    parents.forEach(function(p){ tcGetChildrenOf(p).forEach(function(c){ if(c !== id) sibSet.add(c); }); });
    return Array.from(sibSet);
  }

  function tcCalcRelation(egoId, targetId){
    if(egoId === targetId) return 'Self';
    var target = tcPeople[targetId];
    if(!target) return 'Relative';
    if(tcGetSpousesOf(egoId).includes(targetId)) return target.gender === 'f' ? 'Wife' : 'Husband';
    if(tcGetParentsOf(egoId).includes(targetId)) return target.gender === 'f' ? 'Mother' : 'Father';
    if(tcGetChildrenOf(egoId).includes(targetId)) return target.gender === 'f' ? 'Daughter' : 'Son';
    if(tcGetSiblingsOf(egoId).includes(targetId)) return target.gender === 'f' ? 'Sister' : 'Brother';
    var egoParents = tcGetParentsOf(egoId);
    for(var i = 0; i < egoParents.length; i++){
      if(tcGetParentsOf(egoParents[i]).includes(targetId)) return target.gender === 'f' ? 'Grandmother' : 'Grandfather';
    }
    var egoChildren = tcGetChildrenOf(egoId);
    for(var j = 0; j < egoChildren.length; j++){
      if(tcGetChildrenOf(egoChildren[j]).includes(targetId)) return target.gender === 'f' ? 'Granddaughter' : 'Grandson';
    }
    for(var k = 0; k < egoParents.length; k++){
      if(tcGetSiblingsOf(egoParents[k]).includes(targetId)) return target.gender === 'f' ? 'Aunt' : 'Uncle';
      var parentSibs = tcGetSiblingsOf(egoParents[k]);
      for(var l = 0; l < parentSibs.length; l++){
        if(tcGetSpousesOf(parentSibs[l]).includes(targetId)) return (target.gender === 'f' ? 'Aunt' : 'Uncle') + ' (by marriage)';
      }
    }
    var egoSibs = tcGetSiblingsOf(egoId);
    for(var m = 0; m < egoSibs.length; m++){
      if(tcGetChildrenOf(egoSibs[m]).includes(targetId)) return target.gender === 'f' ? 'Niece' : 'Nephew';
    }
    for(var n = 0; n < tcGetSpousesOf(egoId).length; n++){
      var sp = tcGetSpousesOf(egoId)[n];
      if(tcGetParentsOf(sp).includes(targetId)) return target.gender === 'f' ? 'Mother-in-law' : 'Father-in-law';
      if(tcGetSiblingsOf(sp).includes(targetId)) return target.gender === 'f' ? 'Sister-in-law' : 'Brother-in-law';
    }
    for(var o = 0; o < egoSibs.length; o++){
      if(tcGetSpousesOf(egoSibs[o]).includes(targetId)) return target.gender === 'f' ? 'Sister-in-law' : 'Brother-in-law';
    }
    for(var q = 0; q < egoChildren.length; q++){
      if(tcGetSpousesOf(egoChildren[q]).includes(targetId)) return target.gender === 'f' ? 'Daughter-in-law' : 'Son-in-law';
    }
    return 'Relative';
  }

  /* ---------- TCM3 RENDERING ---------- */
  var DECADES_TCM = ['1940s','1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s','2030s'];

  function tcBuildRail(){
    if(!tcRailEl) return;
    tcRailEl.innerHTML = '';
    DECADES_TCM.forEach(function(label, i){
      var tick = document.createElement('div');
      tick.className = 'decade-tick';
      tick.style.top = (i * TCM3_ROW_H) + 'px';
      tick.style.height = TCM3_ROW_H + 'px';
      tick.innerHTML = '<span>' + label + '</span>';
      tcRailEl.appendChild(tick);
    });
  }

  function tcPrimaryStatusClass(p){
    var statuses = Object.values(p.spouseStatus || {});
    for(var i = 0; i < statuses.length; i++){
      if(TCM3_STATUS_TO_CSS[statuses[i]]) return TCM3_STATUS_TO_CSS[statuses[i]];
    }
    return '';
  }

  function tcYearLabel(p){
    if(p.deceased && p.date_of_passing) return 'b.' + p.born + ' \u2013 d.' + p.date_of_passing;
    return 'b.' + p.born;
  }

  function tcRenderCardHTML(p){
    var genderClass = p.gender === 'f' ? 'gender-f' : 'gender-m';
    var statusClass = tcPrimaryStatusClass(p);
    var deceasedClass = p.deceased ? 'deceased' : '';
    var isSevered = Object.values(p.spouseStatus || {}).indexOf('Severed / Divorced') !== -1;
    var img = p.image ? '<img src="' + p.image + '" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">' : (p.gender === 'f' ? TCM3_FEMALE_SVG : TCM3_MALE_SVG);
    var severedTag = (isSevered && !p.deceased) ? '<div class="severed-tag">Severed</div>' : '';
    var deathTag = p.deceased ? '<div class="deceased-tag">Deceased</div>' : '';
    var egoBadge = p.id === tcCurrentEgo ? '<div class="ego-badge">Ego</div>' : '';
    return '<div class="card">' + egoBadge +
      '<div class="zone-image" data-role="cascade"><div class="thumb ' + genderClass + ' ' + statusClass + ' ' + deceasedClass + '">' + severedTag + img + deathTag + '</div></div>' +
      '<div class="zone-text" data-role="popover"><div class="name-row">' + p.name + '</div>' +
      '<div class="surname-row">' + (p.surname || '') + '</div>' +
      '<div class="year-row">' + tcYearLabel(p) + '</div>' +
      '<div class="tap-hint">tap for info</div></div></div>';
  }

  function tcAttachNodeHandlers(node, id){
    var cascadeZone = node.querySelector('[data-role="cascade"]');
    var popoverZone = node.querySelector('[data-role="popover"]');
    if(cascadeZone) cascadeZone.addEventListener('click', function(){ tcToggleCascade(id); });
    if(popoverZone) popoverZone.addEventListener('click', function(e){
      e.stopPropagation();
      tcShowPopover(id, popoverZone);
    });
  }

  function tcBuildNodes(){
    if(!tcCanvas) return;
    tcCanvas.innerHTML = '';
    tcCanvas.appendChild(tcSvg);
    tcNodeEls = {};

    Object.keys(tcPeople).forEach(function(id){
      var p = tcPeople[id];
      var coord = tcLayout[id];
      if(!coord) return;
      var pos = tcPx(coord);
      var node = document.createElement('div');
      node.className = 'person-node';
      node.style.left = pos.x + 'px';
      node.style.top = pos.y + 'px';
      node.dataset.id = id;
      node.innerHTML = tcRenderCardHTML(p);
      tcCanvas.appendChild(node);
      tcNodeEls[id] = node;
      tcAttachNodeHandlers(node, id);
    });

    var maxX = 0, maxY = 0;
    Object.values(tcLayout).forEach(function(c){
      var pos = tcPx(c);
      if(pos.x + 220 > maxX) maxX = pos.x + 220;
      if(pos.y + 210 > maxY) maxY = pos.y + 210;
    });
    tcCanvas.dataset.contentW = maxX;
    tcCanvas.dataset.contentH = maxY;
    tcCanvas.style.width = maxX + 'px';
    tcCanvas.style.height = maxY + 'px';
    tcSvg.setAttribute('width', maxX);
    tcSvg.setAttribute('height', maxY);
  }

  function tcUpdateNode(id){
    var node = tcNodeEls[id];
    if(!node) return;
    var p = tcPeople[id];
    node.innerHTML = tcRenderCardHTML(p);
    tcAttachNodeHandlers(node, id);
  }

  function tcRenderVisibility(){
    Object.keys(tcNodeEls).forEach(function(id){
      var node = tcNodeEls[id];
      node.classList.toggle('hidden-node', !tcIsVisible(id));
    });
    tcApplySearchDimming();
  }

  function tcApplySearchDimming(){
    var term = tcSearchTerm.trim().toLowerCase();
    Object.keys(tcNodeEls).forEach(function(id){
      var node = tcNodeEls[id];
      node.classList.remove('search-dim', 'search-match');
      if(!term) return;
      var p = tcPeople[id];
      var hay = (p.name + ' ' + (p.surname || '')).toLowerCase();
      node.classList.add(hay.indexOf(term) !== -1 ? 'search-match' : 'search-dim');
    });
  }

  /* ---------- TCM3 CONNECTOR LINES ---------- */
  function tcCenterTopOf(id){ var c = tcLayout[id]; if(!c) return {x:0,y:0}; var pos = tcPx(c); return {x:pos.x+74,y:pos.y}; }
  function tcCenterBottomOf(id){ var c = tcLayout[id]; if(!c) return {x:0,y:0}; var pos = tcPx(c); return {x:pos.x+74,y:pos.y+205}; }
  function tcCenterLeftOf(id){ var c = tcLayout[id]; if(!c) return {x:0,y:0}; var pos = tcPx(c); return {x:pos.x,y:pos.y+95}; }
  function tcCenterRightOf(id){ var c = tcLayout[id]; if(!c) return {x:0,y:0}; var pos = tcPx(c); return {x:pos.x+148,y:pos.y+95}; }

  function tcBothVisible(a,b){ return tcIsVisible(a) && tcIsVisible(b); }

  function tcBranchColorFor(id){
    var p = tcPeople[id];
    if(!p || !p.branch) return '#B8B8B0';
    var colors = { a:'#2F6FED', b:'#C0392B', c:'#3E7D4C', d:'#B5892A', e:'#7B4DFF', f:'#E0567C' };
    return colors[p.branch] || '#B8B8B0';
  }

  function tcStatusLineColor(status){
    switch(status){
      case 'Civil Marriage': return '#1C1C1C';
      case 'Customary Union': return '#3E7D4C';
      case 'Cohabiting / Unregistered': return '#9A9A93';
      case 'Severed / Divorced': return '#C0392B';
      default: return '#9A9A93';
    }
  }

  function tcBuildConnectorList(){
    var conns = [];
    var egoId = tcCurrentEgo || 'you';
    var ego = tcPeople[egoId];
    if(!ego) return conns;

    (ego.spouses || []).forEach(function(s){
      if(tcBothVisible(egoId, s)) conns.push({ a:egoId, b:s, type:'spouse', color: tcStatusLineColor((ego.spouseStatus||{})[s] || 'Customary Union') });
    });

    (ego.spouses || []).forEach(function(s){
      (tcPeople[s].children || []).forEach(function(c){
        if(tcBothVisible(s, c)) conns.push({ a:s, b:c, type:'branch', color: tcBranchColorFor(c) });
      });
    });

    Object.keys(tcPeople).forEach(function(id){
      if(id === egoId || (ego.spouses || []).indexOf(id) !== -1) return;
      var p = tcPeople[id];
      if(!p) return;
      (p.spouses || []).forEach(function(sp){
        if(tcBothVisible(id, sp)) conns.push({ a:id, b:sp, type:'spouse', color: tcStatusLineColor((p.spouseStatus||{})[sp] || 'Customary Union') });
      });
      (p.children || []).forEach(function(c){
        if(tcBothVisible(id, c)) conns.push({ a:id, b:c, type:'branch', color: tcBranchColorFor(c) });
      });
    });

    return conns;
  }

  function tcDrawConnectors(){
    if(!tcSvg) return;
    tcSvg.innerHTML = '';
    var conns = tcBuildConnectorList();
    var term = tcSearchTerm.trim().toLowerCase();

    conns.forEach(function(conn){
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var d;
      var dimmed = false;
      if(term){
        var aMatch = ((tcPeople[conn.a].name + ' ' + (tcPeople[conn.a].surname || '')).toLowerCase().indexOf(term) !== -1);
        var bMatch = ((tcPeople[conn.b].name + ' ' + (tcPeople[conn.b].surname || '')).toLowerCase().indexOf(term) !== -1);
        dimmed = !(aMatch || bMatch);
      }

      if(conn.type === 'spouse'){
        var p1 = tcCenterRightOf(conn.a);
        var p2 = tcCenterLeftOf(conn.b);
        var midX = (p1.x + p2.x) / 2;
        d = 'M ' + p1.x + ' ' + p1.y + ' L ' + midX + ' ' + p1.y + ' L ' + midX + ' ' + p2.y + ' L ' + p2.x + ' ' + p2.y;
        path.setAttribute('class', 'conn-line spouse' + (dimmed ? ' dimmed' : ''));
      } else {
        var p1b = tcCenterBottomOf(conn.a);
        var p2b = tcCenterTopOf(conn.b);
        var midY = (p1b.y + p2b.y) / 2;
        d = 'M ' + p1b.x + ' ' + p1b.y + ' L ' + p1b.x + ' ' + midY + ' L ' + p2b.x + ' ' + midY + ' L ' + p2b.x + ' ' + p2b.y;
        path.setAttribute('class', 'conn-line' + (dimmed ? ' dimmed' : ''));
      }
      path.setAttribute('d', d);
      path.setAttribute('stroke', conn.color);
      tcSvg.appendChild(path);
    });
  }

  function tcRender(){
    tcRenderVisibility();
    requestAnimationFrame(tcDrawConnectors);
    Object.keys(tcNodeEls).forEach(function(id){ tcUpdateNode(id); });
    tcRenderVisibility();
    tcUpdateStats();
  }

  /* ---------- TCM3 STATS ---------- */
  function tcUpdateStats(){
    var all = Object.values(tcPeople);
    var total = all.length;
    var blood = all.filter(function(p){ return p.relationship_type === 'Bloodline'; }).length;
    var married = all.filter(function(p){ return p.relationship_type === 'Married In'; }).length;
    var living = all.filter(function(p){ return !p.deceased; }).length;
    var genSet = new Set();
    Object.keys(tcPeople).forEach(function(id){
      var depth = 0;
      var cur = id;
      var guard = new Set();
      while(cur && !guard.has(cur)){
        guard.add(cur);
        var p = tcPeople[cur];
        if(p && p.parents.length && tcPeople[p.parents[0]]){
          cur = p.parents[0];
          depth++;
        } else { break; }
      }
      genSet.add(depth);
    });
    var el;
    el = document.getElementById('stat-total'); if(el) el.textContent = total;
    el = document.getElementById('stat-blood'); if(el) el.textContent = blood;
    el = document.getElementById('stat-married'); if(el) el.textContent = married;
    el = document.getElementById('stat-living'); if(el) el.textContent = living;
    el = document.getElementById('stat-gens'); if(el) el.textContent = genSet.size || 1;
  }

  /* ---------- TCM3 POPOVER ---------- */
  function tcClosePopover(){
    if(tcActivePopover){ tcActivePopover.remove(); tcActivePopover = null; }
  }

  function tcMarriageSummary(p){
    if(!p.marriage_type && !p.marital_status) return null;
    var type = p.marriage_type || p.marital_status;
    var date = p.marriage_date ? ' [' + p.marriage_date + ']' : '';
    return type + date;
  }

  function tcShowPopover(id, anchorEl){
    tcClosePopover();
    var p = tcPeople[id];
    if(!p || !tcCanvas) return;
    var rel = tcCalcRelation(tcCurrentEgo, id);
    var marriage = tcMarriageSummary(p);

    var pop = document.createElement('div');
    pop.className = 'tcm-popover';
    pop.innerHTML =
      '<div class="p-name">' + p.name + ' ' + (p.surname || '') + '</div>' +
      '<div class="p-years">' + tcYearLabel(p) + '</div>' +
      '<div class="pop-field">Totem / Mutupo<b>' + (p.mutupo || 'Not set') + (p.chidawo ? ' \u2014 ' + p.chidawo : '') + '</b></div>' +
      '<div class="pop-field">Language<b>' + (p.language_cluster || 'Not set') + '</b></div>' +
      '<div class="pop-field">Location<b>' + (p.residential_address || 'Not set') + '</b></div>' +
      '<div class="pop-field">Relationship to ' + (tcPeople[tcCurrentEgo] || {}).name + '<b>' + rel + ' \u00b7 ' + (p.relationship_type || '\u2014') + '</b></div>' +
      '<div class="pop-field">Marriage Status<b>' + (marriage || 'Not set') + '</b></div>' +
      '<div class="p-actions">' +
        '<button class="primary" data-action="profile">View Full Record</button>' +
        '<button data-action="close">Close</button>' +
      '</div>';

    var nodeRect = anchorEl.closest('.person-node');
    var left = parseFloat(nodeRect.style.left) + 160;
    var contentW = parseFloat(tcCanvas.dataset.contentW || 2400);
    if(left + 240 > contentW) left = parseFloat(nodeRect.style.left) - 250;
    pop.style.left = left + 'px';
    pop.style.top = parseFloat(nodeRect.style.top) + 'px';

    tcCanvas.appendChild(pop);
    tcActivePopover = pop;

    pop.querySelector('[data-action="close"]').addEventListener('click', tcClosePopover);
    pop.querySelector('[data-action="profile"]').addEventListener('click', function(){
      tcClosePopover();
      tcOpenProfile(id);
    });
  }

  document.addEventListener('click', function(e){
    if(tcActivePopover && !e.target.closest('.tcm-popover') && !e.target.closest('[data-role="popover"]')){
      tcClosePopover();
    }
  });

  /* ---------- TCM3 PROFILE OVERLAY (view + edit) ---------- */
  var tcOverlayBackdrop = document.getElementById('overlay-backdrop');
  var tcProfileContent = document.getElementById('profile-modal-content');
  var tcFileInput = document.getElementById('hiddenFileInput');

  function tcFieldVal(v){
    return (v === '' || v === null || v === undefined)
      ? '<span class="field-item-value empty">Not set</span>'
      : '<span class="field-item-value">' + v + '</span>';
  }
  function tcFieldEditText(id, key, label, placeholder){
    var val = tcPeople[id][key] || '';
    return '<div class="field-item"><div class="field-item-label">' + label + '</div>' +
      '<input class="field-edit-input" data-field="' + key + '" type="text" value="' + val.replace(/"/g, '&quot;') + '" placeholder="' + (placeholder||'') + '"></div>';
  }
  function tcFieldViewText(id, key, label){
    return '<div class="field-item"><div class="field-item-label">' + label + '</div>' + tcFieldVal(tcPeople[id][key]) + '</div>';
  }
  function tcFieldSelectBtn(id, key, label, listType){
    var val = tcPeople[id][key] || 'Not set';
    return '<div class="field-item"><div class="field-item-label">' + label + '</div>' +
      '<button class="field-select-btn" data-select="' + listType + '" data-field="' + key + '">' + val + '</button></div>';
  }
  function tcRenderRelChips(ids, tagLabel){
    if(!ids.length) return '<span class="field-item-value empty">None recorded</span>';
    return '<div class="chip-row">' + ids.map(function(rid){
      var rp = tcPeople[rid];
      if(!rp) return '';
      return '<div class="rel-chip" data-jump="' + rid + '">' + rp.name + '<span class="rc-tag">' + tagLabel + '</span></div>';
    }).join('') + '</div>';
  }

  function tcOpenProfile(id){
    tcProfileTargetId = id;
    tcProfileEditMode = false;
    tcRenderProfileModal();
    if(tcOverlayBackdrop) tcOverlayBackdrop.classList.add('open');
  }

  function tcRenderProfileModal(){
    var id = tcProfileTargetId;
    var p = tcPeople[id];
    if(!p || !tcProfileContent) return;
    var rel = tcCalcRelation(tcCurrentEgo, id);
    var genderClass = p.gender === 'f' ? 'gender-f' : 'gender-m';
    var statusClass = tcPrimaryStatusClass(p);
    var deceasedClass = p.deceased ? 'deceased' : '';
    var img = p.image ? '<img src="' + p.image + '" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">' : (p.gender === 'f' ? TCM3_FEMALE_SVG : TCM3_MALE_SVG);
    var isEgo = id === tcCurrentEgo;
    var edit = tcProfileEditMode;

    var identityFields = edit
      ? '<div class="field-grid">' + tcFieldEditText(id,'surname','Surname') + tcFieldEditText(id,'occupation','Occupation') + '</div>'
      : '<div class="field-grid">' + tcFieldViewText(id,'surname','Surname') + tcFieldViewText(id,'occupation','Occupation') + '</div>';

    var totemicFields = edit
      ? '<div class="field-grid">' + tcFieldEditText(id,'mutupo','Mutupo (Totem)') + tcFieldEditText(id,'chidawo','Chidawo (Praise Name)') + '</div>'
      : '<div class="field-grid">' + tcFieldViewText(id,'mutupo','Mutupo (Totem)') + tcFieldViewText(id,'chidawo','Chidawo (Praise Name)') + '</div>';

    var marriageFields = edit
      ? '<div class="field-grid">' + tcFieldEditText(id,'marital_status','Marital Status') + tcFieldEditText(id,'marriage_type','Marriage Type') + '</div>'
      : '<div class="field-grid">' + tcFieldViewText(id,'marital_status','Marital Status') + tcFieldViewText(id,'marriage_type','Marriage Type') + '</div>';

    var notesSection = edit
      ? '<textarea class="notes-box" id="tc-notes-edit-box" placeholder="Oral history notes...">' + (p.notes||'') + '</textarea>'
      : '<div class="notes-display ' + (p.notes ? '' : 'empty') + '">' + (p.notes || 'No oral history notes recorded yet.') + '</div>';

    var flags = [];
    if(isEgo) flags.push('<span class="flag-chip ego">Ego</span>');
    if(p.deceased) flags.push('<span class="flag-chip deceased">Deceased</span>');
    if(Object.values(p.spouseStatus||{}).indexOf('Severed / Divorced') !== -1) flags.push('<span class="flag-chip severed">Severed</span>');

    tcProfileContent.innerHTML =
      '<div class="profile-close" id="tc-profile-close-btn">Close</div>' +
      '<div class="profile-thumb-wrap">' +
        '<div class="profile-thumb ' + genderClass + ' ' + statusClass + ' ' + deceasedClass + '">' + img + '</div>' +
        '<div class="profile-name">' + p.name + ' ' + (p.surname||'') + '</div>' +
        '<div class="profile-years">' + tcYearLabel(p) + '</div>' +
        '<div class="profile-flags">' + flags.join('') + '</div>' +
        '<div class="edit-toggle-row">' +
          '<button id="tc-mode-view-btn" class="'+(edit?'':'active')+'">View</button>' +
          '<button id="tc-mode-edit-btn" class="'+(edit?'active':'')+'">Edit</button>' +
        '</div>' +
      '</div>' +
      '<div class="exogamy-warning" id="tc-exogamy-warning-box">Warning: matching Mutupo and Chidawo detected with a spouse.</div>' +
      '<div class="profile-section"><div class="profile-section-label">Relation to ' + (tcPeople[tcCurrentEgo]||{}).name + '</div><div class="field-item-value">' + rel + ' &middot; ' + (p.relationship_type || 'Not set') + '</div></div>' +
      '<div class="profile-section"><div class="profile-section-label">Identity</div>' + identityFields + '</div>' +
      '<div class="profile-section"><div class="profile-section-label">Lineage & Totemic</div>' + totemicFields + '</div>' +
      '<div class="profile-section"><div class="profile-section-label">Marriage & Kinship</div>' + marriageFields + '</div>' +
      '<div class="profile-section"><div class="profile-section-label">Parents</div>' + tcRenderRelChips(tcGetParentsOf(id), 'parent') + '</div>' +
      '<div class="profile-section"><div class="profile-section-label">Spouse(s)</div>' + tcRenderRelChips(tcGetSpousesOf(id), 'spouse') + '</div>' +
      '<div class="profile-section"><div class="profile-section-label">Children</div>' + tcRenderRelChips(tcGetChildrenOf(id), 'child') + '</div>' +
      '<div class="profile-section"><div class="profile-section-label">Oral History Notes</div>' + notesSection + '</div>' +
      '<div class="action-link-row">' +
        '<button class="action-link view-as ' + (isEgo?'is-ego':'') + '" id="tc-view-as-btn" ' + (isEgo?'disabled':'') + '>' +
          (isEgo ? 'Currently Viewing As' : 'View Tree As ' + p.name) +
        '</button>' +
      '</div>';

    tcWireProfileHandlers(id);
  }

  function tcWireProfileHandlers(id){
    var closeBtn = document.getElementById('tc-profile-close-btn');
    if(closeBtn) closeBtn.addEventListener('click', tcCloseProfile);

    var viewBtn = document.getElementById('tc-mode-view-btn');
    var editBtn = document.getElementById('tc-mode-edit-btn');
    if(viewBtn) viewBtn.addEventListener('click', function(){
      if(tcProfileEditMode) tcSaveProfileEdits(id);
      tcProfileEditMode = false;
      tcRenderProfileModal();
    });
    if(editBtn) editBtn.addEventListener('click', function(){
      tcProfileEditMode = true;
      tcRenderProfileModal();
    });

    var viewAsBtn = document.getElementById('tc-view-as-btn');
    if(viewAsBtn && id !== tcCurrentEgo){
      viewAsBtn.addEventListener('click', function(){ tcSetEgo(id); tcCloseProfile(); });
    }

    tcProfileContent.querySelectorAll('[data-jump]').forEach(function(chip){
      chip.addEventListener('click', function(){
        if(tcProfileEditMode && tcProfileTargetId) tcSaveProfileEdits(tcProfileTargetId);
        tcOpenProfile(chip.dataset.jump);
      });
    });

    tcProfileContent.querySelectorAll('[data-select]').forEach(function(btn){
      btn.addEventListener('click', function(){ tcOpenSelectModal(btn.dataset.select, btn.dataset.field, id); });
    });
  }

  function tcSaveProfileEdits(id){
    var p = tcPeople[id];
    tcProfileContent.querySelectorAll('.field-edit-input').forEach(function(input){
      p[input.dataset.field] = input.value;
    });
    var notesBox = document.getElementById('tc-notes-edit-box');
    if(notesBox) p.notes = notesBox.value;
    tcUpdateNode(id);
    tcRenderVisibility();
    tcUpdateStats();
  }

  function tcCloseProfile(){
    if(tcProfileEditMode && tcProfileTargetId) tcSaveProfileEdits(tcProfileTargetId);
    if(tcOverlayBackdrop) tcOverlayBackdrop.classList.remove('open');
    tcProfileTargetId = null;
    tcProfileEditMode = false;
  }

  if(tcOverlayBackdrop) tcOverlayBackdrop.addEventListener('click', function(e){ if(e.target === tcOverlayBackdrop) tcCloseProfile(); });

  /* ---------- TCM3 SELECTION MODALS ---------- */
  var tcSelectBackdrop = document.getElementById('select-modal-backdrop');
  var tcSelectTitle = document.getElementById('select-modal-title');
  var tcSelectSearch = document.getElementById('select-modal-search');
  var tcSelectList = document.getElementById('select-modal-list');

  function tcGetListData(listType){
    switch(listType){
      case 'mutupo': return (typeof TOTEM_TABLE !== 'undefined' ? TOTEM_TABLE : []).map(function(t){ return {label:t.totem, sub:t.chidawo}; });
      case 'chidawo': return (typeof TOTEM_TABLE !== 'undefined' ? TOTEM_TABLE : []).map(function(t){ return {label:t.chidawo, sub:t.totem}; });
      case 'language': return (typeof LANGUAGE_CLUSTERS !== 'undefined' ? LANGUAGE_CLUSTERS : []).map(function(l){ return {label:l}; });
      case 'province': return TCM3_PROVINCES.map(function(p){ return {label:p}; });
      case 'marital_status': return TCM3_MARITAL_STATUSES.map(function(s){ return {label:s}; });
      case 'marriage_type': return TCM3_MARRIAGE_TYPES.map(function(s){ return {label:s}; });
      case 'roora': return TCM3_ROORA_STATUSES.map(function(s){ return {label:s}; });
      default: return [];
    }
  }

  function tcOpenSelectModal(listType, field, personId){
    tcSelectModalCtx = { listType: listType, field: field, personId: personId };
    if(tcSelectTitle) tcSelectTitle.textContent = 'Select \u2014 ' + field.replace(/_/g, ' ');
    if(tcSelectSearch) tcSelectSearch.value = '';
    tcRenderSelectList('');
    if(tcSelectBackdrop) tcSelectBackdrop.classList.add('open');
    if(tcSelectSearch) tcSelectSearch.focus();
  }

  function tcRenderSelectList(filter){
    if(!tcSelectModalCtx || !tcSelectList) return;
    var data = tcGetListData(tcSelectModalCtx.listType);
    var f = filter.trim().toLowerCase();
    var filtered = data.filter(function(d){ return !f || d.label.toLowerCase().indexOf(f) !== -1 || ((d.sub||'').toLowerCase().indexOf(f) !== -1); });
    tcSelectList.innerHTML = filtered.map(function(d){
      return '<div class="select-modal-item" data-value="' + d.label.replace(/"/g, '&quot;') + '">' +
        '<span>' + d.label + '</span>' + (d.sub ? '<span class="smi-sub">' + d.sub + '</span>' : '') + '</div>';
    }).join('') || '<div style="padding:14px;color:var(--text-dim);font-size:13px;">No matches.</div>';

    tcSelectList.querySelectorAll('.select-modal-item').forEach(function(item){
      item.addEventListener('click', function(){ tcApplySelectValue(item.dataset.value); });
    });
  }

  function tcApplySelectValue(value){
    if(!tcSelectModalCtx) return;
    var field = tcSelectModalCtx.field;
    var personId = tcSelectModalCtx.personId;
    var p = tcPeople[personId];
    p[field] = value;
    if(tcSelectBackdrop) tcSelectBackdrop.classList.remove('open');
    if(tcProfileTargetId === personId) tcRenderProfileModal();
  }

  if(tcSelectSearch) tcSelectSearch.addEventListener('input', function(e){ tcRenderSelectList(e.target.value); });
  if(tcSelectBackdrop) tcSelectBackdrop.addEventListener('click', function(e){ if(e.target === tcSelectBackdrop) tcSelectBackdrop.classList.remove('open'); });

  /* ---------- TCM3 EGO SWITCHING ---------- */
  var tcEgoSwitchBtn = document.getElementById('ego-switch-btn');
  var tcEgoPickerBackdrop = document.getElementById('ego-picker-backdrop');
  var tcEgoPickerList = document.getElementById('ego-picker-list');

  function tcSetEgo(id){
    tcCurrentEgo = id;
    state.myId = id;
    tcResetState();
    if(tcEgoSwitchBtn) tcEgoSwitchBtn.textContent = 'View as: ' + (tcPeople[id]||{}).name;
    tcBuildNodes();
    tcRender();
  }

  function tcOpenEgoPicker(){
    if(!tcEgoPickerList) return;
    tcEgoPickerList.innerHTML = '';
    Object.values(tcPeople)
      .sort(function(a,b){ return (a.born||0) - (b.born||0); })
      .forEach(function(p){
        var item = document.createElement('div');
        item.className = 'ego-picker-item';
        item.innerHTML = '<span>' + p.name + (p.id===tcCurrentEgo ? ' (current)' : '') + '</span><span class="yr">b.' + p.born + '</span>';
        item.addEventListener('click', function(){
          tcSetEgo(p.id);
          if(tcEgoPickerBackdrop) tcEgoPickerBackdrop.classList.remove('open');
        });
        tcEgoPickerList.appendChild(item);
      });
    if(tcEgoPickerBackdrop) tcEgoPickerBackdrop.classList.add('open');
  }

  if(tcEgoSwitchBtn) tcEgoSwitchBtn.addEventListener('click', tcOpenEgoPicker);
  if(tcEgoPickerBackdrop) tcEgoPickerBackdrop.addEventListener('click', function(e){ if(e.target === tcEgoPickerBackdrop) tcEgoPickerBackdrop.classList.remove('open'); });

  /* ---------- TCM3 ZOOM CONTROLS ---------- */
  function tcApplyZoom(){
    if(tcCanvas) tcCanvas.style.transform = 'scale(' + tcZoomLevel + ')';
  }
  function tcAdjustScrollAfterZoom(oldScale, newScale){
    if(!tcViewport) return;
    var vpW = tcViewport.clientWidth;
    var vpH = tcViewport.clientHeight;
    var cx = tcViewport.scrollLeft + vpW / 2;
    var cy = tcViewport.scrollTop + vpH / 2;
    tcViewport.scrollLeft = cx * newScale - vpW / 2;
    tcViewport.scrollTop = cy * newScale - vpH / 2;
  }
  var tcZoomInBtn = document.getElementById('zoom-in');
  var tcZoomOutBtn = document.getElementById('zoom-out');
  var tcZoomFitBtn = document.getElementById('zoom-fit');
  if(tcZoomInBtn) tcZoomInBtn.addEventListener('click', function(){
    var prev = tcZoomLevel;
    tcZoomLevel = Math.min(1.6, tcZoomLevel + 0.1);
    tcApplyZoom();
    tcAdjustScrollAfterZoom(prev, tcZoomLevel);
  });
  if(tcZoomOutBtn) tcZoomOutBtn.addEventListener('click', function(){
    var prev = tcZoomLevel;
    tcZoomLevel = Math.max(0.15, tcZoomLevel - 0.1);
    tcApplyZoom();
    tcAdjustScrollAfterZoom(prev, tcZoomLevel);
  });
  if(tcZoomFitBtn) tcZoomFitBtn.addEventListener('click', function(){
    tcExpandAll();
    tcRender();
    requestAnimationFrame(function(){
      var contentW = parseFloat(tcCanvas.dataset.contentW || 2400);
      var contentH = parseFloat(tcCanvas.dataset.contentH || 1400);
      var vw = tcViewport ? tcViewport.clientWidth : 400;
      var vh = tcViewport ? tcViewport.clientHeight : 600;
      var scaleX = vw / contentW;
      var scaleY = vh / contentH;
      tcZoomLevel = Math.max(0.12, Math.min(scaleX, scaleY) * 0.96);
      tcApplyZoom();
      if(tcViewport) tcViewport.scrollTo({ top:0, left:0, behavior:'smooth' });
    });
  });

  /* ---------- TCM3 SEARCH ---------- */
  var tcSearchInput = document.getElementById('search-input');
  if(tcSearchInput) tcSearchInput.addEventListener('input', function(e){
    tcSearchTerm = e.target.value;
    tcApplySearchDimming();
    tcDrawConnectors();
    if(tcSearchTerm.trim()){
      var term = tcSearchTerm.trim().toLowerCase();
      var match = Object.values(tcPeople).find(function(p){
        return ((p.name + ' ' + (p.surname||'')).toLowerCase().indexOf(term) !== -1) && tcIsVisible(p.id);
      });
      if(match){
        var node = tcNodeEls[match.id];
        if(node) node.scrollIntoView({ behavior:'smooth', block:'center', inline:'center' });
      }
    }
  });

  /* ---------- TCM3 LEGEND TOGGLE ---------- */
  var tcLegendPanel = document.getElementById('legend-panel');
  var tcLegendToggleBtn = document.getElementById('legend-toggle-btn-top');
  if(tcLegendToggleBtn) tcLegendToggleBtn.addEventListener('click', function(){
    if(tcLegendPanel) tcLegendPanel.classList.toggle('open');
  });

  /* ---------- TCM3 RENDER TREE (drop-in replacement) ---------- */
  function renderTree(){
    tcCanvas = document.getElementById('canvas');
    tcSvg = document.getElementById('connector-svg');
    tcRailEl = document.getElementById('decade-rail');
    tcViewport = document.getElementById('viewport');
    tcCurrentEgo = state.myId || 'you';

    tcAdaptPeopleData();
    tcComputeLayout();
    tcResetState();
    tcBuildRail();
    tcBuildNodes();
    tcRender();

    if(tcEgoSwitchBtn) tcEgoSwitchBtn.textContent = 'View as: ' + (tcPeople[tcCurrentEgo]||{}).name;

    requestAnimationFrame(function(){
      var egoNode = tcNodeEls[tcCurrentEgo];
      if(!egoNode || !tcViewport) return;
      var nodeRect = egoNode.getBoundingClientRect();
      var vpRect = tcViewport.getBoundingClientRect();
      tcViewport.scrollLeft = egoNode.offsetLeft - vpRect.width / 2 + nodeRect.width / 2;
      tcViewport.scrollTop = egoNode.offsetTop - vpRect.height / 2 + nodeRect.height / 2;
    });
  }

  function centerTree(){}
  function ancestryPath(id){
    var path = [];
    var cur = byId[id];
    var guard = new Set();
    while(cur && !guard.has(cur.id)){
      guard.add(cur.id);
      path.unshift(cur);
      var pid = cur.parentIds && cur.parentIds[0];
      cur = pid ? byId[pid] : null;
    }
    return path;
  }

  function familyOf(p){
    var parents = (p.parentIds||[]).map(function(id){return byId[id];}).filter(Boolean);
    var spouse = spouseOf(p);
    var children = primaryChildrenOf(p.id);
    var siblings = parents.length
      ? PEOPLE.filter(function(x){ return x.id!==p.id && x.parentIds && x.parentIds[0]===parents[0].id; })
      : [];
    return {parents:parents, spouse:spouse, children:children, siblings:siblings};
  }

  function lifeStoryText(p){
    var s = p.name + (p.born ? ' was born in ' + p.born : '') + '.';
    if(p.location) s += ' Based in ' + p.location + '.';
    if(p.relation) s += ' Relationship: ' + p.relation + '.';
    if(p.profession) s += ' Works as a ' + p.profession + '.';
    if(p.died) s += ' Passed away in ' + p.died + '.';
    return s;
  }

  function buildEventCards(p){
    var cards = [];
    if(p.born) cards.push({type:'', title:'Birth', body:p.name + ' was born in ' + p.born + (p.location?' — ' + p.location:'') + '.'});
    if(p.spouseId && byId[p.spouseId]) cards.push({type:'marriage', title:'Marriage', body:p.name + ' is partnered with ' + byId[p.spouseId].name + '.'});
    if(p.notes) cards.push({type:'location', title:'Notes', body:p.notes});
    if(p.died) cards.push({type:'', title:'Passing', body:p.name + ' passed away in ' + p.died + '.'});
    return cards;
  }

  function openProfile(id){
    var p = byId[id];
    if(!p) return;
    state.activePersonId = id;
    renderProfilePanel(p);
    overlay.classList.add('show');
    panel.classList.add('show');
  }

  function closeProfile(){
    overlay.classList.remove('show');
    panel.classList.remove('show');
    state.activePersonId = null;
    _panelPersonId = null;
  }
  overlay.addEventListener('click', closeProfile);
  $('panelClose').addEventListener('click', closeProfile);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeProfile(); });

  var _panelPersonId = null;
  function renderProfilePanel(p){
    var img = state.images[p.id];
    panelThumbInner.innerHTML = img
      ? '<img src="' + sanitizeImageSrc(img) + '" alt="' + escapeHtml(p.name) + '">'
      : '<span class="initials">' + initials(p.name) + '</span>';
    panelName.textContent = p.name;
    panelMeta.innerHTML = '';
    if(p.relation){
      var pill = document.createElement('span'); pill.className='pill'; pill.textContent = p.relation;
      panelMeta.appendChild(pill);
    }
    if(p.location){
      var pill2 = document.createElement('span'); pill2.className='pill copper'; pill2.textContent = p.location;
      panelMeta.appendChild(pill2);
    }
    var yrs = personLabelYears(p);
    if(yrs){
      var yt = document.createElement('span'); yt.className='yearTag'; yt.textContent = yrs;
      panelMeta.appendChild(yt);
    }

    // Skip full tab re-render if same person
    if (_panelPersonId === p.id) { setActiveProfileTab(state.activeProfileTab); return; }
    _panelPersonId = p.id;

    // Lifestory
    var lp = $('pane-lifestory');
    lp.innerHTML = '';
    var summary = document.createElement('div');
    summary.className = 'summaryCard';
    summary.textContent = lifeStoryText(p);
    lp.appendChild(summary);
    buildEventCards(p).forEach(function(ev){
      var card = document.createElement('div');
      card.className = 'eventCard ' + (ev.type||'');
      card.innerHTML = '<div class="evTitle">' + ev.title + '</div><div class="evBody">' + ev.body + '</div>';
      lp.appendChild(card);
    });

    // Info
    var ip = $('pane-info');
    ip.innerHTML = '';
    var rows = [
      ['Full name', p.name],
      ['Relation', p.relation||'—'],
      ['Born', p.born||'Unknown'],
      ['Died', p.died||'—'],
      ['Gender', p.gender==='m'?'Male':p.gender==='f'?'Female':'Not specified'],
      ['Location', p.location||'Unknown'],
      ['Profession', p.profession||'Unknown'],
    ];
    rows.forEach(function(r){
      var row = document.createElement('div'); row.className='infoRow';
      row.innerHTML = '<span class="infoLabel">' + r[0] + '</span><span class="infoVal">' + r[1] + '</span>';
      ip.appendChild(row);
    });

    // Kinship tab
    var kp = $('pane-kinship');
    kp.innerHTML = '';
    var k = p.kinship || {};
    var kinshipRows = [
      ['Mutupo (Totem)', k.mutupo || '—'],
      ['Chidawo (Praise)', k.chidawo || '—'],
      ['Cultural System', k.culturalSystem || 'SHONA'],
      ['House Rank', k.houseRank != null ? String(k.houseRank) : '—'],
      ['Lineage Anchor', k.lineageAnchorType || 'BIOLOGICAL_FATHER'],
    ];
    kinshipRows.forEach(function(r){
      var row = document.createElement('div'); row.className='infoRow';
      row.innerHTML = '<span class="infoLabel">' + r[0] + '</span><span class="infoVal">' + r[1] + '</span>';
      kp.appendChild(row);
    });
    var o = p.oral || {};
    if(o.greeting){
      var gcard = document.createElement('div');
      gcard.className = 'summaryCard';
      gcard.textContent = '🥂 ' + o.greeting;
      kp.appendChild(gcard);
    }
    if(o.taboo){
      var tcard = document.createElement('div');
      tcard.className = 'summaryCard';
      tcard.textContent = '🚫 Miko (Taboo): ' + o.taboo;
      kp.appendChild(tcard);
    }

    // Family
    var fp = $('pane-family');
    fp.innerHTML = '';
    var fam = familyOf(p);
    var sections = [
      ['Parents', fam.parents],
      ['Spouse', fam.spouse ? [fam.spouse] : []],
      ['Siblings', fam.siblings],
      ['Children', fam.children],
    ];
    var any = false;
    sections.forEach(function(s){
      var label = s[0], list = s[1];
      if(!list.length) return;
      any = true;
      var sec = document.createElement('div'); sec.className='familySection';
      sec.innerHTML = '<h4>' + label + '</h4><div class="familyGrid"></div>';
      var grid = sec.querySelector('.familyGrid');
      list.forEach(function(fp){
        var mini = document.createElement('div'); mini.className='familyMini';
        var mimg = state.images[fp.id];
        mini.innerHTML = '<div class="miniThumb ' + (fp.gender==='m'?'male':fp.gender==='f'?'female':'') + '">' + (mimg?'<img src="' + sanitizeImageSrc(mimg) + '" alt="">':'<span class="initials">' + initials(fp.name) + '</span>') + '</div><div class="miniName">' + fp.name + '</div><div class="miniRel">' + (fp.relation||'') + '</div>';
        mini.addEventListener('click', function(){ openProfile(fp.id); });
        grid.appendChild(mini);
      });
      fp.appendChild(sec);
    });
    if(p.branchCount){
      any = true;
      var sec = document.createElement('div'); sec.className='familySection';
      sec.innerHTML = '<h4>Generated branch</h4><div class="summaryCard">This branch represents approximately ' + p.branchCount.children + ' children' + (p.branchCount.grandchildren?', ' + p.branchCount.grandchildren + ' grandchildren':'') + '.</div>';
      fp.appendChild(sec);
    }
    if(!any) fp.innerHTML = '<div class="emptyState">No linked family members recorded.</div>';

    // Gallery
    renderGalleryTab(p);

    // Wire thumb upload
    panelThumb.onclick = function(){ triggerImageUpload(function(dataUrl){
      state.images[p.id] = dataUrl;
      persistState();
      _panelPersonId = null; // force full re-render
      renderProfilePanel(p);
      renderTree();
    }); };

    setActiveProfileTab('lifestory');
  }

  function renderGalleryTab(p){
    var gp = $('pane-gallery');
    gp.innerHTML = '<div class="galleryGrid"></div>';
    var grid = gp.querySelector('.galleryGrid');
    (state.gallery[p.id]||[]).forEach(function(src){
      var g = document.createElement('div'); g.className='gThumb';
      g.innerHTML = '<img src="' + sanitizeImageSrc(src) + '" alt="">';
      grid.appendChild(g);
    });
    var addBtn = document.createElement('div');
    addBtn.className = 'addPhotoBtn';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', function(){
      triggerImageUpload(function(dataUrl){
        if(!state.gallery[p.id]) state.gallery[p.id]=[];
        state.gallery[p.id].push(dataUrl);
        persistState();
        renderGalleryTab(p);
      });
    });
    grid.appendChild(addBtn);
  }

  function setActiveProfileTab(tab){
    state.activeProfileTab = tab;
    document.querySelectorAll('.tabBtn').forEach(function(b){
      b.classList.toggle('active', b.dataset.tab===tab);
    });
    document.querySelectorAll('.tabPane').forEach(function(p){
      p.classList.toggle('active', p.id==='pane-'+tab);
    });
  }
  document.querySelectorAll('.tabBtn').forEach(function(b){
    b.addEventListener('click', function(){ setActiveProfileTab(b.dataset.tab); });
  });

  /* ---------- IMAGE UPLOAD ---------- */
  var uploadCallback = null;
  function triggerImageUpload(cb){
    uploadCallback = cb;
    fileInput.value = '';
    fileInput.click();
  }
  var MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  fileInput.addEventListener('change', function(e){
    var file = e.target.files[0];
    if(!file) return;
    if (file.size > MAX_IMAGE_BYTES) { showToast('❌ Image too large. Max 10MB.'); fileInput.value = ''; return; }
    if (file.type.indexOf('image/') !== 0) { showToast('❌ Only image files are allowed.'); fileInput.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function(){ if(uploadCallback) uploadCallback(reader.result); };
    reader.readAsDataURL(file);
  });

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
     CULTURAL LOOKUP LIBRARY (Section 3.3)
     ============================================================ */
  function renderLibraryTab(tab){
    var body = $('libraryBody');
    if (!body) return;
    body.innerHTML = '';
    switch(tab){
      case 'totems': renderLibraryTotems(body); break;
      case 'proverbs': renderLibraryProverbs(body); break;
      case 'greetings': renderLibraryGreetings(body); break;
      case 'poems': renderLibraryPoems(body); break;
      case 'regions': renderLibraryRegions(body); break;
      case 'glossary': renderLibraryGlossary(body); break;
      case 'shonaRoora': renderShonaRoora(body); break;
      case 'ndebeleRoora': renderNdebeleRoora(body); break;
    }
  }

  function renderRooraBack(body){
    var btn = document.createElement('button');
    btn.className = 'roora-back';
    btn.textContent = '\u2190 Back to Totems';
    btn.addEventListener('click', function(){
      document.querySelectorAll('.lib-tab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelector('.lib-tab[data-libtab="totems"]').classList.add('active');
      renderLibraryTab('totems');
    });
    body.appendChild(btn);
  }

  function renderShonaRoora(body){
    var h = document.createElement('div');
    h.className = 'roora-header';
    h.innerHTML = '<div class="roora-eyebrow">Customary Marriage Process</div>' +
      '<h3>Shona Roora Process</h3>' +
      '<p>A structured summary of the Shona bridewealth negotiation process, financial stages, and customary protections.</p>';
    body.appendChild(h);

    var overview = document.createElement('div');
    overview.className = 'roora-section';
    overview.innerHTML = '<h4>Overview</h4>' +
      '<p>The confusion during Shona marriage negotiations often stems from two issues: families mixing the chronological order of steps, or failing to separate what belongs to the mother and what belongs to the father.</p>' +
      '<div class="roora-good"><strong>Key principle:</strong> The groom never speaks directly in the main negotiation; the Munyai (the go-between) handles the process and the money.</div>';
    body.appendChild(overview);

    var players = document.createElement('div');
    players.className = 'roora-section';
    players.innerHTML = '<h4>Key Players</h4>' +
      '<ul class="roora-ul">' +
        '<li><strong>Munyai</strong> \u2014 The most important negotiator. Speaks for the groom, handles all protocol and money.</li>' +
        '<li><strong>Vatete</strong> \u2014 Represents the bride and protects her interests.</li>' +
        '<li><strong>Groomsmen / Delegation</strong> \u2014 Sit quietly, speak only when called upon.</li>' +
        '<li><strong>In-laws</strong> \u2014 Parents and elders receive formal requests and ritual obligations.</li>' +
      '</ul>';
    body.appendChild(players);

    var steps = document.createElement('div');
    steps.className = 'roora-section';
    steps.innerHTML = '<h4>Chronological Step-by-Step Process</h4>';
    var stepsData = [
      { n:'1', t:'Vhuramuromo', d:'Weeks before, the groom\u2019s side sends a formal letter and a small fee called Vhuramuromo (\u201Cmouth opener\u201D).' },
      { n:'2', t:'Zvireverere / Mako', d:'On the morning of the Roora, the family pays incremental fees to acknowledge the in-laws and enter the homestead.' },
      { n:'3', t:'Zvinoreva Mai', d:'Payment strictly reserved for the mother to honor her role in raising the bride.' },
      { n:'4', t:'Zvinoreva Baba', d:'Payments to the father-in-law acknowledging his authority and upbringing of the bride.' },
      { n:'5', t:'Rusambo / Roora', d:'The core bride price that validates the union. The main financial and legal marker of marriage.' },
      { n:'6', t:'Numbi dzaMai / Danga', d:'Final clothing, gifts, and cattle/livestock value are finalized.' }
    ];
    var stepsGrid = document.createElement('div');
    stepsGrid.className = 'roora-steps';
    stepsData.forEach(function(s){
      var card = document.createElement('div');
      card.className = 'roora-step';
      card.innerHTML = '<div class="roora-step-num">' + s.n + '</div><h5>' + s.t + '</h5><p>' + s.d + '</p>';
      stepsGrid.appendChild(card);
    });
    steps.appendChild(stepsGrid);
    body.appendChild(steps);

    var ledger = document.createElement('div');
    ledger.className = 'roora-section';
    ledger.innerHTML = '<h4>Financial Ledger & Pricing Matrix</h4>' +
      '<div class="roora-table-wrap"><table class="roora-table">' +
      '<thead><tr><th>Item</th><th>Recipient</th><th>Purpose</th><th>Range</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Vhuramuromo</td><td>Bride\u2019s brothers / youth</td><td>Opens the talks</td><td>$20\u2013$100</td></tr>' +
        '<tr><td>Kupinda Mumusha</td><td>Household</td><td>Entry fee</td><td>$20\u2013$50</td></tr>' +
        '<tr><td>Mbonano yeAmbuya</td><td>Mother</td><td>Mother greeting token</td><td>$100\u2013$300</td></tr>' +
        '<tr><td>Pasi weMhazi</td><td>Father\u2019s lineage</td><td>Respect to ancestors</td><td>$50\u2013$100</td></tr>' +
        '<tr><td>Rusambo</td><td>Father / Tezvara</td><td>Core bride price</td><td>$1,500\u2013$5,000+</td></tr>' +
        '<tr><td>Danga (Cattle)</td><td>Father / family herd</td><td>Lineage wealth</td><td>4\u20138 cows</td></tr>' +
        '<tr><td>Mombe yeHumai</td><td>Mother</td><td>Mandatory live cow</td><td>1 heifer</td></tr>' +
        '<tr><td>Majuzi / Mbatya</td><td>Father and mother</td><td>Formal clothing</td><td>$300\u2013$600</td></tr>' +
        '<tr><td>Kunhonga</td><td>Bride</td><td>Consent cash</td><td>$50\u2013$200</td></tr>' +
      '</tbody></table></div>';
    body.appendChild(ledger);

    var nuances = document.createElement('div');
    nuances.className = 'roora-section';
    nuances.innerHTML = '<h4>Customary Nuances and Rules</h4>' +
      '<div class="roora-callout"><strong>Mombe yeHumai Rule:</strong> The mother\u2019s cow belongs exclusively to the mother\u2019s maternal ancestors. If the couple divorces, it cannot be refunded.</div>' +
      '<ul class="roora-ul">' +
        '<li><strong>Zvirehwa:</strong> Fines for protocol breaches (late arrival, speaking without Munyai, wrong door).</li>' +
        '<li><strong>Manyika / Ndau variations:</strong> Some regions emphasize salt, firewood, or beadwork.</li>' +
        '<li><strong>Order matters:</strong> Out-of-sequence stages can attract penalties and invalidate the contract.</li>' +
      '</ul>';
    body.appendChild(nuances);

    var divorce = document.createElement('div');
    divorce.className = 'roora-section';
    divorce.innerHTML = '<h4>Marriage Dissolution (Gupuro)</h4>' +
      '<div class="roora-code">[Gupuro (Shona)]\nHusband/Wife \u2192 Gives small physical token \u2192 Handed via Munyai to in-laws \u2192 Marriage void\n(Reason must be stated clearly)</div>' +
      '<ul class="roora-ul">' +
        '<li><strong>Gupuro:</strong> A token of rejection issued via Munyai or Vatete to the in-laws.</li>' +
        '<li><strong>Without Gupuro:</strong> Separation is not recognized under customary law.</li>' +
        '<li>The mother\u2019s cow remains protected and cannot be reclaimed.</li>' +
      '</ul>';
    body.appendChild(divorce);

    var custody = document.createElement('div');
    custody.className = 'roora-section';
    custody.innerHTML = '<h4>Child Custody and Family Rights</h4>' +
      '<ul class="roora-ul">' +
        '<li>Both traditions place children in the father\u2019s patrilineage once obligations are met.</li>' +
        '<li>During early childhood, the mother often retains primary physical custody.</li>' +
        '<li>If Roora was never paid, the maternal lineage retains stronger customary rights.</li>' +
      '</ul>';
    body.appendChild(custody);

    var masungiro = document.createElement('div');
    masungiro.className = 'roora-section';
    masungiro.innerHTML = '<h4>Masungiro / Pregnancy Protection Rite</h4>' +
      '<div class="roora-code">[Pregnancy Confirmed (7th\u20138th month)]\n  \u2193\nMother returns to maiden homestead\n  \u2193\nCeremonial handover and rituals\n  \u2193\nBirth and postnatal care\n  \u2193\nReturn to husband\u2019s home with newborn</div>' +
      '<p>Includes presentation of goats: <em>Mbudzi yeMasungiro</em> and <em>Mbudzi yechidandaro</em>.</p>';
    body.appendChild(masungiro);

    renderRooraBack(body);
  }

  function renderNdebeleRoora(body){
    var h = document.createElement('div');
    h.className = 'roora-header';
    h.innerHTML = '<div class="roora-eyebrow">Customary Marriage Framework</div>' +
      '<h3>Shona & Ndebele Roora Process</h3>' +
      '<p>A combined summary of the Shona Roora and Ndebele Amalobolo structures, negotiation phases, cattle ledger logic, and customary protections.</p>';
    body.appendChild(h);

    var shared = document.createElement('div');
    shared.className = 'roora-section';
    shared.innerHTML = '<h4>Shared Foundation</h4>' +
      '<p>Both traditions are structured, rule-based, and sensitive to family hierarchy. They depend on social mediation, proper sequencing, and recognition of maternal and paternal rights.</p>';
    body.appendChild(shared);

    var shona = document.createElement('div');
    shona.className = 'roora-section';
    shona.innerHTML = '<h4>Shona Roora Process</h4>';
    var shonaSteps = [
      { n:'1', t:'Vhuramuromo', d:'\u201COpening of the mouth.\u201D Formal letter and fee to open negotiations.' },
      { n:'2', t:'Zvireverere / Mako', d:'Greeting and entry fees to acknowledge in-laws.' },
      { n:'3', t:'Zvinoreva Mai', d:'Payments for the mother to honor her role.' },
      { n:'4', t:'Zvinoreva Baba', d:'Payments for the father-in-law\u2019s authority.' },
      { n:'5', t:'Rusambo / Roora', d:'Core bride price; marriage validity marker.' },
      { n:'6', t:'Numbi dzaMai / Danga', d:'Final clothing, gifts, and cattle value.' }
    ];
    var shonaGrid = document.createElement('div');
    shonaGrid.className = 'roora-steps';
    shonaSteps.forEach(function(s){
      var card = document.createElement('div');
      card.className = 'roora-step';
      card.innerHTML = '<div class="roora-step-num">' + s.n + '</div><h5>' + s.t + '</h5><p>' + s.d + '</p>';
      shonaGrid.appendChild(card);
    });
    shona.appendChild(shonaGrid);
    shona.innerHTML += '<div class="roora-callout">The groom\u2019s family is represented by the Munyai. The groom never directly carries the central bargaining role.</div>';
    body.appendChild(shona);

    var shonaTable = document.createElement('div');
    shonaTable.className = 'roora-section';
    shonaTable.innerHTML = '<h4>Shona Financial Ledger</h4>' +
      '<div class="roora-table-wrap"><table class="roora-table">' +
      '<thead><tr><th>Item</th><th>Recipient</th><th>Meaning</th><th>Range</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Vhuramuromo</td><td>Bride\u2019s brothers</td><td>Opening fee</td><td>$20\u2013$100</td></tr>' +
        '<tr><td>Kupinda Mumusha</td><td>Household</td><td>Entry fee</td><td>$20\u2013$50</td></tr>' +
        '<tr><td>Mbonano yeAmbuya</td><td>Mother</td><td>Token acknowledging mother</td><td>$100\u2013$300</td></tr>' +
        '<tr><td>Rusambo</td><td>Father / Tezvara</td><td>Core bride price</td><td>$1,500\u2013$5,000+</td></tr>' +
        '<tr><td>Danga / Cattle</td><td>Father / family herd</td><td>Livestock or cash equivalent</td><td>4\u20138 cows</td></tr>' +
        '<tr><td>Mombe yeHumai</td><td>Mother</td><td>Mandatory live cow</td><td>1 heifer</td></tr>' +
      '</tbody></table></div>';
    body.appendChild(shonaTable);

    var ndebele = document.createElement('div');
    ndebele.className = 'roora-section';
    ndebele.innerHTML = '<h4>Ndebele Amalobolo & Ikhazi Structure</h4>' +
      '<ul class="roora-ul">' +
        '<li><strong>Isivulamlomo</strong> \u2014 Token paid to open negotiations (equivalent to Vhuramuromo).</li>' +
        '<li><strong>Ikhazi</strong> \u2014 Primary cattle ledger and value structure.</li>' +
        '<li><strong>Inkomo kaBaba</strong> \u2014 Main herd dedicated to the bride\u2019s father.</li>' +
        '<li><strong>Inkomo kaMama</strong> \u2014 Specific cow for the bride\u2019s mother; cannot be reclaimed.</li>' +
        '<li><strong>Amasiko & Izibhula</strong> \u2014 Protocol items and gifts for brothers and uncles.</li>' +
        '<li><strong>Umalume Veto</strong> \u2014 The maternal uncle has formal veto authority over the process.</li>' +
      '</ul>' +
      '<div class="roora-good">The strongest structural difference: in Ndebele custom, the maternal uncle holds more direct power in the formal approval process.</div>';
    body.appendChild(ndebele);

    var umalume = document.createElement('div');
    umalume.className = 'roora-section';
    umalume.innerHTML = '<h4>Umalume Veto Power</h4>' +
      '<ul class="roora-ul">' +
        '<li>The Umalume (maternal uncle) represents maternal ancestors and has major veto authority.</li>' +
        '<li>He can halt negotiations if dissatisfied with the groom\u2019s lineage or unpaid obligations.</li>' +
        '<li>A specific share (Inkomo kaMalume) must be assigned to guarantee consent.</li>' +
      '</ul>';
    body.appendChild(umalume);

    var ledger = document.createElement('div');
    ledger.className = 'roora-section';
    ledger.innerHTML = '<h4>Cattle Ledger Detail</h4>' +
      '<div class="roora-code">CATTLE LEDGER BALANCE (Example Accounting)\n' +
      '=====================================================\n' +
      'Total Required Herd (Danga / Ikhazi): 8 Head\n' +
      '-----------------------------------------------------\n' +
      '1. Inkomo kaBaba (Father\u2019s Bull)     : 1 Paid\n' +
      '2. Inkomo yohlanga (Mother\u2019s Cow)     : 1 Paid\n' +
      '3. Inkomo kaMalume (Uncle\u2019s Cow)      : 1 Pending\n' +
      '4. Danga (Remaining Herd)               : 5 Pending\n' +
      '-----------------------------------------------------\n' +
      'Value Per Head: $300\u2013$500/head\n' +
      'Cash Settled: $600 (2 Head) | Outstanding: 6 Head\n' +
      '=====================================================</div>' +
      '<ul class="roora-ul">' +
        '<li><strong>Mombe yeMbereko:</strong> Live cow for the mother; cannot be slaughtered without her permission.</li>' +
        '<li><strong>Mombe yeDanga:</strong> Livestock for the father to build the family kraal.</li>' +
        '<li><strong>Cash indexing:</strong> Beasts can be converted to cash for partial payment tracking.</li>' +
      '</ul>';
    body.appendChild(ledger);

    var divorce = document.createElement('div');
    divorce.className = 'roora-section';
    divorce.innerHTML = '<h4>Divorce Protocols</h4>' +
      '<div class="roora-code">[Gupuro (Shona)]\nHusband/Wife \u2192 gives token \u2192 handed via Munyai \u2192 marriage void\n\n[Ukuxoshwa / Ukudiliza (Ndebele)]\nHusband/Wife \u2192 returns goods \u2192 handed via intermediary \u2192 council review</div>' +
      '<div class="roora-danger">The mother\u2019s cow or equivalent maternal allocation cannot be reclaimed or used as a simple refund asset.</div>';
    body.appendChild(divorce);

    var custody = document.createElement('div');
    custody.className = 'roora-section';
    custody.innerHTML = '<h4>Child Custody & Allocations</h4>' +
      '<div class="roora-table-wrap"><table class="roora-table">' +
      '<thead><tr><th>Allocation</th><th>Context</th><th>Purpose</th><th>Recipient</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Mombe yeChirera</td><td>Custody & separation</td><td>Maternal support</td><td>Grandparents / mother</td></tr>' +
        '<tr><td>Mombe yeGano</td><td>Out-of-wedlock</td><td>Paternity recognition</td><td>Maternal lineage</td></tr>' +
        '<tr><td>Mombe yeMhere</td><td>Birth</td><td>Birth recognition</td><td>Mother</td></tr>' +
      '</tbody></table></div>' +
      '<p style="margin-top:8px;">In both traditions, customary obligations give the father lineage rights only after proper marriage obligations are met.</p>';
    body.appendChild(custody);

    var masungiro = document.createElement('div');
    masungiro.className = 'roora-section';
    masungiro.innerHTML = '<h4>Masungiro / Pregnancy Protection</h4>' +
      '<div class="roora-code">[Pregnancy Confirmed (7th\u20138th month)]\n  \u2193\nMother returns to maiden home\n  \u2193\nCeremonial handover and rituals\n  \u2193\nBirth and postnatal care\n  \u2193\nReturn to husband\u2019s home with baby</div>' +
      '<ul class="roora-ul">' +
        '<li>Shona protocol: goats (<em>Mbudzi yeMasungiro</em>, <em>Mbudzi yechidandaro</em>).</li>' +
        '<li>Ndebele protocol: gifts, blankets, household items, and maternal family support.</li>' +
      '</ul>';
    body.appendChild(masungiro);

    renderRooraBack(body);
  }

  function renderLibraryGlossary(body){
    body.innerHTML = '<div class="lib-search"><input id="libGlossarySearch" placeholder="Search term, language, or meaning…"></div>' +
      '<div id="glossaryList"></div>';
    var list = $('glossaryList');
    function render(filter){
      list.innerHTML = '';
      var terms = glossaryTerms;
      if (filter) {
        var f = filter.toLowerCase();
        terms = terms.filter(function(t){
          return t.term.toLowerCase().includes(f) ||
            t.lang.toLowerCase().includes(f) ||
            t.lit.toLowerCase().includes(f) ||
            t.meaning.toLowerCase().includes(f) ||
            t.src.toLowerCase().includes(f);
        });
      }
      if (!terms.length) { list.innerHTML = '<div class="lib-empty">No glossary terms match.</div>'; return; }
      terms.forEach(function(t){
        var div = document.createElement('div');
        div.className = 'glossary-term';
        div.innerHTML = '<div class="gt-term">' + t.term + ' <span class="gt-lang">' + t.lang + '</span></div>' +
          '<div class="gt-lit">' + t.lit + '</div>';
        div.addEventListener('click', function(){ openGlossaryDetail(t); });
        list.appendChild(div);
      });
    }
    render('');
    var searchInput = $('libGlossarySearch');
    if (searchInput) {
      searchInput.addEventListener('input', function(){ render(searchInput.value); });
    }
  }

  function openGlossaryDetail(term){
    var existing = $('glossaryDetailOverlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'glossaryDetailOverlay';
    overlay.className = 'panel-overlay show';
    overlay.innerHTML =
      '<div class="glossary-detail-panel show">' +
        '<div class="panel-handle"></div>' +
        '<div class="gd-term">' + term.term + '</div>' +
        '<div class="gd-lang">' + term.lang + '</div>' +
        '<div class="gd-section"><div class="gd-label">Literal Translation</div><div class="gd-value">' + term.lit + '</div></div>' +
        '<div class="gd-section"><div class="gd-label">Functional Meaning</div><div class="gd-value">' + term.meaning + '</div></div>' +
        '<div class="gd-section"><div class="gd-label">Source</div><div class="gd-value gd-src">' + term.src + '</div></div>' +
        '<button class="gd-back">← Back to Glossary</button>' +
      '</div>';
    overlay.addEventListener('click', function(e){
      if (e.target === overlay) overlay.remove();
    });
    var backBtn = overlay.querySelector('.gd-back');
    backBtn.addEventListener('click', function(){ overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function renderLibraryTotems(body){
    body.innerHTML = '<div class="lib-search"><input id="libTotemSearch" placeholder="Search totem…"></div>';
    var list = document.createElement('div');
    list.id = 'libTotemList';
    body.appendChild(list);
    function render(filter){
      list.innerHTML = '';
      var keys = Object.keys(totemRegistry);
      if (filter) {
        var f = filter.toLowerCase();
        keys = keys.filter(function(k){ return k.toLowerCase().includes(f); });
      }
      if (!keys.length) { list.innerHTML = '<div class="lib-empty">No totems match.</div>'; return; }
      keys.forEach(function(key){
        var e = totemRegistry[key];
        var praises = (e.zvidawo||e.izithakazelo||[]).join(', ') || '—';
        var div = document.createElement('div');
        div.className = 'lib-totem-item';
        div.innerHTML =
          '<div class="lib-totem-name">' + key.split('(')[0].trim() + ' <span style="color:var(--accent);font-size:0.7rem;">' + (key.indexOf('(') !== -1 ? key.substring(key.indexOf('(')) : '') + '</span></div>' +
          '<div class="lib-totem-sub">' + praises + ' · ' + e.system + '</div>' +
          '<div class="lib-totem-detail" style="display:none;">' +
            (e.greeting ? '🥂 ' + e.greeting + '<br>' : '') +
            (e.proverb ? '💬 ' + e.proverb + '<br>' : '') +
            (e.taboo ? '🚫 Miko: ' + e.taboo : '') +
            '<button class="btn-sm lib-audio-btn" data-totem="' + key.replace(/"/g,'&quot;') + '" style="margin-top:6px;font-size:0.7rem;background:var(--bg-alt);color:var(--text);width:100%;">🔊 Listen to Praise</button>' +
          '</div>';
        div.addEventListener('click', function(e){
          var detail = div.querySelector('.lib-totem-detail');
          detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        });
        list.appendChild(div);
      });
    }
    render('');
    var searchInput = $('libTotemSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function(){
        render(searchInput.value);
      });
    }
  }

  function renderLibraryProverbs(body){
    var cats = {};
    proverbs.forEach(function(p){
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    var catLabels = { kinship:'👨‍👩‍👧‍👧 Family & Kinship', wisdom:'🧠 Wisdom & Elders', consequence:'⏳ Time & Consequence' };
    Object.keys(cats).forEach(function(cat){
      var sec = document.createElement('div');
      sec.className = 'lib-section';
      sec.innerHTML = '<h4>' + (catLabels[cat] || cat) + '</h4>';
      cats[cat].forEach(function(p){
        var card = document.createElement('div');
        card.className = 'lib-proverb';
        card.innerHTML = '<div class="shona">' + p.shona + '</div>' +
          '<div class="translation">' + p.translation + '</div>' +
          '<div class="meaning">' + p.meaning + '</div>';
        sec.appendChild(card);
      });
      body.appendChild(sec);
    });
  }

  function renderLibraryGreetings(body){
    var times = [
      { key:'morning', shona: timeGreetings.morning.shona, ndebele: timeGreetings.morning.ndebele },
      { key:'afternoon', shona: timeGreetings.afternoon.shona, ndebele: timeGreetings.afternoon.ndebele },
      { key:'evening', shona: timeGreetings.evening.shona, ndebele: timeGreetings.evening.ndebele },
    ];
    times.forEach(function(t){
      var card = document.createElement('div');
      card.className = 'lib-greeting';
      card.innerHTML = '<div class="time">' + t.key + '</div><div class="phrase"><strong>Shona:</strong> ' + t.shona + (t.ndebele ? ' · <strong>Ndebele:</strong> ' + t.ndebele : '') + '</div>';
      body.appendChild(card);
    });
    // Also show totem greetings
    var totemSec = document.createElement('div');
    totemSec.className = 'lib-section';
    totemSec.innerHTML = '<h4>🥂 Totem Greetings</h4>';
    var keys = Object.keys(totemRegistry);
    keys.forEach(function(key){
      var e = totemRegistry[key];
      if (e.greeting) {
        var card = document.createElement('div');
        card.className = 'lib-greeting';
        card.innerHTML = '<div class="time" style="min-width:100px;">' + key.split('(')[0].trim() + '</div><div class="phrase">' + e.greeting + '</div>';
        totemSec.appendChild(card);
      }
    });
    body.appendChild(totemSec);
  }

  function renderLibraryPoems(body){
    body.innerHTML = '<div class="lib-search"><input id="libPoemSearch" placeholder="Search praise poem…"></div>';
    var list = document.createElement('div');
    list.id = 'libPoemList';
    body.appendChild(list);
    function render(filter){
      list.innerHTML = '';
      var keys = Object.keys(totemRegistry);
      if (filter){
        var f = filter.toLowerCase();
        keys = keys.filter(function(k){ return k.toLowerCase().includes(f); });
      }
      if (!keys.length) { list.innerHTML = '<div class="lib-empty">No poems match.</div>'; return; }
      keys.forEach(function(key){
        var e = totemRegistry[key];
        var praises = (e.zvidawo||e.izithakazelo||[]);
        if (!praises.length) return;
        var div = document.createElement('div');
        div.className = 'lib-totem-item';
        div.innerHTML =
          '<div class="lib-totem-name">' + key + '</div>' +
          '<div class="lib-totem-sub">' + praises.join(' · ') + '</div>' +
          (e.greeting ? '<div class="lib-totem-detail" style="display:block;border:none;padding:2px 0 0;">🥂 ' + e.greeting + '</div>' : '');
        list.appendChild(div);
      });
    }
    render('');
    var searchInput = $('libPoemSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function(){ render(searchInput.value); });
    }
  }

  function renderLibraryRegions(body){
    body.innerHTML = '<div class="lib-search"><input id="libRegionSearch" placeholder="Search province…"></div>';
    var list = document.createElement('div');
    list.id = 'libRegionList';
    body.appendChild(list);
    function render(filter){
      list.innerHTML = '';
      var provs = provinces.slice();
      if (filter) {
        var f = filter.toLowerCase();
        provs = provs.filter(function(p){ return p.toLowerCase().includes(f); });
      }
      if (!provs.length) { list.innerHTML = '<div class="lib-empty">No regions match.</div>'; return; }
      provs.forEach(function(prov){
        var div = document.createElement('div');
        div.className = 'lib-totem-item';
        var code = prov.substring(0,2).toUpperCase();
        div.innerHTML =
          '<div class="lib-totem-name">' + prov + ' <span style="color:var(--text-dim);font-size:0.7rem;">ZW-' + code + '</span></div>' +
          '<div class="lib-totem-sub">' + districtSeed.length + ' seeded districts · ' + (prov === 'Harare'||prov==='Bulawayo' ? 'Metropolitan' : 'Rural province') + '</div>' +
          '<div class="lib-totem-detail" style="display:none;">' +
            '🏛️ Districts: ' + districtSeed.join(', ') + '<br>' +
            '📋 Village book format: ZW-' + code + '-[DISTRICT_CODE]<br>' +
            '🆔 National ID mask: 63-XXXXXXX-X-XX' +
          '</div>';
        div.addEventListener('click', function(e){
          if (e.target.classList.contains('lib-audio-btn')) return;
          var detail = div.querySelector('.lib-totem-detail');
          detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        });
        var audioBtn = div.querySelector('.lib-audio-btn');
        if (audioBtn) {
          audioBtn.addEventListener('click', function(e){
            e.stopPropagation();
            playPraiseAudio(audioBtn.dataset.totem);
          });
        }
        list.appendChild(div);
      });
    }
    render('');
    var searchInput = $('libRegionSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function(){ render(searchInput.value); });
    }
  }

  function openLibrary(){
    switchView('library');
  }
  function closeLibrary(){
    switchView('timeline');
  }

  document.querySelectorAll('.lib-tab').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.lib-tab').forEach(function(t){ t.classList.remove('active'); });
      b.classList.add('active');
      renderLibraryTab(b.dataset.libtab);
    });
  });

  /* ============================================================
     SETTINGS
     ============================================================ */
  $('settingsBtn').addEventListener('click', function(){ openSettings(); });
  $('settingsDone').addEventListener('click', function(){ closeSettings(); });

  var pdfBtn = $('pdfExportBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', exportPDF);
  var backupExportBtn = $('backupExportBtn');
  if (backupExportBtn) backupExportBtn.addEventListener('click', exportBackup);
  var backupImportBtn = $('backupImportBtn');
  if (backupImportBtn) backupImportBtn.addEventListener('click', function(){
    if (!confirm('Import backup? New records will be added. Existing records with the same ID will be skipped.')) return;
    importBackup();
  });

  $('syncImportBtn').addEventListener('click', function(){
    var raw = $('syncPayload') ? $('syncPayload').value.trim() : '';
    if (!raw) { showToast('Paste a ROOTS_SYNC payload first'); return; }
    var b64 = raw.replace(/^ROOTS_SYNC:/,'').trim();
    try {
      var decoded = atob(decodeURIComponent(b64));
      var parts = decoded.split('|');
      if (parts[0] !== 'ROOTS_V1') { showToast('Invalid payload format'); return; }
      var incoming = {
        province: parts[1] || '', district: parts[2] || '',
        villageBookId: parts[3] || '', mutupo: parts[4] || '',
        chidawo: parts[5] || '', nationalId: parts[6] || ''
      };
      var match = PEOPLE.filter(function(p){
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
          persistState();
          showToast('✅ Synced: ' + p.name + ' (v' + p.sync.versionSequence + ')');
        } else if (incomingVersion === p.sync.versionSequence) {
          p.sync._disputed = true;
          persistState();
          showToast('⚠️ Conflict flagged: ' + p.name + ' — marked DISPUTED');
        } else {
          showToast('⏭️ Skipped ' + p.name + ' (local version is newer)');
        }
      } else {
        var newId = 'sync_' + Date.now();
        var names = incoming.mutupo ? incoming.mutupo + ' (from sync)' : 'Unknown (sync import)';
        createPerson({
          id: newId, fullName: names, gender: 'u', relation: 'Sync import',
          isAlive: true,
          admin: { province: incoming.province, district: incoming.district, villageBookId: incoming.villageBookId },
          kinship: { mutupo: incoming.mutupo, chidawo: incoming.chidawo },
          sync: { versionSequence: 1, lastMutatedByDevice: 'remote', utcTimestampApprox: new Date().toISOString() }
        });
        persistState();
        showToast('📥 New profile created from sync: ' + names);
      }
    } catch(e) {
      showToast('❌ Invalid sync payload: ' + e.message);
    }
  });

  function renderPremiumStatus(){
    var statusEl = $('premiumStatus');
    var listEl = $('premiumList');
    if (!statusEl) return;
    var unlocked = [];
    var locked = [];
    var names = { bloodline:'Bloodline Switch', pdfExport:'PDF Export', sdBackup:'SD Backup', audioLibrary:'Audio Library' };
    Object.keys(state.unlocks).forEach(function(k){
      if (state.unlocks[k]) unlocked.push(names[k]||k);
      else locked.push(names[k]||k);
    });
    statusEl.innerHTML = unlocked.length
      ? '<div style="font-size:0.72rem;color:var(--lime);margin-bottom:4px;">✅ Unlocked: ' + unlocked.join(', ') + '</div>'
      : '<div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:4px;">🔒 No premium features unlocked yet</div>';
    if (listEl) {
      listEl.innerHTML = '<div style="font-size:0.68rem;color:var(--text-dim);">Used codes: ' + state.ecocashCodes.length + '</div>';
    }
  }

  function openSettings(){
    settingsOverlay.classList.add('show');
    settingsPanel.classList.add('show');
    renderPremiumStatus();
  }
  function closeSettings(){
    settingsOverlay.classList.remove('show');
    settingsPanel.classList.remove('show');
  }
  settingsOverlay.addEventListener('click', function(e){
    if(e.target === settingsOverlay) closeSettings();
  });

  $('ecocashVerifyBtn').addEventListener('click', function(){
    var code = $('ecocashInput') ? $('ecocashInput').value.trim() : '';
    var feature = $('ecocashFeature') ? $('ecocashFeature').value : 'bloodline';
    if (!verifyEcoCashCode(code)) {
      showToast('❌ Invalid or duplicate code (must be 8+ chars)');
      return;
    }
    var names = { bloodline:'Bloodline Switch', pdfExport:'PDF Export', sdBackup:'SD Backup', audioLibrary:'Audio Library' };
    state.unlocks[feature] = true;
    persistState();
    if ($('ecocashInput')) $('ecocashInput').value = '';
    renderPremiumStatus();
    showToast('✅ ' + (names[feature]||feature) + ' unlocked!');
  });

  // Toggle handlers
  ['toggleThumbs','toggleRibbon','toggleCousins','toggleQuickAdd'].forEach(function(id){
    var el = $(id);
    if(!el) return;
    el.addEventListener('click', function(){
      el.classList.toggle('on');
      var key = id.replace('toggle','').toLowerCase();
      if(key === 'thumbs') state.settings.thumbs = el.classList.contains('on');
      if(key === 'ribbon') state.settings.ribbon = el.classList.contains('on');
      if(key === 'cousins') state.settings.hideCousins = el.classList.contains('on');
      if(key === 'quickadd') state.settings.quickAddParents = el.classList.contains('on');
      persistState();
      renderTree();
    });
  });

  var colorStyleEl = $('cardColorStyle');
  if (colorStyleEl) {
    colorStyleEl.addEventListener('change', function(){
      state.settings.cardColorStyle = this.value;
      persistState();
      renderTree();
    });
  }

  var orientEl = $('cardOrientation');
  if (orientEl) {
    orientEl.addEventListener('change', function(){
      state.settings.cardOrientation = this.value;
      renderTree();
    });
  }

  $('genSlider').addEventListener('input', function(){
    $('genValue').textContent = this.value;
    state.settings.maxGen = parseInt(this.value, 10);
    renderTree();
  });

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
     DEATH & SUCCESSION PANEL
     ============================================================ */
  state.deathRecords = state.deathRecords || {};

  function openDeathPanel(personId){
    var p = byId[personId];
    if(!p) return;
    if(!state.deathRecords[personId]) state.deathRecords[personId] = createDeathRecord(personId);
    state.activeDeathPersonId = personId;
    $('deathOverlay').classList.add('show');
    $('deathPanel').classList.add('show');
    renderDeathTab('funeral');
  }

  function closeDeathPanel(){
    $('deathOverlay').classList.remove('show');
    $('deathPanel').classList.remove('show');
    state.activeDeathPersonId = null;
  }

  $('deathOverlay').addEventListener('click', function(e){
    if(e.target === $('deathOverlay')) closeDeathPanel();
  });
  $('deathDone').addEventListener('click', closeDeathPanel);

  // Death tab switching
  $('deathTabs').addEventListener('click', function(e){
    var btn = e.target.closest('.lib-tab');
    if(!btn) return;
    var tab = btn.getAttribute('data-deathtab');
    $('deathTabs').querySelectorAll('.lib-tab').forEach(function(t){ t.classList.remove('active'); });
    btn.classList.add('active');
    renderDeathTab(tab);
  });

  function renderDeathTab(tabName){
    var pid = state.activeDeathPersonId;
    if(!pid) return;
    var record = state.deathRecords[pid];
    if(!record) return;
    var p = byId[pid];
    if(!p) return;
    if(tabName === 'funeral') renderFuneralTab(record, p);
    else if(tabName === 'ritual') renderRitualTab(record, p);
    else if(tabName === 'estate') renderEstateTab(record, p);
  }

  function renderFuneralTab(record, p){
    var body = $('deathBody');
    body.innerHTML = '';
    var ls = p.lifecycleState || 'ALIVE';
    var actions = getAllowedActions(ls);

    // State badge
    var badge = document.createElement('div');
    badge.className = 'death-state-badge ' + (ls.toLowerCase());
    badge.textContent = ls.replace(/_/g, ' ');
    body.appendChild(badge);

    // Death registration fields
    var sec = document.createElement('div');
    sec.className = 'death-section';
    sec.innerHTML = '<h4>Death Registration</h4>';
    sec.innerHTML += '<div class="death-field"><label>Date of Death</label><input type="date" id="deathDate" value="' + (record.dateOfDeath||'') + '"></div>';
    sec.innerHTML += '<div class="death-field"><label>Place of Death</label><input type="text" id="deathPlace" placeholder="Hospital / home / village…" value="' + escapeHtml(record.placeOfDeath) + '"></div>';
    sec.innerHTML += '<div class="death-field"><label>Cause of Death</label><textarea id="deathCause" placeholder="Known cause (optional)">' + escapeHtml(record.causeOfDeath) + '</textarea></div>';
    sec.innerHTML += '<div class="death-field"><label>Burial Date</label><input type="date" id="burialDate" value="' + (record.funeral.burialDate||'') + '"></div>';
    sec.innerHTML += '<div class="death-field"><label>Burial Place</label><input type="text" id="burialPlace" placeholder="Cemetery / village…" value="' + escapeHtml(record.funeral.burialPlace) + '"></div>';
    body.appendChild(sec);

    // Save button
    var saveBtn = document.createElement('button');
    saveBtn.className = 'btn-sm';
    saveBtn.textContent = '💾 Save Death Record';
    saveBtn.style.width = '100%';
    saveBtn.style.marginBottom = '14px';
    saveBtn.addEventListener('click', function(){
      record.dateOfDeath = $('deathDate').value;
      record.placeOfDeath = $('deathPlace').value;
      record.causeOfDeath = $('deathCause').value;
      record.funeral.burialDate = $('burialDate').value;
      record.funeral.burialPlace = $('burialPlace').value;
      if (record.dateOfDeath && !p.died) p.died = record.dateOfDeath.split('-')[0];
      if (record.dateOfDeath) p.dateOfDeath = record.dateOfDeath;
      // Set lifecycle to DECEASED_FROZEN if alive
      if (ls === 'ALIVE' && record.dateOfDeath) {
        p.lifecycleState = 'DECEASED_FROZEN';
      }
      persistState();
      showToast('Death record saved');
      renderDeathTab('funeral');
      renderTree();
    });
    body.appendChild(saveBtn);

    // Funeral checklist
    var checkSec = document.createElement('div');
    checkSec.className = 'death-section';
    checkSec.innerHTML = '<h4>Funeral Checklist</h4><div class="death-checklist" id="funeralChecklist"></div>';
    body.appendChild(checkSec);

    var cl = $('funeralChecklist');
    record.funeral.phases.forEach(function(phase, idx){
      var item = document.createElement('div');
      item.className = 'check-item' + (phase.done ? ' done' : '');
      item.innerHTML = '<div class="check">' + (phase.done ? '✓' : '') + '</div><div class="label">' + phase.label + '</div>';
      item.addEventListener('click', function(){
        phase.done = !phase.done;
        renderDeathTab('funeral');
      });
      cl.appendChild(item);
    });

    // Transition to ritual clearance button
    if (actions.canClearRitual && record.funeral.phases.every(function(p){ return p.done; })) {
      var advBtn = document.createElement('button');
      advBtn.className = 'btn-sm';
      advBtn.textContent = '🙏 Proceed to Ritual Clearance';
      advBtn.style.width = '100%';
      advBtn.style.marginTop = '10px';
      advBtn.addEventListener('click', function(){
        p.lifecycleState = 'RITUAL_CLEARED';
        showToast('Lifecycle advanced to RITUAL_CLEARED');
        renderDeathTab('funeral');
        renderTree();
      });
      body.appendChild(advBtn);
    }
  }

  function renderRitualTab(record, p){
    var body = $('deathBody');
    body.innerHTML = '';
    var ls = p.lifecycleState || 'ALIVE';

    var badge = document.createElement('div');
    badge.className = 'death-state-badge ' + (ls.toLowerCase());
    badge.textContent = ls.replace(/_/g, ' ');
    body.appendChild(badge);

    var checkSec = document.createElement('div');
    checkSec.className = 'death-section';
    checkSec.innerHTML = '<h4>Ritual Clearance Checklist</h4><div class="death-checklist" id="ritualChecklist"></div>';
    body.appendChild(checkSec);

    var cl = $('ritualChecklist');
    record.ritual.phases.forEach(function(phase, idx){
      var item = document.createElement('div');
      item.className = 'check-item' + (phase.done ? ' done' : '');
      item.innerHTML = '<div class="check">' + (phase.done ? '✓' : '') + '</div><div class="label">' + phase.label + '</div>';
      item.addEventListener('click', function(){
        if (ls === 'DECEASED_FROZEN' || ls === 'RITUAL_CLEARED') {
          phase.done = !phase.done;
          renderRitualTab(record, p);
        }
      });
      cl.appendChild(item);
    });

    var ritualField = document.createElement('div');
    ritualField.className = 'death-field';
    ritualField.innerHTML = '<label>Officiant / Priest</label><input type="text" id="ritualOfficiant" placeholder="Name of officiant" value="' + escapeHtml(record.ritual.officiant) + '">';
    body.appendChild(ritualField);

    var ritualSave = document.createElement('button');
    ritualSave.className = 'btn-sm';
    ritualSave.textContent = '💾 Save Ritual Details';
    ritualSave.style.width = '100%';
    ritualSave.style.marginTop = '8px';
    ritualSave.addEventListener('click', function(){
      record.ritual.officiant = $('ritualOfficiant').value;
      if (record.ritual.phases.every(function(p){ return p.done; }) && ls === 'DECEASED_FROZEN') {
        p.lifecycleState = 'RITUAL_CLEARED';
        showToast('Lifecycle advanced to RITUAL_CLEARED');
        renderTree();
      }
      showToast('Ritual details saved');
      renderRitualTab(record, p);
    });
    body.appendChild(ritualSave);

    // Transition to estate
    if (ls === 'RITUAL_CLEARED' || (ls === 'DECEASED_FROZEN' && record.ritual.phases.every(function(p){ return p.done; }))) {
      var estateBtn = document.createElement('button');
      estateBtn.className = 'btn-sm';
      estateBtn.textContent = '🏠 Go to Estate Distribution';
      estateBtn.style.width = '100%';
      estateBtn.style.marginTop = '10px';
      estateBtn.addEventListener('click', function(){
        if (ls === 'DECEASED_FROZEN') {
          p.lifecycleState = 'RITUAL_CLEARED';
          renderTree();
        }
        // Switch to estate tab
        $('deathTabs').querySelectorAll('.lib-tab').forEach(function(t){ t.classList.remove('active'); });
        $('deathTabs').querySelector('[data-deathtab="estate"]').classList.add('active');
        renderDeathTab('estate');
      });
      body.appendChild(estateBtn);
    }
  }

  function renderEstateTab(record, p){
    var body = $('deathBody');
    body.innerHTML = '';
    var ls = p.lifecycleState || 'ALIVE';

    var badge = document.createElement('div');
    badge.className = 'death-state-badge ' + (ls.toLowerCase());
    badge.textContent = ls.replace(/_/g, ' ');
    body.appendChild(badge);

    if (ls !== 'RITUAL_CLEARED' && ls !== 'NHAKA_RESOLVED') {
      var gate = document.createElement('div');
      gate.className = 'estate-gate';
      gate.innerHTML = '🔒 Estate distribution is locked until ritual clearance is complete.<br><br><span style="font-size:0.7rem;color:var(--text-dim);">Complete the Ritual tab first.</span>';
      body.appendChild(gate);
      return;
    }

    // Heirs
    var heirSec = document.createElement('div');
    heirSec.className = 'death-section';
    heirSec.innerHTML = '<h4>Heirs</h4><div class="estate-heirs" id="heirList"></div><button class="btn-sm" id="addHeirBtn" style="width:100%;">+ Add Heir</button>';
    body.appendChild(heirSec);

    var hl = $('heirList');
    function renderHeirs(){
      hl.innerHTML = '';
      record.estate.heirs.forEach(function(h, idx){
        var person = byId[h.personId];
        var div = document.createElement('div');
        div.className = 'estate-heir';
        div.innerHTML = '<span class="name">' + (person ? person.name : 'Unknown') + '</span><span class="role">' + escapeHtml(h.role || 'Heir') + '</span>';
        var del = document.createElement('span');
        del.textContent = '✕';
        del.style.cssText = 'cursor:pointer;color:var(--text-dim);font-size:0.8rem;';
        del.addEventListener('click', function(){
          record.estate.heirs.splice(idx, 1);
          renderHeirs();
        });
        div.appendChild(del);
        hl.appendChild(div);
      });
    }
    renderHeirs();

    $('addHeirBtn').addEventListener('click', function(){
      var choices = PEOPLE.filter(function(x){ return x.id !== p.id && x.lifecycleState !== 'DECEASED_FROZEN'; });
      var html = '<select id="heirSelect" class="modal-input">';
      choices.forEach(function(c){
        html += '<option value="' + c.id + '">' + c.name + '</option>';
      });
      html += '</select>';
      html += '<input id="heirRole" class="modal-input" placeholder="Role (e.g. Eldest son, Executor…)">';
      html += '<button class="modal-btn" id="confirmHeir">Add Heir</button>';
      openModal('Select Heir', html, null);
      $('confirmHeir').addEventListener('click', function(){
        var sel = $('heirSelect').value;
        var role = $('heirRole').value || 'Heir';
        if (sel) {
          record.estate.heirs.push({ personId: sel, role: role });
          closeModal();
          renderEstateTab(record, p);
        }
      });
    });

    // Executor
    var execSec = document.createElement('div');
    execSec.className = 'death-section';
    var execName = record.estate.executorId && byId[record.estate.executorId] ? byId[record.estate.executorId].name : 'Not assigned';
    execSec.innerHTML = '<h4>Executor</h4><div class="infoRow"><span class="infoLabel">Executor</span><span class="infoVal">' + execName + '</span></div>';
    execSec.innerHTML += '<button class="btn-sm" id="setExecutorBtn" style="width:100%;margin-top:6px;">👤 Set Executor</button>';
    body.appendChild(execSec);

    $('setExecutorBtn').addEventListener('click', function(){
      var choices = PEOPLE.filter(function(x){ return x.id !== p.id; });
      var html = '<select id="executorSelect" class="modal-input">';
      choices.forEach(function(c){
        html += '<option value="' + c.id + '"' + (c.id === record.estate.executorId ? ' selected' : '') + '>' + c.name + '</option>';
      });
      html += '</select>';
      html += '<button class="modal-btn" id="confirmExecutor">Set Executor</button>';
      openModal('Choose Executor', html, null);
      $('confirmExecutor').addEventListener('click', function(){
        record.estate.executorId = $('executorSelect').value;
        closeModal();
        renderEstateTab(record, p);
      });
    });

    // Will notes
    var willSec = document.createElement('div');
    willSec.className = 'death-section';
    willSec.innerHTML = '<h4>Will / Estate Notes</h4><textarea id="willNotes" class="notesArea" style="min-height:80px;">' + escapeHtml(record.estate.willNotes) + '</textarea>';
    body.appendChild(willSec);

    // Estate checklist
    var checkSec = document.createElement('div');
    checkSec.className = 'death-section';
    checkSec.innerHTML = '<h4>Estate Progress</h4><div class="death-checklist" id="estateChecklist"></div>';
    body.appendChild(checkSec);

    var ecl = $('estateChecklist');
    record.estate.phases.forEach(function(phase, idx){
      var item = document.createElement('div');
      item.className = 'check-item' + (phase.done ? ' done' : '');
      item.innerHTML = '<div class="check">' + (phase.done ? '✓' : '') + '</div><div class="label">' + phase.label + '</div>';
      item.addEventListener('click', function(){
        phase.done = !phase.done;
        renderEstateTab(record, p);
      });
      ecl.appendChild(item);
    });

    // Save estate
    var saveEstate = document.createElement('button');
    saveEstate.className = 'btn-sm';
    saveEstate.textContent = '💾 Save Estate Details';
    saveEstate.style.width = '100%';
    saveEstate.style.marginTop = '8px';
    saveEstate.addEventListener('click', function(){
      record.estate.willNotes = $('willNotes').value;
      if (record.estate.phases.every(function(p){ return p.done; })) {
        p.lifecycleState = 'NHAKA_RESOLVED';
        showToast('Estate resolved — NHAKA_RESOLVED');
        renderTree();
      }
      showToast('Estate details saved');
      renderEstateTab(record, p);
    });
    body.appendChild(saveEstate);
  }

  /* ============================================================
     MARRIAGE (ROORA) PANEL
     ============================================================ */
  state.marriageLedgers = state.marriageLedgers || {};

  function getMarriageId(a, b){
    var ids = [a, b].sort();
    return 'marriage_' + ids[0] + '_' + ids[1];
  }

  function ensureMarriageLedger(a, b){
    var mid = getMarriageId(a, b);
    if (!state.marriageLedgers[mid]) {
      state.marriageLedgers[mid] = createMarriageLedger(a, b);
      state.marriageLedgers[mid].id = mid;
    }
    return state.marriageLedgers[mid];
  }

  function openMarriagePanel(personAId, personBId){
    var ledger = ensureMarriageLedger(personAId, personBId);
    state.activeMarriageId = ledger.id;
    $('marriageOverlay').classList.add('show');
    $('marriagePanel').classList.add('show');
    renderMarriagePanel(ledger);
  }

  function closeMarriagePanel(){
    $('marriageOverlay').classList.remove('show');
    $('marriagePanel').classList.remove('show');
    state.activeMarriageId = null;
  }

  $('marriageOverlay').addEventListener('click', function(e){
    if(e.target === $('marriageOverlay')) closeMarriagePanel();
  });
  $('marriageDone').addEventListener('click', closeMarriagePanel);

  function renderMarriagePanel(ledger){
    var body = $('marriageBody');
    body.innerHTML = '';
    var pA = byId[ledger.personAId];
    var pB = byId[ledger.personBId];

    // Header
    var header = document.createElement('div');
    header.className = 'marriage-header';
    header.innerHTML = '<div class="couple">' + (pA?pA.name:'?') + ' 💕 ' + (pB?pB.name:'?') + '</div><div class="status ' + ledger.status.toLowerCase() + '">' + ledger.status + '</div>';
    body.appendChild(header);

    // Progress bar
    var prog = getRooraProgress(ledger);
    var progress = document.createElement('div');
    progress.className = 'marriage-progress';
    progress.innerHTML = '<div class="bar" style="width:' + prog.percent + '%"></div>';
    body.appendChild(progress);
    var pctLabel = document.createElement('div');
    pctLabel.style.cssText = 'text-align:center;font-size:0.72rem;color:var(--text-dim);margin-bottom:12px;';
    pctLabel.textContent = prog.completed + ' of ' + prog.total + ' phases completed (' + prog.percent + '%)';
    body.appendChild(pctLabel);

    // Ledger table
    var ledgerDiv = document.createElement('div');
    ledgerDiv.className = 'marriage-ledger';
    ledger.phases.forEach(function(phase){
      var row = document.createElement('div');
      var classes = 'ledger-row';
      if (phase.status === 'COMPLETED') classes += ' complete';
      if (phase.nonRefundable) classes += ' nonrefund';
      if (phase.status !== 'COMPLETED' && phase.id !== 'kubvunza') {
        var prevDone = false;
        for (var i = 0; i < ledger.phases.length; i++) {
          if (ledger.phases[i].id === phase.id) break;
          if (ledger.phases[i].status === 'COMPLETED') prevDone = true;
        }
        // Actually use the progress from the phase array ordering
      }
      row.className = classes;
      var icon = phase.status === 'COMPLETED' ? '✅' : (phase.nonRefundable ? '🔒' : '⬜');
      row.innerHTML = '<span class="status-icon">' + icon + '</span><span class="phase">' + phase.label + '</span><span class="demand">' + phase.demanded + '</span><span class="paid">' + phase.paid + '</span>';
      row.style.cursor = 'pointer';
      row.addEventListener('click', function(){
        if (phase.status === 'COMPLETED') return;
        var res = completeRooraPhase(ledger, phase.id);
        if (!res.success) {
          showToast(res.message);
          return;
        }
        showToast('✅ ' + phase.label + ' completed!');
        renderMarriagePanel(ledger);
      });
      ledgerDiv.appendChild(row);
    });

    // Ledger total
    var total = document.createElement('div');
    total.className = 'ledger-total';
    total.innerHTML = '<span>Total</span><span>' + prog.totalPaid + ' / ' + prog.totalDemanded + ' paid</span>';
    ledgerDiv.appendChild(total);
    body.appendChild(ledgerDiv);

    // Phase description
    var activePhase = null;
    for (var i = 0; i < ledger.phases.length; i++) {
      if (ledger.phases[i].status !== 'COMPLETED') { activePhase = ledger.phases[i]; break; }
    }
    if (activePhase) {
      var desc = document.createElement('div');
      desc.style.cssText = 'background:var(--bg-alt);border-radius:8px;padding:10px;font-size:0.78rem;color:var(--text-sec);margin-bottom:10px;line-height:1.4;';
      desc.innerHTML = '<strong style="color:var(--text);">Current: ' + activePhase.label + '</strong><br>' + activePhase.desc;
      if (activePhase.nonRefundable) {
        desc.innerHTML += '<br><span style="color:var(--accent);font-weight:600;">🔒 This item is non-refundable and cannot be substituted with cash.</span>';
      }
      body.appendChild(desc);
    }

    // WhatsApp share
    var waBtn = document.createElement('button');
    waBtn.className = 'btn-sm';
    waBtn.textContent = '📤 Share Progress via WhatsApp';
    waBtn.style.width = '100%';
    waBtn.style.marginTop = '6px';
    waBtn.style.background = 'var(--wa-green)';
    waBtn.style.color = '#fff';
    waBtn.addEventListener('click', function(){
      var msg = 'ROORA PROGRESS: ' + (pA?pA.name:'?') + ' ❤️ ' + (pB?pB.name:'?') + '\n';
      msg += prog.completed + '/' + prog.total + ' phases done (' + prog.percent + '%)\n';
      ledger.phases.forEach(function(ph){
        msg += (ph.status==='COMPLETED'?'✅':'⬜') + ' ' + ph.label + ': ' + ph.paid + '/' + ph.demanded + '\n';
      });
      msg += 'Total: ' + prog.totalPaid + '/' + prog.totalDemanded + ' paid';
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    });
    body.appendChild(waBtn);
  }

  /* ============================================================
     QUICK-ADD PARENT
     ============================================================ */
  function quickAddParent(personId, which){
    var child = byId[personId];
    if (!child) return;
    if (!child.parentIds) child.parentIds = [];
    var label = which === 'father' ? 'Father' : 'Mother';
    openModal('Add ' + label, '' +
      '<div style="display:flex;flex-direction:column;gap:10px;padding:10px 0;">' +
        '<input type="text" id="qpName" placeholder="Full name" style="padding:10px;border-radius:8px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.9rem;">' +
        '<select id="qpGender" style="padding:10px;border-radius:8px;border:1px solid var(--divider);background:var(--bg);color:var(--text);font-size:0.9rem;">' +
          '<option value="m">Male</option>' +
          '<option value="f">Female</option>' +
        '</select>' +
        '<button class="btn-sm" id="qpSave" style="background:var(--lime);color:var(--text);font-weight:700;">Save ' + label + '</button>' +
      '</div>');
    $('modalCancel').textContent = 'Cancel';
    $('qpSave').addEventListener('click', function(){
      var name = $('qpName').value.trim();
      if (!name) { showToast('Please enter a name'); return; }
      var gend = $('qpGender').value;
      var newId = 'p_' + Date.now();
      createPerson({
        id: newId, fullName: name, gender: gend, relation: label,
        isAlive: true, relations: { parentIds: [], spouseIds: [], childIds: [] }
      });
      if (which === 'father') {
        child.parentIds[0] = newId;
      } else {
        child.parentIds[1] = newId;
      }
      byId[newId].relations.childIds.push(personId);
      state.generationAxis = null;
      closeModal();
      renderTree();
      persistState();
      showToast('✅ ' + label + ' added: ' + name);
    });
  }

  /* ============================================================
     PDF EXPORT (paid unlock - prints tree as printable HTML)
     ============================================================ */
  function exportPDF(){
    if (!isFeatureUnlocked('pdfExport')) {
      showToast('🔒 PDF Export requires EcoCash verification ($10/yr). Go to Settings → Premium Features.');
      return;
    }
    var win = window.open('', '_blank');
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Roots — Family Tree Export</title>' +
      '<style>body{font-family:-apple-system,sans-serif;padding:20px;color:#222;}h1{font-size:1.4rem;margin-bottom:4px;}' +
      'table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #ddd;font-size:0.85rem;}' +
      'th{background:#f5f5f2;font-weight:700;}@media print{@page{size:A4 portrait;margin:1.5cm;}}</style></head><body>' +
      '<h1>🌳 Roots Genealogy — Family Tree</h1>' +
      '<p style="color:#666;font-size:0.8rem;">Exported ' + new Date().toLocaleDateString() + ' · ' + PEOPLE.length + ' profiles</p>' +
      '<table><thead><tr><th>Name</th><th>Relation</th><th>Gender</th><th>Born</th><th>Died</th><th>Totem</th><th>Location</th></tr></thead><tbody>';
    PEOPLE.forEach(function(p){
      var k = p.kinship || {};
      html += '<tr><td>' + escapeHtml(p.name) + '</td><td>' + escapeHtml(p.relation||'') + '</td><td>' + (p.gender==='m'?'Male':p.gender==='f'?'Female':'') + '</td><td>' + (p.born||'') + '</td><td>' + (p.died||'') + '</td><td>' + escapeHtml(k.mutupo||'') + '</td><td>' + escapeHtml(p.location||'') + '</td></tr>';
    });
    html += '</tbody></table></body></html>';
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function(){ win.print(); }, 500);
    showToast('🖨️ PDF print dialog opened');
  }

  /* ============================================================
     SD CARD BACKUP (paid unlock)
     ============================================================ */
  function exportBackup(){
    if (!isFeatureUnlocked('sdBackup')) {
      showToast('🔒 SD Backup requires EcoCash verification ($10/yr). Go to Settings → Premium Features.');
      return;
    }
    var data = JSON.stringify({ exportedAt: new Date().toISOString(), version: 'ROOTS_V1', persons: PEOPLE.map(function(p){
      return { id:p.id, name:p.name, gender:p.gender, born:p.born, died:p.died, relation:p.relation, location:p.location, notes:p.notes, spouseId:p.spouseId, parentIds:p.parentIds, admin:p.admin, ethnicity:p.ethnicity, kinship:p.kinship, oral:p.oral, relations:p.relations, lifecycleState:p.lifecycleState, media:p.media, sync:p.sync };
    }), totemRegistry: totemRegistry, provinces: provinces, proverbs: proverbs }, null, 2);
    var blob = new Blob([data], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'roots_backup_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('💾 Full backup downloaded (' + PEOPLE.length + ' records)');
  }

  function importBackup(){
    if (!isFeatureUnlocked('sdBackup')) {
      showToast('🔒 SD Backup restore requires EcoCash verification. Go to Settings → Premium Features.');
      return;
    }
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.addEventListener('change', function(e){
      var file = e.target.files[0];
      if (!file) return;
      showLoading('Restoring backup…');
      var reader = new FileReader();
      reader.onload = function(ev){
        try {
          var data = JSON.parse(ev.target.result);
          if (data.persons && Array.isArray(data.persons)) {
            data.persons.forEach(function(imp){
              if (!byId[imp.id]) {
                PEOPLE.push(imp);
                byId[imp.id] = imp;
                imp._upgraded = true;
              }
            });
            state.generationAxis = null;
            hideLoading();
            showToast('✅ Restored ' + data.persons.length + ' profiles from backup');
            renderTree();
          } else {
            hideLoading();
            showToast('❌ Invalid backup format');
          }
        } catch(err) { hideLoading(); showToast('❌ Error reading backup: ' + err.message); }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  /* ============================================================
     TOTEMIC PRAISE AUDIO LIBRARY (paid unlock)
     ============================================================ */
  var audioLibrary = {};
  function playPraiseAudio(totemKey){
    if (!isFeatureUnlocked('audioLibrary')) {
      showToast('🔒 Audio Library requires EcoCash verification ($10/yr). Go to Settings → Premium Features.');
      return;
    }
    // Generate text-to-speech using Web Speech API (offline-friendly)
    var entry = totemRegistry[totemKey];
    if (!entry) { showToast('No praise data for this totem'); return; }
    var praises = (entry.zvidawo||entry.izithakazelo||[]);
    var text = praises.length ? praises.join(', ') : entry.greeting || totemKey;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.85;
      utter.onend = function(){ showToast('🔊 Playback finished'); };
      window.speechSynthesis.speak(utter);
      showToast('🔊 Playing praise: ' + text.substring(0,40) + '…');
    } else {
      showToast('❌ Text-to-speech not available on this device');
    }
  }

  /* ============================================================
     BLOODLINE SWITCH
     ============================================================ */
  state.bloodlineStack = state.bloodlineStack || [];

  function switchBloodline(personId){
    var p = byId[personId];
    if (!p) return;
    if (!isFeatureUnlocked('bloodline')) {
      showToast('🔒 Bloodline Switch requires EcoCash verification ($10/yr). Go to Settings → Premium Features.');
      return;
    }
    state.bloodlineStack.push(state.myId || 'you');
    state.myId = personId;
    renderTree();
    showToast('Switched to ' + p.name + '\'s bloodline');
  }

  function resetBloodline(){
    state.myId = 'you';
    state.bloodlineStack = [];
    renderTree();
  }

  function goBackBloodline(){
    if (state.bloodlineStack.length === 0) { resetBloodline(); return; }
    var prev = state.bloodlineStack.pop();
    state.myId = prev;
    renderTree();
  }

  function renderBloodlineIndicator(){}



  // Patch showScreen to re-render tree when coming back
  var _origShowScreen = showScreen;
  showScreen = function(id){
    _origShowScreen(id);
    if (id === 'regular') {
      renderTree();
    }
  };

  // Patch renderProfilePanel to add "Mark Deceased" in Info tab
  var _origRenderProfilePanel = renderProfilePanel;
  renderProfilePanel = function(p){
    var wasCached = _panelPersonId === p.id;
    _origRenderProfilePanel(p);
    if (wasCached) return; // lifecycle rows already in DOM from first render
    // Add lifecycle actions to Info tab
    var ip = $('pane-info');
    var actions = getAllowedActions(p.lifecycleState || 'ALIVE');

    // Lifecycle state row
    var lsRow = document.createElement('div'); lsRow.className = 'infoRow';
    var badgeHtml = '<span class="death-state-badge ' + ((p.lifecycleState||'ALIVE').toLowerCase()) + '">' + (p.lifecycleState||'ALIVE').replace(/_/g,' ') + '</span>';
    lsRow.innerHTML = '<span class="infoLabel">Lifecycle</span><span class="infoVal">' + badgeHtml + '</span>';
    ip.appendChild(lsRow);

    if ((p.lifecycleState === 'ALIVE' || !p.lifecycleState) && !p.died) {
      var markBtn = document.createElement('button');
      markBtn.className = 'btn-sm';
      markBtn.textContent = '⚰️ Mark as Deceased';
      markBtn.style.width = '100%';
      markBtn.style.marginTop = '8px';
      markBtn.addEventListener('click', function(){
        openDeathPanel(p.id);
        if (!state.deathRecords[p.id]) state.deathRecords[p.id] = createDeathRecord(p.id);
      });
      ip.appendChild(markBtn);
    } else if (p.lifecycleState !== 'ALIVE' && p.lifecycleState !== 'NHAKA_RESOLVED') {
      var deathBtn = document.createElement('button');
      deathBtn.className = 'btn-sm';
      deathBtn.textContent = '⚰️ Open Death & Succession';
      deathBtn.style.width = '100%';
      deathBtn.style.marginTop = '8px';
      deathBtn.addEventListener('click', function(){
        openDeathPanel(p.id);
      });
      ip.appendChild(deathBtn);
    }

    // Spiritual Lineage Override (Ngozi / Kumutsa Mapfihwa)
    var slRow = document.createElement('div'); slRow.className = 'infoRow';
    var overrideId = p.kinship && p.kinship.customaryLineageOverrideId;
    var overridePerson = overrideId && byId[overrideId];
    slRow.innerHTML = '<span class="infoLabel">Spiritual Lineage</span><span class="infoVal">' + (overridePerson ? overridePerson.name : 'None (biological)') + '</span>';
    ip.appendChild(slRow);
    var slNote = document.createElement('div');
    slNote.style.cssText = 'font-size:0.65rem;color:var(--text-dim);padding:0 0 8px 0;line-height:1.3;font-style:italic;';
    slNote.textContent = 'Override only for Ngozi / Kumutsa Mapfihwa cases. Confirmed by family elders — never auto-computed.';
    ip.appendChild(slNote);

    // Kinship tab — add bloodline switch
    if (p.id !== 'you' && p.spouseId) {
      var kp = $('pane-kinship');
      var blBtn = document.createElement('button');
      blBtn.className = 'btn-sm';
      blBtn.textContent = '🔄 View ' + p.name.split(' ')[0] + '\'s Bloodline';
      blBtn.style.width = '100%';
      blBtn.style.marginTop = '8px';
      blBtn.addEventListener('click', function(){
        switchBloodline(p.id);
        closeProfile();
      });
      kp.appendChild(blBtn);
    }
  };

  // Patch buildEventCards to include lifecycle state
  var _origBuildEventCards = buildEventCards;
  buildEventCards = function(p){
    var cards = _origBuildEventCards(p);
    if (p.lifecycleState && p.lifecycleState !== 'ALIVE') {
      cards.push({type:'', title:'Lifecycle', body: 'Status: ' + p.lifecycleState.replace(/_/g, ' ') + '.'});
    }
    return cards;
  };

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
  showScreen('welcome');

})();
