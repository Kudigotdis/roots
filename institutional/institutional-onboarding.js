/* ============================================================
   ROOTS INSTITUTIONAL ONBOARDING — B1 nine-step wizard.
   Progressive professional setup driven by RootsInstConfig.
   Draft autosave · type-conditional fields · geographic scope
   separate from physical location · review + local submission.
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var CFG = window.RootsInstConfig;
  var KEYS = CFG.KEYS;
  var TOTAL_STEPS = 9;

  var STEP_META = {
    1: { rail: 'Institution Type', title: 'What type of institution are you registering?',
      desc: 'Choose the institution or organisation you represent. Your selection determines the workspace, tools and data-access options shown during setup.' },
    2: { rail: 'Organisation', title: 'Tell us about your organisation',
      desc: 'Official details for the organisation you represent.' },
    3: { rail: 'Location & Scope', title: 'Where does your organisation operate?',
      desc: 'Physical location first, then the geographic area your Roots work will cover.' },
    4: { rail: 'Purpose', title: 'How will your organisation use Roots?',
      desc: 'Select all purposes that apply.' },
    5: { rail: 'Data Access', title: 'What Roots information does your organisation need?',
      desc: 'Choose the data categories relevant to your work.' },
    6: { rail: 'Modules', title: 'Choose your Roots workspace',
      desc: 'Modules included with your institution type, plus optional suites.' },
    7: { rail: 'Administrator', title: 'Create the primary institutional administrator',
      desc: 'This person will manage the organisation\u2019s Roots workspace.' },
    8: { rail: 'Staff Invitations', title: 'Who else will use this organisation\u2019s Roots workspace?',
      desc: 'Optional \u2014 invite staff members and assign their proposed roles.' },
    9: { rail: 'Review', title: 'Review your institutional application',
      desc: 'Expand each section to confirm, or edit before submitting.' }
  };

  /* ============================================================
     UI STATE
     ============================================================ */
  var state = {
    currentStep: 1,
    totalSteps: TOTAL_STEPS,

    institutionType: null,

    organisation: {
      name: '', shortName: '', department: '',
      whatsappCountry: 'ZW', whatsapp: '', email: '', website: '',
      conditional: {}
    },
    location: {
      country: '', region: '', district: '', city: '', area: ''
    },
    geographicScope: { level: null, textValues: '', districts: [], provinces: [], countries: [] },

    purpose: [],
    purposeDescription: '',
    dataAccess: {},
    modules: ['CORE'],

    primaryAdmin: {
      name: '', whatsappCountry: 'ZW', whatsapp: '',
      jobTitle: '', department: '', email: '',
      password: '', passwordConfirm: ''
    },
    staff: [],

    status: 'draft'
  };

  var dirty = false;

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (e) { return fallback; }
  }
  function writeJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch];
    });
  }

  function showToast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- draft autosave ---------- */
  function snapshot() {
    return {
      institutionType: state.institutionType,
      organisation: state.organisation,
      location: state.location,
      geographicScope: state.geographicScope,
      purpose: state.purpose,
      purposeDescription: state.purposeDescription,
      dataAccess: state.dataAccess,
      modules: state.modules,
      primaryAdmin: {
        name: state.primaryAdmin.name,
        whatsappCountry: state.primaryAdmin.whatsappCountry,
        whatsapp: state.primaryAdmin.whatsapp,
        jobTitle: state.primaryAdmin.jobTitle,
        department: state.primaryAdmin.department,
        email: state.primaryAdmin.email
      },
      staff: state.staff,
      status: state.status
    };
  }
  var saveTimer = null;
  function saveDraft(immediate) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      writeJson(KEYS.DRAFT, snapshot());
    }, immediate ? 0 : 350);
  }

  /* ============================================================
     STEP NAVIGATION
     ============================================================ */
  function stepEl(n) { return $('institutionalStep' + n); }

  function goTo(n) {
    state.currentStep = Math.max(1, Math.min(TOTAL_STEPS, n));
    document.querySelectorAll('.institutional-step').forEach(function (s) {
      if (s.id !== 'institutionalSubmitted') s.classList.remove('active');
    });
    stepEl(state.currentStep).classList.add('active');
    renderHeader();
    renderRail();
    $('institutionalBack').style.visibility = state.currentStep === 1 ? 'hidden' : 'visible';
    $('institutionalContinue').style.display = state.currentStep === TOTAL_STEPS ? 'none' : '';
    if (state.currentStep === TOTAL_STEPS) renderReview();
    document.querySelector('#institutionalOnboardingMain').scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function renderHeader() {
    var meta = STEP_META[state.currentStep];
    $('institutionalStepNumber').textContent = 'Step ' + state.currentStep + ' of ' + TOTAL_STEPS;
    $('institutionalProgressBar').style.width = (state.currentStep / TOTAL_STEPS * 100) + '%';
    $('institutionalProgressLabel').textContent = meta.rail.toUpperCase();
    $('institutionalStepTitle').textContent = meta.title;
    $('institutionalStepDescription').textContent = meta.desc;
  }

  function renderRail() {
    var ol = $('instRailList');
    if (!ol) return;
    ol.innerHTML = '';
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var li = document.createElement('li');
      li.textContent = STEP_META[i].rail;
      li.className = i < state.currentStep ? 'done' : i === state.currentStep ? 'current' : 'upcoming';
      ol.appendChild(li);
    }
  }

  function setStepError(n, msg) {
    var el = $('stepError' + n);
    if (el) el.textContent = msg || '';
  }

  /* ============================================================
     STEP 1 — INSTITUTION TYPE CARDS
     ============================================================ */
  function renderInstitutionTypeCards() {
    var wrap = $('institutionTypeCards');
    wrap.innerHTML = '';
    CFG.TYPES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'inst-type-card';
      b.id = t.cardId;
      b.setAttribute('aria-pressed', String(state.institutionType === t.code));
      b.setAttribute('aria-label', t.title + '. ' + t.description);
      b.innerHTML =
        '<span class="t-check">✓</span>' +
        '<div class="t-icon">' + t.icon + '</div>' +
        '<div class="t-title">' + esc(t.title) + '</div>' +
        '<div class="t-desc">' + esc(t.description) + '</div>';
      b.addEventListener('click', function () {
        selectInstitutionType(t.code);
      });
      wrap.appendChild(b);
    });
  }

  function selectInstitutionType(code) {
    if (state.institutionType !== code) {
      state.institutionType = code;
      dirty = true;
      refreshTypeDependentUi();
      saveDraft();
    }
    renderInstitutionTypeCards();
  }

  function currentType() { return CFG.typeByCode(state.institutionType); }

  function refreshTypeDependentUi() {
    renderOrgConditional();
    renderModuleSelector();
    renderStaffInvites();
    renderDataAccessSelector();
  }

  /* ============================================================
     STEP 2 — ORGANISATION FIELDS
     ============================================================ */
  function renderOrganisationBadge() {
    var t = currentType();
    $('orgTypeBadge').innerHTML = t
      ? '<span style="font-size:16px;">' + t.icon + '</span> Selected type: ' + esc(t.title)
      : 'No type selected';
  }

  function renderOrgConditional() {
    var t = currentType();
    var wrap = $('orgConditionalWrap');
    wrap.innerHTML = '';
    if (!t || !t.conditional) return;
    var h = document.createElement('h3');
    h.className = 'inst-panel-title';
    h.style.marginTop = '18px';
    h.textContent = t.conditional.heading;
    wrap.appendChild(h);
    t.conditional.fields.forEach(function (fdef) {
      state.organisation.conditional[fdef.id] = state.organisation.conditional[fdef.id] || '';
      var field = document.createElement('div');
      field.className = 'inst-field';
      var labelHtml = '<label for="' + fdef.id + '">' + esc(fdef.label) + ' <span class="opt">(optional)</span></label>';
      if (fdef.type === 'select') {
        var opts = fdef.options.map(function (o) {
          return '<option' + (state.organisation.conditional[fdef.id] === o ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('');
        field.innerHTML = labelHtml + '<select id="' + fdef.id + '"><option value="">Select…</option>' + opts + '</select>';
        field.querySelector('select').addEventListener('change', function () {
          state.organisation.conditional[fdef.id] = this.value;
          saveDraft();
        });
      } else {
        field.innerHTML = labelHtml + '<input type="text" id="' + fdef.id + '" value="' + esc(state.organisation.conditional[fdef.id]) + '">';
        field.querySelector('input').addEventListener('input', function () {
          state.organisation.conditional[fdef.id] = this.value.trim();
          saveDraft();
        });
      }
      wrap.appendChild(field);
    });
  }

  /* ============================================================
     STEP 3 — LOCATION + GEOGRAPHIC SCOPE
     ============================================================ */
  function initCountrySelects() {
    var cs = window.RegData.countries.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    [$('organisationCountry'), $('organisationWhatsappCountry'), $('primaryAdminWhatsappCountry')].forEach(function (sel) {
      cs.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.code;
        o.textContent = sel.id === 'organisationCountry' ? c.name : c.name + ' ' + c.dial;
        o.dataset.dial = c.dial;
        sel.appendChild(o);
      });
    });
    $('organisationWhatsappCountry').value = state.organisation.whatsappCountry || 'ZW';
    $('primaryAdminWhatsappCountry').value = state.primaryAdmin.whatsappCountry || 'ZW';
    $('organisationCountry').value = state.location.country || '';
  }

  function renderLocationFields() {
    var isZw = state.location.country === 'ZW';
    var wrap = $('locationFields');
    var zwTowns = [];
    if (isZw) {
      var D = window.ZIMBABWE_LOCATIONS_DATA || { districts: [] };
      D.districts.forEach(function (d) { (d.towns || []).forEach(function (t) { zwTowns.push(t.name); }); });
    }

    function regionField() {
      if (isZw) {
        return '<div class="inst-field"><label for="organisationRegion">Province *</label>' +
          '<select id="organisationRegion"><option value="">Select province…</option>' +
          CFG.PROVINCES_ZW.map(function (p) { return '<option' + (state.location.region === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') +
          '</select></div>';
      }
      return '<div class="inst-field"><label for="organisationRegion">Province / State / Region *</label>' +
        '<input type="text" id="organisationRegion" value="' + esc(state.location.region) + '"></div>';
    }
    function districtField() {
      if (isZw) {
        return '<div class="inst-field"><label for="organisationDistrict">District *</label>' +
          '<select id="organisationDistrict"><option value="">Select district…</option>' +
          CFG.zwDistrictNames().map(function (d) { return '<option' + (state.location.district === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') +
          '</select></div>';
      }
      return '<div class="inst-field"><label for="organisationDistrict">District <span class="opt">(optional)</span></label>' +
        '<input type="text" id="organisationDistrict" value="' + esc(state.location.district) + '"></div>';
    }
    function cityAreaFields() {
      if (isZw) {
        return '<div class="inst-field"><label for="organisationCity">City / Town *</label>' +
          '<input type="text" id="organisationCity" list="instTownList" value="' + esc(state.location.city) + '" autocomplete="off">' +
          '<datalist id="instTownList">' + zwTowns.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></div>' +
          '<div class="inst-field"><label for="organisationArea">Area / Neighbourhood <span class="opt">(optional)</span></label>' +
          '<input type="text" id="organisationArea" value="' + esc(state.location.area) + '"></div>';
      }
      return '<div class="inst-field"><label for="organisationCity">City / Town *</label>' +
        '<input type="text" id="organisationCity" value="' + esc(state.location.city) + '"></div>' +
        '<div class="inst-field"><label for="organisationArea">Area / Neighbourhood <span class="opt">(optional)</span></label>' +
        '<input type="text" id="organisationArea" value="' + esc(state.location.area) + '"></div>';
    }

    wrap.innerHTML = regionField() + districtField() + cityAreaFields();

    bindLocationInput('organisationRegion', 'region', isZw ? 'change' : 'input');
    bindLocationInput('organisationDistrict', 'district', isZw ? 'change' : 'input');
    bindLocationInput('organisationCity', 'city', 'input');
    bindLocationInput('organisationArea', 'area', 'input');
  }

  function bindLocationInput(id, key, evName) {
    var el = $(id);
    if (!el) return;
    el.addEventListener(evName, function () {
      state.location[key] = typeof this.value === 'string' && evName === 'input' ? this.value.trim() : this.value;
      dirty = true;
      saveDraft();
    });
  }

  function renderGeographicScope() {
    var wrapChips = $('scopeChips');
    wrapChips.innerHTML = '';
    CFG.SCOPE_LEVELS.forEach(function (lvl) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'inst-chip' + (state.geographicScope.level === lvl.id ? ' on' : '');
      b.id = lvl.id;
      b.setAttribute('aria-pressed', String(state.geographicScope.level === lvl.id));
      b.textContent = lvl.label;
      b.addEventListener('click', function () {
        state.geographicScope.level = lvl.id;
        state.geographicScope.textValues = '';
        state.geographicScope.districts = [];
        state.geographicScope.provinces = [];
        state.geographicScope.countries = [];
        dirty = true;
        renderGeographicScopeFollowup();
        renderGeographicScope();
        saveDraft();
      });
      wrapChips.appendChild(b);
    });
    renderGeographicScopeFollowup();
  }

  function renderGeographicScopeFollowup() {
    var lvl = null;
    for (var i = 0; i < CFG.SCOPE_LEVELS.length; i++) {
      if (CFG.SCOPE_LEVELS[i].id === state.geographicScope.level) { lvl = CFG.SCOPE_LEVELS[i]; break; }
    }
    var wrap = $('scopeFollowup');
    wrap.innerHTML = '';
    if (!lvl) return;

    if (lvl.followup === 'national') {
      wrap.innerHTML = '<div class="inst-message inst-message-info" style="margin-bottom:0;">📍 Zimbabwe — National</div>';
      return;
    }
    if (lvl.followup === 'text') {
      wrap.innerHTML = '<div class="inst-field"><label for="scopeTextValues">' + esc(lvl.prompt) + '</label>' +
        '<input type="text" id="scopeTextValues" value="' + esc(state.geographicScope.textValues) + '" placeholder="e.g. Chilonga, Madziva"></div>';
      $('scopeTextValues').addEventListener('input', function () {
        state.geographicScope.textValues = this.value.trim();
        dirty = true; saveDraft();
      });
      return;
    }
    if (lvl.followup === 'zwProvinces') {
      wrap.innerHTML = '<div class="helper" style="font-size:12px;color:#5f6b7c;margin-bottom:6px;">' + esc(lvl.prompt) + '</div>' +
        '<div class="inst-chips" id="scopeProvChips"></div>';
      var pc = wrap.querySelector('#scopeProvChips');
      CFG.PROVINCES_ZW.forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'inst-chip' + (state.geographicScope.provinces.indexOf(p) !== -1 ? ' on' : '');
        b.textContent = p.replace(' Province', '');
        b.addEventListener('click', function () {
          var ix = state.geographicScope.provinces.indexOf(p);
          if (ix === -1) state.geographicScope.provinces.push(p); else state.geographicScope.provinces.splice(ix, 1);
          b.classList.toggle('on');
          dirty = true; saveDraft();
        });
        pc.appendChild(b);
      });
      return;
    }
    if (lvl.followup === 'zwDistricts') {
      wrap.innerHTML = '<div class="helper" style="font-size:12px;color:#5f6b7c;margin-bottom:6px;">' + esc(lvl.prompt) + '</div>' +
        '<div class="inst-chips" id="scopeDistChips"></div>';
      var dc = wrap.querySelector('#scopeDistChips');
      CFG.zwDistrictNames().sort().forEach(function (d) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'inst-chip' + (state.geographicScope.districts.indexOf(d) !== -1 ? ' on' : '');
        b.textContent = d;
        b.addEventListener('click', function () {
          var ix = state.geographicScope.districts.indexOf(d);
          if (ix === -1) state.geographicScope.districts.push(d); else state.geographicScope.districts.splice(ix, 1);
          b.classList.toggle('on');
          dirty = true; saveDraft();
        });
        dc.appendChild(b);
      });
      return;
    }
    if (lvl.followup === 'countries') {
      var cs = window.RegData.countries.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      wrap.innerHTML = '<div class="helper" style="font-size:12px;color:#5f6b7c;margin-bottom:6px;">' + esc(lvl.prompt) + '</div>' +
        '<select id="scopeCountries" multiple size="8" style="width:100%;padding:8px;border:1px solid #ccd3dd;border-radius:6px;font-family:inherit;">' +
        cs.map(function (c) {
          return '<option value="' + c.code + '"' + (state.geographicScope.countries.indexOf(c.code) !== -1 ? ' selected' : '') + '>' + esc(c.name) + '</option>';
        }).join('') + '</select>';
      $('scopeCountries').addEventListener('change', function () {
        state.geographicScope.countries = Array.prototype.slice.call(this.selectedOptions).map(function (o) { return o.value; });
        dirty = true; saveDraft();
      });
    }
  }

  /* ============================================================
     STEP 4 — PURPOSE SELECTOR
     ============================================================ */
  function renderPurposeSelector() {
    var wrap = $('purposeCards');
    wrap.innerHTML = '';
    CFG.PURPOSES.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'inst-chip' + (state.purpose.indexOf(p.id) !== -1 ? ' on' : '');
      b.id = p.id;
      b.setAttribute('aria-pressed', String(state.purpose.indexOf(p.id) !== -1));
      b.textContent = p.label;
      b.addEventListener('click', function () {
        var ix = state.purpose.indexOf(p.id);
        if (ix === -1) state.purpose.push(p.id); else state.purpose.splice(ix, 1);
        b.classList.toggle('on');
        b.setAttribute('aria-pressed', String(ix === -1));
        dirty = true; saveDraft();
      });
      wrap.appendChild(b);
    });
  }

  /* ============================================================
     STEP 5 — DATA ACCESS SELECTOR
     ============================================================ */
  function renderDataAccessSelector() {
    var wrap = $('dataAccessGroups');
    var t = currentType();
    wrap.innerHTML = '';
    CFG.DATA_GROUPS.forEach(function (grp) {
      var g = document.createElement('div');
      g.className = 'inst-dgroup';
      var html = '<h4>' + esc(grp.label) + '</h4>';
      var lifecycleOff = grp.needsLifecycle && t && !t.lifecycleEnabled;
      grp.items.forEach(function (item) {
        var checked = !!state.dataAccess[item.id];
        if (lifecycleOff) {
          html += '<label class="inst-check-row disabled" aria-disabled="true">' +
            '<input type="checkbox" disabled> <span>' + esc(item.label) + '</span></label>';
        } else {
          html += '<label class="inst-check-row">' +
            '<input type="checkbox" data-access-id="' + item.id + '"' + (checked ? ' checked' : '') + '> <span>' + esc(item.label) + '</span></label>';
        }
      });
      if (lifecycleOff) {
        html += '<div class="helper" style="font-size:12px;color:#5f6b7c;">Lifecycle data has not been enabled for this institution type.</div>';
      }
      g.innerHTML = html;
      wrap.appendChild(g);
    });

    wrap.querySelectorAll('input[type="checkbox"][data-access-id]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        state.dataAccess[cb.dataset.accessId] = cb.checked;
        if (!cb.checked) delete state.dataAccess[cb.dataset.accessId];
        updatePersonWarning();
        dirty = true; saveDraft();
      });
    });
    updatePersonWarning();
  }

  function personLevelChecked() {
    var peopleGroup = CFG.DATA_GROUPS.filter(function (g) { return g.personLevel; })[0];
    return peopleGroup && peopleGroup.items.some(function (i) { return state.dataAccess[i.id]; });
  }
  function updatePersonWarning() {
    var warn = $('personWarning');
    warn.style.display = personLevelChecked() ? '' : 'none';
    $('personWarningText').textContent = CFG.PERSON_WARNING;
  }

  /* ============================================================
     STEP 6 — MODULE SELECTOR
     ============================================================ */
  function autoModules() {
    var t = currentType();
    return t ? ['CORE'].concat(t.includedModules) : ['CORE'];
  }

  function renderModuleSelector() {
    var wrap = $('moduleCards');
    var t = currentType();
    var included = autoModules();
    // optionalSelected persists for the session; seeded once from draft at boot.
    state.modules = included.slice();
    optionalSelected.forEach(function (mid) {
      if (state.modules.indexOf(mid) === -1 &&
          CFG.MODULE_SUITES.some(function (m) { return m.id === mid && m.state !== 'included'; })) {
        state.modules.push(mid);
      }
    });

    wrap.innerHTML = '';
    CFG.MODULE_SUITES.forEach(function (m) {
      var isCore = m.state === 'included';
      var isAuto = !isCore && t && t.includedModules.indexOf(m.id) !== -1;
      var isSelected = state.modules.indexOf(m.id) !== -1;
      var card = document.createElement('div');
      card.className = 'inst-module-card' + (isSelected ? ' selected' : '') + ((isCore || isAuto) ? '' : ' selectable');
      var badge = isCore || isAuto
        ? '<span class="inst-badge inst-badge-included">Included</span>'
        : isSelected
          ? '<span class="inst-badge inst-badge-selected">Selected</span>'
          : '<span class="inst-badge inst-badge-request">Available · Request Access</span>';
      card.innerHTML =
        '<div class="inst-module-head"><span class="inst-module-title">' + m.icon + ' ' + esc(m.title) + '</span>' + badge + '</div>' +
        '<ul class="inst-module-items">' + m.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
      if (!isCore && !isAuto) {
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', String(isSelected));
        card.addEventListener('click', function () {
          var ix = optionalSelected.indexOf(m.id);
          if (ix === -1) optionalSelected.push(m.id); else optionalSelected.splice(ix, 1);
          dirty = true; saveDraft();
          renderModuleSelector();
        });
      }
      wrap.appendChild(card);
    });
    $('subscriptionNote').textContent = CFG.SUBSCRIPTION_NOTE;
  }

  /* ============================================================
     STEP 7 — PRIMARY ADMINISTRATOR FORM
     ============================================================ */
  function renderPrimaryAdminForm() {
    $('signinNote').textContent = CFG.SIGNIN_NOTE;
    bindField('primaryAdminName', function (v) { state.primaryAdmin.name = v; });
    bindField('primaryAdminWhatsapp', function (v) { state.primaryAdmin.whatsapp = v; }, 'input', false);
    bindField('primaryAdminPassword', function (v) { state.primaryAdmin.password = v; }, 'input', false);
    bindField('primaryAdminPasswordConfirm', function (v) { state.primaryAdmin.passwordConfirm = v; }, 'input', false);
    bindField('primaryAdminJobTitle', function (v) { state.primaryAdmin.jobTitle = v; });
    bindField('primaryAdminDepartment', function (v) { state.primaryAdmin.department = v; });
    bindField('primaryAdminEmail', function (v) { state.primaryAdmin.email = v; });
  }

  function bindField(id, setter, evName, trim) {
    var el = $(id);
    if (!el || el._bound) return;
    el._bound = true;
    el.addEventListener(evName || 'input', function () {
      var v = trim === false ? this.value : this.value.trim();
      setter(v);
      dirty = true;
      saveDraft();
    });
  }

  /* ============================================================
     STEP 8 — STAFF INVITATIONS
     ============================================================ */
  var optionalSelected = [];

  function seedOptionalModulesFromDraft() {
    var draft = readJson(KEYS.DRAFT, {});
    if (!Array.isArray(draft.modules)) return;
    optionalSelected = draft.modules.filter(function (mid) {
      if (mid === 'CORE') return false;
      var t = currentType();
      if (t && t.includedModules.indexOf(mid) !== -1) return false;
      return CFG.MODULE_SUITES.some(function (m) { return m.id === mid; });
    });
  }

  function renderStaffInvites() {
    var wrap = $('staffList');
    var t = currentType();
    var roles = t ? t.roles : ['Researcher', 'Data Officer', 'Reviewer', 'Viewer'];
    wrap.innerHTML = '';

    state.staff.forEach(function (member, idx) {
      var card = document.createElement('div');
      card.className = 'inst-staff-card';
      card.innerHTML =
        '<div class="inst-module-head" style="margin-bottom:10px;"><strong style="font-size:14px;">Staff member ' + (idx + 1) + '</strong>' +
        '<button type="button" class="inst-btn-danger" data-staff-remove="' + idx + '">Remove</button></div>' +
        '<div class="inst-field"><label>Name *</label><input type="text" data-staff-k="name" data-staff-i="' + idx + '" value="' + esc(member.name) + '"></div>' +
        '<div class="inst-phone-row"><select class="cc-select" data-staff-k="whatsappCountry" data-staff-i="' + idx + '" aria-label="Country dialing code"></select>' +
        '<input type="tel" class="num-input" inputmode="tel" data-staff-k="whatsapp" data-staff-i="' + idx + '" placeholder="WhatsApp number" value="' + esc(member.whatsapp) + '"></div>' +
        '<div class="inst-field" style="margin-top:12px;"><label>Role *</label>' +
        '<select data-staff-k="role" data-staff-i="' + idx + '"><option value="">Select role…</option>' +
        roles.map(function (r) { return '<option' + (member.role === r ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') +
        '</select><div class="helper">Roles shown match your institution type.</div></div>' +
        '<div class="inst-field"><label>Department <span class="opt">(optional)</span></label>' +
        '<input type="text" data-staff-k="department" data-staff-i="' + idx + '" value="' + esc(member.department) + '"></div>';
      wrap.appendChild(card);

      var ccSel = card.querySelector('[data-staff-k="whatsappCountry"]');
      window.RegData.countries.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.code;
        o.textContent = c.name + ' ' + c.dial;
        ccSel.appendChild(o);
      });
      ccSel.value = member.whatsappCountry || 'ZW';

      card.querySelectorAll('[data-staff-k]').forEach(function (inp) {
        inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', function () {
          state.staff[idx][inp.dataset.staffK] = this.value;
          dirty = true; saveDraft();
        });
      });
    });

    wrap.querySelectorAll('[data-staff-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.staff.splice(+btn.dataset.staffRemove, 1);
        dirty = true; saveDraft();
        renderStaffInvites();
      });
    });
  }

  $('addStaffBtn').addEventListener('click', function () {
    state.staff.push({ name: '', whatsappCountry: 'ZW', whatsapp: '', role: '', department: '' });
    dirty = true; saveDraft();
    renderStaffInvites();
  });

  /* ============================================================
     STEP 9 — REVIEW
     ============================================================ */
  function kv(k, v) {
    return '<div class="inst-review-kv"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
  }

  function scopeSummary() {
    var gs = state.geographicScope;
    var lvl = CFG.SCOPE_LEVELS.filter(function (l) { return l.id === gs.level; })[0];
    if (!lvl) return 'Not selected';
    if (lvl.followup === 'national') return 'Zimbabwe — National';
    if (lvl.followup === 'text') return lvl.label + ': ' + (gs.textValues || '—');
    if (lvl.followup === 'zwProvinces') return 'Provinces: ' + (gs.provinces.join(', ') || '—');
    if (lvl.followup === 'zwDistricts') return 'Districts: ' + (gs.districts.join(', ') || '—');
    if (lvl.followup === 'countries') {
      return 'Countries: ' + gs.countries.map(function (c) {
        var hit = window.RegData.countryByCode[c];
        return hit ? hit.name : c;
      }).join(', ') || '—';
    }
    return lvl.label;
  }

  function locationLine() {
    var c = window.RegData.countryByCode[state.location.country];
    var parts = [state.location.area, state.location.city, state.location.district, state.location.region, c ? c.name : ''];
    return parts.filter(Boolean).join(', ') || 'Not provided';
  }

  function whatsappLine(countryCode, number) {
    var c = window.RegData.countryByCode[countryCode];
    return (c ? c.dial : '') + ' ' + number;
  }

  function renderReview() {
    var t = currentType();
    var sections = [
      {
        title: 'Organisation', editStep: 2,
        body: kv('Name', esc(state.organisation.name || '—')) +
          kv('Type', t ? t.icon + ' ' + esc(t.title) : '—') +
          (state.organisation.shortName ? kv('Short name', esc(state.organisation.shortName)) : '') +
          (state.organisation.department ? kv('Department', esc(state.organisation.department)) : '') +
          (state.organisation.whatsapp ? kv('WhatsApp', esc(whatsappLine(state.organisation.whatsappCountry, state.organisation.whatsapp))) : '') +
          (state.organisation.email ? kv('Email', esc(state.organisation.email)) : '') +
          (state.organisation.website ? kv('Website', esc(state.organisation.website)) : '') +
          Object.keys(state.organisation.conditional).filter(function (k) { return state.organisation.conditional[k]; }).map(function (k) {
            var fdef = null;
            if (t && t.conditional) {
              fdef = t.conditional.fields.filter(function (f) { return f.id === k; })[0];
            }
            return fdef ? kv(esc(fdef.label), esc(state.organisation.conditional[k])) : '';
          }).join('')
      },
      {
        title: 'Location', editStep: 3,
        body: kv('Operates in', locationLine()) + kv('Data scope', esc(scopeSummary()))
      },
      {
        title: 'Purpose', editStep: 4,
        body: kv('Purposes', state.purpose.map(function (pid) {
          var p = CFG.PURPOSES.filter(function (x) { return x.id === pid; })[0];
          return p ? esc(p.label) : '';
        }).filter(Boolean).join(', ') || 'None selected') +
          kv('Description', esc(state.purposeDescription || '—'))
      },
      {
        title: 'Data Access', editStep: 5,
        body: CFG.DATA_GROUPS.map(function (grp) {
          var picked = grp.items.filter(function (i) { return state.dataAccess[i.id]; })
            .map(function (i) { return esc(i.label); });
          if (!picked.length) return '';
          return '<div class="inst-review-group-label">' + esc(grp.label) + '</div>' +
            picked.map(function (lbl) { return '<div>✓ ' + lbl + '</div>'; }).join('');
        }).join('') || '<div>No data access requested.</div>'
      },
      {
        title: 'Modules', editStep: 6,
        body: CFG.MODULE_SUITES.map(function (m) {
          var on = state.modules.indexOf(m.id) !== -1;
          return '<div>' + (on ? '✓' : '○') + ' ' + esc(m.title) + '</div>';
        }).join('')
      },
      {
        title: 'Primary Administrator', editStep: 7,
        body: kv('Name', esc(state.primaryAdmin.name || '—')) +
          (state.primaryAdmin.whatsapp ? kv('WhatsApp', esc(whatsappLine(state.primaryAdmin.whatsappCountry, state.primaryAdmin.whatsapp))) : '') +
          (state.primaryAdmin.jobTitle ? kv('Job title', esc(state.primaryAdmin.jobTitle)) : '') +
          (state.primaryAdmin.department ? kv('Department', esc(state.primaryAdmin.department)) : '') +
          (state.primaryAdmin.email ? kv('Email', esc(state.primaryAdmin.email)) : '')
      },
      {
        title: 'Staff', editStep: 8,
        body: state.staff.length
          ? state.staff.map(function (s) {
              return kv(esc(s.name || '(unnamed)'), esc(s.role || 'role not set'));
            }).join('')
          : '<div>No staff invited.</div>'
      }
    ];

    var wrap = $('reviewSections');
    wrap.innerHTML = '';
    sections.forEach(function (sec, i) {
      var el = document.createElement('div');
      el.className = 'inst-review-section' + (i === 0 ? ' open' : '');
      el.innerHTML =
        '<button type="button" class="inst-review-head" aria-expanded="' + (i === 0) + '"><span>' + esc(sec.title) + '</span><span>▾</span></button>' +
        '<div class="inst-review-body">' + sec.body +
        '<div style="margin-top:12px;text-align:right;"><button type="button" class="inst-review-edit" data-edit-step="' + sec.editStep + '">Edit</button></div></div>';
      wrap.appendChild(el);

      el.querySelector('.inst-review-head').addEventListener('click', function () {
        var open = el.classList.toggle('open');
        this.setAttribute('aria-expanded', String(open));
        this.querySelector('span:last-child').textContent = open ? '▴' : '▾';
      });
      el.querySelector('.inst-review-edit').addEventListener('click', function () {
        goTo(+this.dataset.editStep);
      });
    });

    $('submitNotice').textContent = CFG.SUBMIT_NOTICE;
  }

  /* ============================================================
     CONTINUE GATE
     ============================================================ */
  function canContinueCurrentStep() {
    switch (state.currentStep) {
      case 1: return !!state.institutionType;
      case 2:
        return !!state.organisation.name && digits(state.organisation.whatsapp).length >= 7;
      case 3: {
        var locOk = !!state.location.country;
        if (locOk && state.location.country === 'ZW') {
          locOk = !!(state.location.region && state.location.district && state.location.city);
        } else if (locOk) {
          locOk = !!(state.location.region && state.location.city);
        }
        var gs = state.geographicScope;
        var lvl = CFG.SCOPE_LEVELS.filter(function (l) { return l.id === gs.level; })[0];
        var scopeOk = false;
        if (lvl) {
          if (lvl.followup === 'national') scopeOk = true;
          else if (lvl.followup === 'text') scopeOk = !!gs.textValues;
          else if (lvl.followup === 'zwProvinces') scopeOk = gs.provinces.length > 0;
          else if (lvl.followup === 'zwDistricts') scopeOk = gs.districts.length > 0;
          else if (lvl.followup === 'countries') scopeOk = gs.countries.length > 0;
        }
        return locOk && scopeOk;
      }
      case 4: return state.purpose.length > 0 && state.purposeDescription.trim().length >= 30;
      case 5: return Object.keys(state.dataAccess).length > 0;
      case 6: return true; // Core Institutional is always included
      case 7:
        return !!state.primaryAdmin.name &&
          digits(state.primaryAdmin.whatsapp).length >= 7 &&
          state.primaryAdmin.password.length >= 6 &&
          state.primaryAdmin.password === state.primaryAdmin.passwordConfirm;
      case 8:
        return state.staff.every(function (s) {
          var blank = !s.name && !digits(s.whatsapp) && !s.role;
          if (blank) return true;
          return !!s.name && digits(s.whatsapp).length >= 7 && !!s.role;
        });
      default: return true;
    }
  }

  function stepErrorMessages() {
    switch (state.currentStep) {
      case 1: return 'Choose an institution type to continue.';
      case 2: return state.organisation.name ? 'Enter a valid organisation WhatsApp number.' : 'Enter the organisation name.';
      case 3: {
        if (!state.location.country) return 'Select the country your organisation operates in.';
        if (state.location.country === 'ZW' && !(state.location.region && state.location.district && state.location.city)) return 'Complete province, district and city / town.';
        if (state.location.country !== 'ZW' && !(state.location.region && state.location.city)) return 'Complete region and city / town.';
        return 'Select a data scope and at least one area.';
      }
      case 4: return state.purpose.length ? 'Describe your intended use (minimum 30 characters).' : 'Select at least one purpose.';
      case 5: return 'Select at least one data-access option.';
      case 6: return '';
      case 7: {
        if (!state.primaryAdmin.name) return 'Enter the administrator\u2019s full name.';
        if (digits(state.primaryAdmin.whatsapp).length < 7) return 'Enter a valid WhatsApp number.';
        if (state.primaryAdmin.password.length < 6) return 'Password must be at least 6 characters.';
        return 'Passwords do not match.';
      }
      case 8: return 'Each invited staff member needs a name, WhatsApp number and role.';
      default: return '';
    }
  }

  $('institutionalContinue').addEventListener('click', function () {
    if (state.currentStep === 8) {
      state.staff = state.staff.filter(function (s) {
        return !(!s.name && !digits(s.whatsapp) && !s.role);
      });
    }
    if (!canContinueCurrentStep()) {
      setStepError(state.currentStep, stepErrorMessages());
      showToast('⚠️ ' + (stepErrorMessages() || 'Please complete this step.'));
      return;
    }
    setStepError(state.currentStep, '');
    goTo(state.currentStep + 1);
  });

  /* ============================================================
     BACK + UNSAVED CHANGES GUARD
     ============================================================ */
  var pendingLeave = null;

  function requestLeave(action) {
    pendingLeave = action;
    $('instLeaveModal').classList.add('show');
  }

  $('institutionalBack').addEventListener('click', function () {
    if (state.currentStep === 1) { requestLeave('leave'); return; }
    goTo(state.currentStep - 1);
  });

  $('instLeaveStay').addEventListener('click', function () {
    pendingLeave = null;
    $('instLeaveModal').classList.remove('show');
  });
  $('instLeaveSaveDraft').addEventListener('click', function () {
    saveDraft(true);
    $('instLeaveModal').classList.remove('show');
    showToast('💾 Draft saved on this device.');
    setTimeout(function () { location.href = 'institutional-login.html'; }, 500);
  });
  $('instLeaveGo').addEventListener('click', function () {
    try { localStorage.removeItem(KEYS.DRAFT); } catch (e) {}
    $('instLeaveModal').classList.remove('show');
    if (pendingLeave === 'submitted') { location.href = 'institutional-login.html'; return; }
    location.href = 'institutional-login.html';
  });

  window.addEventListener('beforeunload', function (e) {
    if (!dirty || state.status === 'submitted') return undefined;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  /* ============================================================
     SUBMISSION
     ============================================================ */
  async function hashPassword(pw) {
    try {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('roots::inst::' + pw));
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) {
      var h = 5381, s = 'roots::inst::' + pw;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
      return 'x' + (h >>> 0).toString(16);
    }
  }

  function nextApplicationId() {
    var seq = readJson(KEYS.SEQ, 183);
    seq += 1;
    writeJson(KEYS.SEQ, seq);
    var padded = ('000000' + seq).slice(-6);
    return 'ROOTS-INST-' + padded;
  }

  async function submitApplication() {
    // Final gate across every step
    for (var n = 1; n <= 9; n++) {
      var saved = state.currentStep;
      state.currentStep = n;
      var ok = canContinueCurrentStep();
      state.currentStep = saved;
      if (!ok) {
        goTo(n);
        setStepError(n, stepErrorMessages());
        showToast('⚠️ Please complete step ' + n + ' before submitting.');
        return;
      }
    }

    var t = currentType();
    var applicationId = nextApplicationId();
    var nowIso = new Date().toISOString();

    var application = {
      applicationId: applicationId,
      typeCode: state.institutionType,
      organisation: JSON.parse(JSON.stringify(state.organisation)),
      location: JSON.parse(JSON.stringify(state.location)),
      geographicScope: JSON.parse(JSON.stringify(state.geographicScope)),
      purpose: state.purpose.slice(),
      purposeDescription: state.purposeDescription,
      dataAccess: JSON.parse(JSON.stringify(state.dataAccess)),
      modules: state.modules.slice(),
      primaryAdmin: {
        name: state.primaryAdmin.name,
        whatsappCountry: state.primaryAdmin.whatsappCountry,
        whatsapp: state.primaryAdmin.whatsapp,
        jobTitle: state.primaryAdmin.jobTitle,
        department: state.primaryAdmin.department,
        email: state.primaryAdmin.email
      },
      staff: JSON.parse(JSON.stringify(state.staff)),
      status: 'UNDER REVIEW',
      submittedAt: nowIso,
      device: 'local-demo'
    };

    var apps = readJson(KEYS.APPLICATIONS, []);
    apps.push(application);
    writeJson(KEYS.APPLICATIONS, apps);

    // Working local demo: provision credentials immediately so the
    // organisation can sign in while its formal status stays UNDER REVIEW.
    var authHash = await hashPassword(state.primaryAdmin.password);
    var accounts = readJson(KEYS.ACCOUNTS, []);
    accounts.push({
      applicationId: applicationId,
      institutionName: state.organisation.name,
      typeCode: state.institutionType,
      adminName: state.primaryAdmin.name,
      adminRole: 'ADMINISTRATOR',
      adminWhatsappDigits: digits(state.primaryAdmin.whatsapp),
      adminWhatsappFull: digits(whatsappDial(state.primaryAdmin.whatsappCountry)) + digits(state.primaryAdmin.whatsapp),
      authHash: authHash,
      status: 'ACTIVE',
      createdAt: nowIso
    });
    writeJson(KEYS.ACCOUNTS, accounts);

    try { localStorage.removeItem(KEYS.DRAFT); } catch (e) {}
    state.status = 'submitted';
    renderApplicationSubmitted(applicationId, t);
  }

  function whatsappDial(countryCode) {
    var c = window.RegData.countryByCode[countryCode];
    return c ? c.dial : '';
  }

  function renderApplicationSubmitted(applicationId, t) {
    $('instAppId').textContent = applicationId;
    $('instDoneOrg').textContent = state.organisation.name;
    $('instDoneType').textContent = t ? t.icon + ' ' + t.title : state.institutionType;
    document.querySelectorAll('.institutional-step').forEach(function (s) {
      if (s.id === 'institutionalSubmitted') s.classList.add('active');
      else s.classList.remove('active');
    });
    $('institutionalOnboardingControls').style.display = 'none';
    $('institutionalOnboardingHeader').style.display = 'none';
    window.scrollTo(0, 0);
  }

  $('institutionalSubmit').addEventListener('click', function () {
    this.disabled = true;
    submitApplication().catch(function () { showToast('⚠️ Submission failed — please try again.'); })
      .then(function () { $('institutionalSubmit').disabled = false; });
  });

  $('institutionalReturnLogin').addEventListener('click', function () {
    location.href = 'institutional-login.html';
  });

  /* ============================================================
     STATIC FIELD BINDINGS
     ============================================================ */
  bindField('organisationName', function (v) { state.organisation.name = v; });
  bindField('organisationShortName', function (v) { state.organisation.shortName = v; });
  bindField('organisationDepartment', function (v) { state.organisation.department = v; });
  bindField('organisationWhatsapp', function (v) { state.organisation.whatsapp = v; }, 'input', false);
  bindField('organisationEmail', function (v) { state.organisation.email = v; });
  bindField('organisationWebsite', function (v) { state.organisation.website = v; });

  $('organisationWhatsappCountry').addEventListener('change', function () {
    state.organisation.whatsappCountry = this.value;
    dirty = true; saveDraft();
  });
  $('primaryAdminWhatsappCountry').addEventListener('change', function () {
    state.primaryAdmin.whatsappCountry = this.value;
    dirty = true; saveDraft();
  });

  $('organisationCountry').addEventListener('change', function () {
    state.location.country = this.value;
    state.location.region = ''; state.location.district = ''; state.location.city = ''; state.location.area = '';
    dirty = true;
    renderLocationFields();
    saveDraft();
  });

  $('institutionPurposeDescription').addEventListener('input', function () {
    state.purposeDescription = this.value;
    $('purposeCharCount').textContent = this.value.length + ' / 500';
    dirty = true; saveDraft();
  });

  /* ============================================================
     DRAFT RESTORE + BOOT
     ============================================================ */
  function restoreDraft() {
    var draft = readJson(KEYS.DRAFT, null);
    if (!draft) return false;
    if (draft.institutionType) state.institutionType = draft.institutionType;
    if (draft.organisation) {
      Object.keys(draft.organisation).forEach(function (k) { state.organisation[k] = draft.organisation[k]; });
    }
    if (draft.location) Object.keys(draft.location).forEach(function (k) { state.location[k] = draft.location[k]; });
    if (draft.geographicScope) state.geographicScope = draft.geographicScope;
    if (draft.purpose) state.purpose = draft.purpose;
    if (draft.purposeDescription) state.purposeDescription = draft.purposeDescription;
    if (draft.dataAccess) state.dataAccess = draft.dataAccess;
    if (Array.isArray(draft.staff)) state.staff = draft.staff;
    if (draft.primaryAdmin) {
      ['name', 'whatsappCountry', 'whatsapp', 'jobTitle', 'department', 'email'].forEach(function (k) {
        if (draft.primaryAdmin[k]) state.primaryAdmin[k] = draft.primaryAdmin[k];
      });
    }
    return true;
  }

  function syncStaticInputs() {
    $('organisationName').value = state.organisation.name || '';
    $('organisationShortName').value = state.organisation.shortName || '';
    $('organisationDepartment').value = state.organisation.department || '';
    $('organisationWhatsapp').value = state.organisation.whatsapp || '';
    $('organisationEmail').value = state.organisation.email || '';
    $('organisationWebsite').value = state.organisation.website || '';
    $('organisationWhatsappCountry').value = state.organisation.whatsappCountry || 'ZW';

    $('primaryAdminName').value = state.primaryAdmin.name || '';
    $('primaryAdminWhatsapp').value = state.primaryAdmin.whatsapp || '';
    $('primaryAdminJobTitle').value = state.primaryAdmin.jobTitle || '';
    $('primaryAdminDepartment').value = state.primaryAdmin.department || '';
    $('primaryAdminEmail').value = state.primaryAdmin.email || '';
    $('primaryAdminWhatsappCountry').value = state.primaryAdmin.whatsappCountry || 'ZW';

    $('institutionPurposeDescription').value = state.purposeDescription || '';
    $('purposeCharCount').textContent = (state.purposeDescription || '').length + ' / 500';
  }

  restoreDraft();
  seedOptionalModulesFromDraft();
  initCountrySelects();
  renderInstitutionTypeCards();
  renderOrganisationBadge();
  renderOrgConditional();
  renderLocationFields();
  renderGeographicScope();
  renderPurposeSelector();
  renderDataAccessSelector();
  renderPrimaryAdminForm();
  renderStaffInvites();
  syncStaticInputs();
  goTo(1);
})();
