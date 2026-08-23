/* ============================================================
   ROOTS ONBOARDING — Regular User registration wizard.
   8 steps · live required-field tally · draft autosave.
   Creates the canonical user record (roots_user), an auth stub
   (roots_auth — hashed password only) and a session that links
   the new person node into the app (familyTreePersonId).
   ============================================================ */
(function () {
  'use strict';

  function $(id){ return document.getElementById(id); }

  var DRAFT_KEY = 'roots_onboarding_draft';
  var SUBMITTED_AREAS_KEY = 'submitted_areas';

  /* ---------------- form state ---------------- */
  var f = {
    profilePhoto: null,
    firstName: '', surname: '', username: '',
    dateOfBirth: '', gender: '',
    nationalityCode: '', nationalityName: '',
    race: '', raceOther: null,
    mobileNumbers: [], whatsappNumbers: [],
    email: null,
    countryOfResidence: '', province: '', townCityVillage: '', areaNeighbourhood: '',
    regionGeneric: '', cityGeneric: '',
    education: { creche: [], primary: [], secondary: [], tertiary: [] },
    socials: {}, interests: [],
    password: '', passwordConfirm: ''
  };

  var takenUsernames = [];
  try {
    var existing = JSON.parse(localStorage.getItem('roots_user') || 'null');
    if (existing && existing.username) takenUsernames.push(existing.username.toLowerCase());
  } catch (e) {}

  /* restore draft */
  try {
    var draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (draft) {
      Object.keys(draft).forEach(function (k) {
        if (!(k === 'password' || k === 'passwordConfirm')) f[k] = draft[k];
      });
      if (!f.education) f.education = { creche: [], primary: [], secondary: [], tertiary: [] };
    }
  } catch (e) {}

  var saveTimer = null;
  function saveDraft(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){
      var copy = {}; Object.keys(f).forEach(function(k){
        copy[k] = (k === 'password' || k === 'passwordConfirm') ? '' : f[k];
      });
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(copy)); } catch(e){}
    }, 350);
  }

  function showToast(msg){
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function(){ t.classList.remove('show'); }, 2600);
  }

  /* ============================================================
     STEP NAVIGATION
     ============================================================ */
  var TOTAL_STEPS = 8;
  var STEP_KEYS = {
    1: ['firstName','surname','username','dateOfBirth','gender','nationality','race'],
    2: ['mobileNumbers','whatsappNumbers'],
    3: ['countryOfResidence','locationDetail'],
    4: [],
    5: ['interests'],
    6: ['password','passwordConfirm'],
    7: null // all
  };
  var cur = 1;

  function stepEl(n){ return document.querySelector('.ob-step[data-step="' + n + '"]'); }

  function goTo(n){
    cur = Math.max(1, Math.min(TOTAL_STEPS, n));
    document.querySelectorAll('.ob-step').forEach(function(s){ s.classList.remove('active'); });
    stepEl(cur).classList.add('active');
    $('obBar').style.width = (cur / TOTAL_STEPS * 100) + '%';
    $('obStepNum').textContent = cur + '/' + TOTAL_STEPS;
    $('obPrev').style.visibility = cur === 1 ? 'hidden' : 'visible';
    $('obNext').textContent = cur === 7 ? 'Review complete →' : (cur === 8 ? '' : 'Continue →');
    $('obNext').style.display = cur >= 8 ? 'none' : '';
    if (cur === 7) renderReview();
    refreshCountChip();
    document.querySelector('.ob-body').scrollTop = 0;
  }

  function refreshCountChip(){
    var r = window.validateRegistration(f);
    $('obCountChip').textContent = 'Required: ' + r.completed + '/' + r.required +
      (r.valid ? '  ✓ READY' : '');
    $('obCountChip').style.color = r.valid ? '#3d8b40' : 'var(--accent)';
  }

  function validateStep(n){
    var keys = STEP_KEYS[n];
    if (keys === null || n === 7) return window.validateRegistration(f);
    return window.validateRegistration(Object.assign({}, f, { _stepOnly: true }));
  }

  function stepHasErrors(n){
    var keys = STEP_KEYS[n] || [];
    if (!keys.length) return [];
    var r = window.validateRegistration(f);
    return r.checks.filter(function(c){ return keys.indexOf(c.key) !== -1 && !c.ok; });
  }

  function markInvalid(stepN, badKeys){
    stepEl(stepN).querySelectorAll('.ob-invalid').forEach(function(el){ el.classList.remove('ob-invalid'); });
    var map = {
      firstName:['obFirstName'], surname:['obSurname'], username:['obUsername'],
      dateOfBirth:['obDd','obMm','obYy'], gender:null, nationality:['obNationality'],
      race:null, mobileNumbers:null, whatsappNumbers:null,
      countryOfResidence:['obCountry'], locationDetail:null,
      interests:null, password:['obPassword'], passwordConfirm:['obPasswordConfirm']
    };
    badKeys.forEach(function(k){
      (map[k] || []).forEach(function(id){ $(id) && $(id).classList.add('ob-invalid'); });
    });
  }

  $('obNext').addEventListener('click', function(){
    var errs = stepHasErrors(cur);
    if (errs.length){
      markInvalid(cur, errs.map(function(e){ return e.key; }));
      showToast('⚠️ ' + errs[0].label);
      refreshCountChip();
      return;
    }
    if (cur === 7) { finishRegistration(); return; }
    goTo(cur + 1);
  });
  $('obPrev').addEventListener('click', function(){ goTo(cur - 1); });
  $('obBack').addEventListener('click', function(){
    saveDraft();
    location.href = 'index.html';
  });

  /* ============================================================
     STEP 1 — IDENTITY
     ============================================================ */
  /* photo with downscale */
  $('obPhoto').addEventListener('change', function(ev){
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function(){
      var MAXS = 512;
      var sc = Math.min(1, MAXS / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      f.profilePhoto = c.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      showPhoto();
      saveDraft();
    };
    img.src = url;
  });
  function showPhoto(){
    if (f.profilePhoto){
      $('obPhotoPreview').src = f.profilePhoto;
      $('obPhotoPreview').style.display = 'block';
      $('obPhotoHint').style.display = 'none';
    }
  }

  bindText('obFirstName', 'firstName');
  bindText('obSurname', 'surname');

  /* username */
  var unameTimer = null;
  $('obUsername').addEventListener('input', function(){
    clearTimeout(unameTimer);
    unameTimer = setTimeout(function(){
      var raw = $('obUsername').value.trim().replace(/^@/, '').toLowerCase();
      $('obUsername').value = raw.replace(/[^a-z0-9._]/g, '');
      f.username = $('obUsername').value;
      var st = $('obUsernameStatus');
      if (!f.username){ st.textContent = ''; st.className = 'ob-status'; }
      else if (!/^[a-z0-9._]+$/.test(f.username)){ st.textContent = '✗ Only letters, numbers, _ and .'; st.className='ob-status bad'; }
      else if (f.username.length < 3){ st.textContent = '✗ Too short (min 3)'; st.className='ob-status bad'; }
      else if (takenUsernames.indexOf(f.username) !== -1){ st.textContent = '✗ Username already taken'; st.className='ob-status bad'; }
      else { st.textContent = '✓ @' + f.username + ' available'; st.className='ob-status ok'; }
      saveDraft();
    }, 200);
  });

  /* DOB selectors */
  (function initDob(){
    var dd = $('obDd'), mm = $('obMm'), yy = $('obYy');
    for (var i = 1; i <= 31; i++) dd.insertAdjacentHTML('beforeend', '<option>' + i + '</option>');
    var MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    MN.forEach(function(m, i){ mm.insertAdjacentHTML('beforeend', '<option value="' + (i + 1) + '">' + m + '</option>'); });
    var nowY = new Date().getFullYear();
    for (var y = nowY; y >= 1900; y--) yy.insertAdjacentHTML('beforeend', '<option>' + y + '</option>');
    function upd(){
      if (dd.value && mm.value && yy.value){
        var pad = function(v){ return String(v).padStart(2, '0'); };
        f.dateOfBirth = yy.value + '-' + pad(mm.value) + '-' + pad(dd.value);
      } else f.dateOfBirth = '';
      saveDraft(); refreshCountChip();
    }
    [dd, mm, yy].forEach(function(sel){ sel.addEventListener('change', upd); });
    if (f.dateOfBirth){
      var p = f.dateOfBirth.split('-');
      yy.value = p[0]; mm.value = String(+p[1]); dd.value = String(+p[2]);
    }
  })();

  /* gender */
  document.querySelectorAll('.ob-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.ob-toggle').forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      f.gender = btn.dataset.g;
      saveDraft(); refreshCountChip();
    });
    if (f.gender === btn.dataset.g) btn.classList.add('on');
  });

  /* nationality */
  (function initNat(){
    var sel = $('obNationality');
    var cs = window.RegData.countries.slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
    cs.forEach(function(c){
      sel.insertAdjacentHTML('beforeend',
        '<option value="' + c.code + '">' + c.nationality + ' (' + c.name + ')</option>');
    });
    if (f.nationalityCode) sel.value = f.nationalityCode;
    sel.addEventListener('change', function(){
      f.nationalityCode = sel.value;
      var c = RegData.countryByCode[sel.value];
      f.nationalityName = c ? c.nationality : '';
      saveDraft(); refreshCountChip();
    });
  })();

  /* race chips */
  (function initRace(){
    var wrap = $('obRaceChips');
    RegData.races.forEach(function(rname){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (f.race === rname.toLowerCase() ? ' on' : '');
      b.textContent = rname;
      b.addEventListener('click', function(){
        f.race = rname.toLowerCase();
        wrap.querySelectorAll('.chip').forEach(function(x){ x.classList.remove('on'); });
        b.classList.add('on');
        $('obRaceOther').style.display = f.race === 'other' ? '' : 'none';
        saveDraft(); refreshCountChip();
      });
      wrap.appendChild(b);
    });
    if (f.race === 'other') $('obRaceOther').style.display = '';
    $('obRaceOther').addEventListener('input', function(){ f.raceOther = this.value.trim() || null; saveDraft(); });
    $('obRaceOther').value = f.raceOther || '';
  })();

  function bindText(id, key){
    var el = $(id);
    el.addEventListener('input', function(){ f[key] = this.value.trim(); saveDraft(); });
    el.value = f[key] || '';
  }

  /* ============================================================
     STEP 2 — CONTACT
     ============================================================ */
  function dialOptions(selected){
    var html = '<option value="">Code</option>';
    RegData.countries.forEach(function(c){
      html += '<option value="' + c.code + '" data-dial="' + c.dial + '"' +
        (c.code === selected ? ' selected' : '') + '>' + c.name + ' ' + c.dial + '</option>';
    });
    return html;
  }

  function renderNumberRows(listEl, arr, kind){
    listEl.innerHTML = '';
    arr.forEach(function(item, idx){
      var row = document.createElement('div');
      row.className = 'ob-numrow';
      row.innerHTML =
        '<input class="lbl" placeholder="Label" value="' + (item.label || '') + '">' +
        '<select class="cc">' + dialOptions(item.country) + '</select>' +
        '<input class="num" placeholder="' + (kind === 'wa' ? 'WhatsApp number' : 'Mobile number') + '" value="' + (item.number || '') + '">' +
        (kind === 'mob' ? '<select class="net"></select>' :
          '<div style="flex-basis:100%;"><div class="ob-wa-status' + (item.verified ? ' ok' : '') + '">' +
          (item.verified ? '✓ Verified' : '○ Not verified') + '</div>' +
          '<button type="button" class="ob-sendcode">Send verification code</button></div>') +
        '<button type="button" class="del" title="Remove">✕</button>';
      row.querySelector('.lbl').addEventListener('input', function(){ item.label = this.value.trim(); saveDraft(); });
      var ccSel = row.querySelector('.cc');
      function applyCc(){
        item.country = ccSel.value;
        var c = RegData.countryByCode[ccSel.value];
        item.countryCode = c ? c.dial : '';
        var nets = window.RegData.networksFor(ccSel.value);
        var netSel = row.querySelector('.net');
        if (netSel){
          netSel.innerHTML = '<option value="">Network</option>' +
            nets.map(function(n){ return '<option' + (item.network === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
            '<option' + (item.network && nets.indexOf(item.network) === -1 ? ' selected' : '') + '>Other</option>';
          row.classList.toggle('hasnet', nets.length > 0);
        }
        saveDraft();
      }
      ccSel.addEventListener('change', applyCc);
      applyCc();
      ccSel.value = item.country || '';
      ccSel.dispatchEvent(new Event('change'));
      row.querySelector('.num').addEventListener('input', function(){ item.number = this.value.trim(); saveDraft(); });
      var netSel2 = row.querySelector('.net');
      if (netSel2) netSel2.addEventListener('change', function(){ item.network = netSel2.value === 'Other' ? (item.network || 'Other') : netSel2.value; saveDraft(); });
      var sendBtn = row.querySelector('.ob-sendcode');
      if (sendBtn) sendBtn.addEventListener('click', function(){
        showToast('📨 Verification codes arrive once WhatsApp verification is connected.');
      });
      row.querySelector('.del').addEventListener('click', function(){
        arr.splice(idx, 1);
        renderNumberRows(listEl, arr, kind);
        saveDraft(); refreshCountChip();
      });
      listEl.appendChild(row);
    });
  }

  function ensureOne(arr, kind){
    if (!arr.length) arr.push(kind === 'mob'
      ? { label: 'Primary', country: 'ZW', countryCode: '+263', number: '', network: '' }
      : { label: 'Primary', country: 'ZW', countryCode: '+263', number: '', verified: false });
  }
  ensureOne(f.mobileNumbers, 'mob');
  ensureOne(f.whatsappNumbers, 'wa');
  renderNumberRows($('obMobileList'), f.mobileNumbers, 'mob');
  renderNumberRows($('obWhatsList'), f.whatsappNumbers, 'wa');
  $('obAddMobile').addEventListener('click', function(){
    f.mobileNumbers.push({ label: '', country: f.countryOfResidence || 'ZW', countryCode: '', number: '', network: '' });
    renderNumberRows($('obMobileList'), f.mobileNumbers, 'mob'); saveDraft();
  });
  $('obAddWhats').addEventListener('click', function(){
    f.whatsappNumbers.push({ label: '', country: f.countryOfResidence || 'ZW', countryCode: '', number: '', verified: false });
    renderNumberRows($('obWhatsList'), f.whatsappNumbers, 'wa'); saveDraft();
  });

  $('obEmail').addEventListener('input', function(){
    var v = this.value.trim().toLowerCase();
    f.email = v ? v : null;
    saveDraft();
  });
  $('obEmail').value = f.email || '';

  /* ============================================================
     STEP 3 — LOCATION
     ============================================================ */
  var PROVINCES_ZW = ['Bulawayo','Harare Province','Manicaland','Mashonaland Central',
    'Mashonaland East','Mashonaland West','Matabeleland North','Matabeleland South',
    'Midlands','Masvingo'];

  (function initCountry(){
    var sel = $('obCountry');
    var cs = RegData.countries.slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
    cs.forEach(function(c){ sel.insertAdjacentHTML('beforeend', '<option value="' + c.code + '">' + c.name + '</option>'); });
    sel.value = f.countryOfResidence || '';
    sel.addEventListener('change', function(){
      f.countryOfResidence = sel.value;
      // reset dependent selections safely
      f.province = ''; f.townCityVillage = ''; f.areaNeighbourhood = '';
      f.regionGeneric = ''; f.cityGeneric = '';
      syncLocationUi(); saveDraft(); refreshCountChip();
    });
  })();

  function zwTowns(){
    var out = [];
    var D = window.ZIMBABWE_LOCATIONS_DATA || { districts: [] };
    D.districts.forEach(function(d){
      (d.towns || []).forEach(function(t){ out.push(t); });
    });
    return out;
  }

  function syncLocationUi(){
    var isZw = f.countryOfResidence === 'ZW';
    $('obZwLoc').style.display = isZw ? '' : 'none';
    $('obGenLoc').style.display = isZw ? 'none' : '';
    if (!isZw) return;

    var prov = $('obProvince');
    if (!prov.options.length){
      PROVINCES_ZW.forEach(function(p){ prov.insertAdjacentHTML('beforeend', '<option>' + p + '</option>'); });
      prov.addEventListener('change', function(){ f.province = prov.value; saveDraft(); refreshCountChip(); });
    }
    prov.value = f.province || '';

    var towns = zwTowns();
    $('obTownList').innerHTML = towns.map(function(t){ return '<option value="' + t.name.replace(/"/g,'&quot;') + '">'; }).join('');
    var townIn = $('obTown');
    townIn.value = f.townCityVillage || '';
    townIn.oninput = function(){
      f.townCityVillage = this.value.trim();
      var match = towns.find(function(t){ return t.name.toLowerCase() === f.townCityVillage.toLowerCase(); });
      $('obAreaList').innerHTML = match ? match.areas.map(function(a){ return '<option value="' + a.replace(/"/g,'&quot;') + '">'; }).join('') : '';
      saveDraft(); refreshCountChip();
    };
    var areaIn = $('obArea');
    areaIn.value = f.areaNeighbourhood || '';
    areaIn.oninput = function(){ f.areaNeighbourhood = this.value.trim(); saveDraft(); };

    $('obRegionGeneric').oninput = function(){ f.regionGeneric = this.value.trim(); saveDraft(); refreshCountChip(); };
    $('obCityGeneric').oninput = function(){ f.cityGeneric = this.value.trim(); saveDraft(); refreshCountChip(); };
    $('obAreaGeneric').oninput = function(){ f.areaNeighbourhood = this.value.trim(); saveDraft(); };
    $('obRegionGeneric').value = f.regionGeneric || '';
    $('obCityGeneric').value = f.cityGeneric || '';
    $('obAreaGeneric').value = f.areaNeighbourhood || '';
  }

  $('obSubmitArea').addEventListener('click', function(){
    var rec = {
      submittedBy: f.username || 'anonymous',
      country: f.countryOfResidence || '',
      province: f.province || f.regionGeneric || '',
      town: f.townCityVillage || f.cityGeneric || '',
      area: f.areaNeighbourhood || '',
      status: 'pending',
      createdAt: Date.now()
    };
    if (!rec.area){ showToast('Type the missing area name first.'); return; }
    var all = [];
    try { all = JSON.parse(localStorage.getItem(SUBMITTED_AREAS_KEY) || '[]'); } catch (e) {}
    all.push(rec);
    try { localStorage.setItem(SUBMITTED_AREAS_KEY, JSON.stringify(all)); } catch (e) {}
    showToast('✅ Area submitted for review — saved locally.');
  });

  syncLocationUi();

  /* ============================================================
     STEP 4 — EDUCATION
     ============================================================ */
  function schoolSuggest(inputEl){
    var drop = document.createElement('div');
    drop.className = 'suggest-drop';
    inputEl.parentNode.classList.add('suggest');
    inputEl.parentNode.appendChild(drop);
    inputEl.addEventListener('input', function(){
      var q = inputEl.value.trim().toLowerCase();
      if (!q || !window.SCHOOLS_ZW){ drop.style.display = 'none'; return; }
      var starts = [], incl = [];
      for (var i = 0; i < window.SCHOOLS_ZW.length && (starts.length < 12 || incl.length < 12); i++){
        var s = window.SCHOOLS_ZW[i], l = s.toLowerCase();
        if (l.indexOf(q) === 0) starts.push(s);
        else if (l.indexOf(q) !== -1) incl.push(s);
      }
      var hits = starts.concat(incl).slice(0, 12);
      if (!hits.length){ drop.style.display = 'none'; return; }
      drop.innerHTML = hits.map(function(h){ return '<div>' + h + '</div>'; }).join('');
      drop.style.display = 'block';
      Array.prototype.forEach.call(drop.children, function(opt){
        opt.addEventListener('mousedown', function(ev){
          ev.preventDefault();
          inputEl.value = opt.textContent;
          inputEl.dispatchEvent(new Event('change'));
          drop.style.display = 'none';
        });
      });
    });
    inputEl.addEventListener('blur', function(){ setTimeout(function(){ drop.style.display = 'none'; }, 150); });
  }

  function eduEntryHtml(catKey, e){
    var isTer = catKey === 'tertiary';
    return '<div class="edu-entry">' +
      '<div class="ob-field"><label>Institution name</label>' +
      '<input type="text" class="e-inst" value="' + (e.institution || '') + '" placeholder="' + (isTer ? 'University / College…' : 'School name or manual entry…') + '"></div>' +
      '<div class="ob-numrow"><div class="ob-field lbl2" style="flex:1;"><label>Country</label>' +
      '<select class="e-country"><option value="">Select…</option>' +
      RegData.countries.map(function(c){ return '<option value="' + c.code + '"' + (c.code === (e.country || f.countryOfResidence) ? ' selected' : '') + '>' + c.name + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="ob-field" style="flex:1;"><label>Province / Region</label><input type="text" class="e-prov" value="' + (e.provinceRegion || '') + '"></div></div>' +
      '<div class="ob-numrow">' +
      '<div class="ob-field" style="flex:1;"><label>Town / City</label><input type="text" class="e-city" value="' + (e.city || '') + '"></div>' +
      '<div class="ob-field" style="flex:.6;"><label>Start</label><input type="number" class="e-start" value="' + (e.startYear || '') + '"></div>' +
      '<div class="ob-field" style="flex:.6;"><label>End</label><input type="number" class="e-end" value="' + (e.endYear || '') + '"></div></div>' +
      (isTer ?
        '<div class="ob-numrow">' +
        '<div class="ob-field" style="flex:1;"><label>Institution type</label><select class="e-type">' +
        window.RegData.tertiaryTypes.map(function(t){ return '<option' + (t === e.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
        '<div class="ob-field" style="flex:1;"><label>Qualification</label><input type="text" class="e-qual" value="' + (e.qualification || '') + '"></div></div>' +
        '<div class="ob-field"><label>Field of study</label><input type="text" class="e-field" value="' + (e.fieldOfStudy || '') + '"></div>'
        : '') +
      '<button type="button" class="ob-linkbtn e-del">✕ Remove institution</button></div>';
  }

  function renderEdu(){
    var wrap = $('obEduWrap');
    wrap.innerHTML = '';
    RegData.educationCategories.forEach(function(cat){
      var card = document.createElement('div');
      card.className = 'edu-card';
      card.innerHTML = '<h4>' + cat.label + '</h4><div class="edu-list"></div>' +
        '<button type="button" class="ob-addbtn edu-add">＋ Add another institution</button>';
      var list = card.querySelector('.edu-list');
      function redraw(){
        list.innerHTML = f.education[cat.key].map(function(e){ return eduEntryHtml(cat.key, e); }).join('');
        Array.prototype.forEach.call(list.children, function(entryEl, idx){
          var e = f.education[cat.key][idx];
          var inst = entryEl.querySelector('.e-inst');
          inst.addEventListener('input', function(){ e.institution = this.value.trim(); saveDraft(); });
          if (cat.key === 'primary' || cat.key === 'secondary') schoolSuggest(inst);
          [['.e-country','country'],['.e-prov','provinceRegion'],['.e-city','city'],
           ['.e-start','startYear'],['.e-end','endYear'],['.e-type','type'],
           ['.e-qual','qualification'],['.e-field','fieldOfStudy']].forEach(function(pair){
            var el = entryEl.querySelector(pair[0]);
            if (el) el.addEventListener('change', function(){ e[pair[1]] = this.value; saveDraft(); });
          });
          entryEl.querySelector('.e-del').addEventListener('click', function(){
            f.education[cat.key].splice(idx, 1); redraw(); saveDraft();
          });
        });
      }
      card.querySelector('.edu-add').addEventListener('click', function(){
        f.education[cat.key].push({ institution: '', country: f.countryOfResidence || '', provinceRegion: '', city: '', startYear: '', endYear: '' });
        redraw(); saveDraft();
      });
      redraw();
      wrap.appendChild(card);
    });
  }
  renderEdu();

  /* ============================================================
     STEP 5 — SOCIAL & INTERESTS
     ============================================================ */
  (function initSocials(){
    var wrap = $('obSocials');
    var LABELS = { facebook:'Facebook', x:'X / Twitter', instagram:'Instagram', tiktok:'TikTok',
      linkedin:'LinkedIn', youtube:'YouTube', snapchat:'Snapchat', threads:'Threads', other:'Other' };
    RegData.socials.forEach(function(sk){
      var d = document.createElement('div');
      d.className = 'soc';
      d.innerHTML = '<div class="ob-field"><label>' + LABELS[sk] + '</label>' +
        '<input type="text" value="' + (f.socials[sk] || '') + '"></div>';
      d.querySelector('input').addEventListener('input', function(){
        f.socials[sk] = this.value.trim(); saveDraft();
      });
      wrap.appendChild(d);
    });
  })();

  (function initInterests(){
    var wrap = $('obInterestChips');
    RegData.interests.forEach(function(name){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (f.interests.indexOf(name) !== -1 ? ' on' : '');
      b.textContent = name;
      b.addEventListener('click', function(){
        var i = f.interests.indexOf(name);
        if (i === -1) f.interests.push(name); else f.interests.splice(i, 1);
        b.classList.toggle('on');
        updCount(); saveDraft(); refreshCountChip();
      });
      wrap.appendChild(b);
    });
    function updCount(){
      $('obInterestCount').textContent = f.interests.length + ' selected' +
        (f.interests.length >= 5 ? ' ✓' : ' (minimum 5)');
      $('obInterestCount').className = 'ob-status' + (f.interests.length >= 5 ? ' ok' : '');
    }
    updCount();
  })();

  /* ============================================================
     STEP 6 — SECURITY
     ============================================================ */
  $('obPassword').addEventListener('input', function(){
    f.password = this.value;
    var v = this.value;
    var score = 0;
    if (v.length >= 6) score++;
    if (v.length >= 10) score++;
    if (/[0-9]/.test(v) && /[a-zA-Z]/.test(v)) score++;
    if (/[^a-zA-Z0-9]/.test(v)) score++;
    var bar = $('obStrengthBar'), lab = $('obStrengthLabel');
    var pct = [0, 25, 50, 75, 100][score];
    var col = ['#ddd','#c0392b','#e67e22','#f1c40f','#27ae60'][score];
    bar.style.width = pct + '%'; bar.style.background = col;
    lab.textContent = v ? ['Too short','Weak','Okay','Good','Strong'][score] : '';
    saveDraft(); refreshCountChip();
  });
  $('obPasswordConfirm').addEventListener('input', function(){
    f.passwordConfirm = this.value; saveDraft(); refreshCountChip();
  });

  /* ============================================================
     STEP 7 — REVIEW + CREATE
     ============================================================ */
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(ch){
    return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[ch]; }); }

  function fmtNum(n){
    return n.countryCode + ' ' + n.number + (n.network ? ' (' + n.network + ')' : '');
  }
  function eduSummary(){
    var lines = [];
    RegData.educationCategories.forEach(function(cat){
      (f.education[cat.key] || []).forEach(function(e){
        lines.push(cat.label + ' — ' + (e.institution || '(unnamed)'));
      });
    });
    return lines.length ? lines.join('<br>') : 'Not provided';
  }

  function reviewRows(){
    return [
      { k:'Name', v: esc(f.firstName + ' ' + f.surname), step:1 },
      { k:'Username', v: '@' + esc(f.username), step:1 },
      { k:'Date of birth', v: esc(f.dateOfBirth), step:1 },
      { k:'Gender', v: esc(f.gender), step:1 },
      { k:'Nationality', v: esc(f.nationalityName || f.nationalityCode), step:1 },
      { k:'Race', v: esc(f.race === 'other' ? 'Other — ' + (f.raceOther || '') : f.race), step:1 },
      { k:'Mobile', v: f.mobileNumbers.map(esc2(fmtNum)).join('<br>'), step:2 },
      { k:'WhatsApp', v: f.whatsappNumbers.map(function(n){
          return esc(fmtNum(n)) + (n.verified ? ' ✓' : ''); }).join('<br>'), step:2 },
      { k:'Email', v: f.email ? esc(f.email) : 'Not provided', step:2 },
      { k:'Residence', v: esc(residenceLine()), step:3 },
      { k:'Education', v: eduSummary(), step:4 },
      { k:'Interests', v: f.interests.join(', '), step:5 },
      { k:'Socials', v: socialSummary(), step:5 }
    ];
    function esc2(fn){ return function(n){ return esc(fn(n)); }; }
  }
  function residenceLine(){
    if (f.countryOfResidence === 'ZW'){
      return [f.areaNeighbourhood, f.townCityVillage, f.province, 'Zimbabwe'].filter(Boolean).join(', ');
    }
    var c = RegData.countryByCode[f.countryOfResidence];
    return [f.areaNeighbourhood, f.cityGeneric, f.regionGeneric, c ? c.name : ''].filter(Boolean).join(', ');
  }
  function socialSummary(){
    var LBL = { facebook:'FB', x:'X', instagram:'IG', tiktok:'TT', linkedin:'LI', youtube:'YT', snapchat:'SC', threads:'TH', other:'—' };
    var parts = Object.keys(f.socials).filter(function(k){ return f.socials[k]; })
      .map(function(k){ return LBL[k] + ': ' + esc(f.socials[k]); });
    return parts.length ? parts.join('<br>') : 'None added';
  }

  function renderReview(){
    var r = window.validateRegistration(f);
    $('obReview').innerHTML = reviewRows().map(function(row){
      return '<div class="ob-rev-row"><span class="ob-rev-k">' + row.k + '</span>' +
        '<span class="ob-rev-v">' + row.v + '</span>' +
        '<button type="button" class="ob-editbtn" data-goto="' + row.step + '">Edit</button></div>';
    }).join('');
    $('obReview').querySelectorAll('.ob-editbtn').forEach(function(b){
      b.addEventListener('click', function(){ goTo(+b.dataset.goto); });
    });
    var html = '<div class="ob-tally-title">Registration checklist</div>' +
      '<div class="ob-rev-row" style="border-bottom:1px solid var(--divider);padding-bottom:8px;margin-bottom:6px;">' +
      '<span class="ob-rev-k">Required completed</span><span class="ob-rev-v">' +
      r.completed + ' / ' + r.required + '  (' + r.percentage + '%)</span></div>' +
      r.checks.map(function(c){
        return '<div class="ob-check ' + (c.ok ? 'ok' : 'no') + '"><span>' +
          (c.ok ? '✓' : '✗') + ' ' + c.label + '</span><span>' + (c.ok ? '' : 'missing') + '</span></div>';
      }).join('');
    if (r.valid){
      html += '<div class="ob-check ok" style="margin-top:8px;font-weight:800;">✓ ALL REQUIRED INFORMATION COMPLETE</div>';
    }
    $('obReviewTally').innerHTML = html;
    $('obCreate').disabled = !r.valid;
    refreshCountChip();
  }

  async function hashPassword(pw){
    try {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('roots::' + pw));
      return Array.prototype.map.call(new Uint8Array(buf), function(b){
        return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) {
      var h = 5381, s = 'roots::' + pw;
      for (var i = 0; i < s.length; i++){ h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
      return 'x' + (h >>> 0).toString(16);
    }
  }

  $('obCreate').addEventListener('click', function(){
    var r = window.validateRegistration(f);       // final full validation
    if (!r.valid){ showToast('⚠️ Incomplete: ' + r.errors[0]); renderReview(); return; }
    createAccount();
  });

  async function createAccount(){
    var personId = 'u_' + f.username.replace(/[^a-z0-9._]/g, '');
    var bornYear = f.dateOfBirth ? parseInt(f.dateOfBirth.slice(0, 4), 10) : '';
    var personNode = {
      id: personId,
      name: (f.firstName + ' ' + f.surname).trim(),
      fullName: (f.firstName + ' ' + f.surname).trim(),
      preferredName: f.firstName,
      gender: f.gender === 'male' ? 'm' : 'f',
      born: isNaN(bornYear) ? '' : bornYear,
      died: null,
      dob: f.dateOfBirth || null,
      isAlive: true,
      relation: 'You',
      profession: '',
      location: residenceLine(),
      notes: '',
      spouseId: null,
      parentIds: [],
      media: { profilePhoto: f.profilePhoto, galleryRefs: [] },
      lifecycleState: 'ALIVE'
    };
    var authHash = await hashPassword(f.password);
    var nowIso = new Date().toISOString();
    var user = {
      id: 'user_' + Date.now().toString(36),
      accountType: 'regular',
      profilePhoto: f.profilePhoto,
      firstName: f.firstName, surname: f.surname, username: f.username,
      dateOfBirth: f.dateOfBirth, gender: f.gender,
      nationalityCode: f.nationalityCode, nationalityName: f.nationalityName,
      race: f.race, raceOther: f.raceOther,
      mobileNumbers: f.mobileNumbers,
      whatsappNumbers: f.whatsappNumbers,
      whatsappVerified: f.whatsappNumbers.some(function(n){ return n.verified; }),
      email: f.email,
      countryOfResidence: f.countryOfResidence,
      province: f.province || f.regionGeneric || '',
      townCityVillage: f.townCityVillage || f.cityGeneric || '',
      areaNeighbourhood: f.areaNeighbourhood || '',
      gps: { enabled: false, latitude: null, longitude: null },
      education: f.education,
      socials: f.socials,
      interests: f.interests,
      authUserId: null,
      familyTreePersonId: personId,
      personNode: personNode,
      createdAt: nowIso, updatedAt: nowIso
    };
    try {
      localStorage.setItem('roots_user', JSON.stringify(user));
      localStorage.setItem('roots_auth', JSON.stringify({ username: f.username, authHash: authHash }));
      localStorage.setItem('roots_session', JSON.stringify({
        accountType: 'regular', mode: 'personal', personId: personId
      }));
      localStorage.setItem('roots_role', 'regular');
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      showToast('⚠️ Storage full — account could not be saved.');
      return;
    }
    $('obDoneMsg').textContent = 'Welcome to Roots, ' + f.firstName + '. Your profile was created locally.';
    goTo(8);
  }

  $('obEnterApp').addEventListener('click', function(){ location.href = 'index.html'; });

  /* ---------- boot ---------- */
  showPhoto();
  goTo(1);
})();
