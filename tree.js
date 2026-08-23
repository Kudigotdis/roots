/* ============================================================
   ROOTS TREE — Temporal Cascade Matrix engine (tree.html)
   Extracted from app.js. Owns: tree view, ego picker, profile
   panel overlays, death/marriage panels, quick-add, PDF export,
   bloodline switch. Owned by: Tree dev.
   Data layer: data.js globals + roots_app_state via RootsStore.
   ============================================================ */
(function(){
'use strict';

/* ---------- STATE (seeded from shared store) ---------- */
var savedState = window.RootsStore.read();
var state = {
  screen: 'regular', activeView: 'tree', activeProfileTab: 'lifestory',
  scale: 0.85, tx: 0, ty: 0,
  expanded: new Set(savedState.expanded || []),
  images: savedState.images || {}, gallery: savedState.gallery || {}, notes: savedState.notes || {},
  activePersonId: null, isPanning: false, panStart: {x:0,y:0}, txStart: 0, tyStart: 0,
  settings: Object.assign({ thumbs:true, ribbon:true, hideCousins:false, maxGen:5, quickAddParents:true, cardColorStyle:'gender', cardOrientation:'vertical' }, savedState.settings || {}),
  unlocks: Object.assign({ bloodline:false, pdfExport:false, sdBackup:false, audioLibrary:false }, savedState.unlocks || {}),
  ecocashCodes: savedState.ecocashCodes || [],
  myId: savedState.myId || 'you',
  deathRecords: savedState.deathRecords || {},
  bloodlineStack: savedState.bloodlineStack || [],
  marriageLedgers: savedState.marriageLedgers || {},
  activeDeathPersonId: null, activeMarriageId: null,
  executorId: null, heirs: null, willNotes: null, generationAxis: null, phases: null
};

var PERSIST_KEY = 'roots_app_state';
function persistState(){
  try {
    var s = window.RootsStore.read();
    var keys = ['myId','postIdCounter','images','gallery','notes','deathRecords','unlocks','ecocashCodes','settings','bloodlineStack','marriageLedgers'];
    keys.forEach(function(k){ s[k] = state[k]; });
    s.expanded = state.expanded instanceof Set ? Array.from(state.expanded) : [];
    localStorage.setItem(PERSIST_KEY, JSON.stringify(s));
  } catch(e) {
    showToast('\u26A0\uFE0F Storage full. Some changes may not be saved.');
  }
}

function isFeatureUnlocked(feature){ return !!state.unlocks[feature]; }

/* ---------- HELPERS (shared copies) ---------- */
var $ = function(id){ return document.getElementById(id); };

var toastQueue = [];
var toastTimer = null;
function showToast(msg){
  var el = $('toast');
  if (!el) return;
  toastQueue.push(msg);
  if (toastTimer) return;
  (function showNext(){
    if (!toastQueue.length) { el.classList.remove('show'); toastTimer = null; return; }
    el.textContent = toastQueue.shift();
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){
      el.classList.remove('show');
      toastTimer = setTimeout(showNext, 200);
    }, 3000);
  })();
}

function escapeHtml(str){
  if (str === null || str === undefined) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
function sanitizeImageSrc(src){
  if (!src || typeof src !== 'string') return '';
  if (src.indexOf('data:image/') === 0) return src;
  if (src.indexOf('blob:') === 0) return src;
  return '';
}

var fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';
fileInput.id = 'hiddenFileInput';
document.body.appendChild(fileInput);
function triggerImageUpload(cb){
  fileInput.onchange = function(e){
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function(){ cb(r.result); };
    r.readAsDataURL(f);
    e.target.value = '';
  };
  fileInput.click();
}

/* ---------- DOM REFS ---------- */
var overlay = $('profilePanelOverlay');
var panel = $('profilePanel');
var panelThumb = $('panelThumb');
var panelThumbInner = $('panelThumbInner');
var panelName = $('panelName');
var panelMeta = $('panelMeta');
var settingsOverlay = $('settingsOverlay');
var settingsPanel = $('settingsPanel');
var modalOverlay = $('modalOverlay');
var modalSheet = $('modalSheet');

/* ---------- MODAL SYSTEM (local copy for tree dialogs) ---------- */
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



  // (old showScreen patch removed - tree is now its own page)

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

  /* ---------- SELF-BOOT + SHARED HOOKS ---------- */
  window.__rootsTreeRefresh = function(){ persistState(); renderTree(); };
  window.__rootsPdfExport = function(){ if (typeof exportPDF === 'function') exportPDF(); };

  renderTree();
})();
