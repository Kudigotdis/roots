/* ============================================================
   REGISTRATION VALIDATION — single source of truth.
   validateRegistration(formState) -> {
     valid, errors[], checks[{key,label,ok}],
     completed, required, percentage
   }
   Required/optional status is configured here (REQUIRED_KEYS),
   not scattered through the UI.
   ============================================================ */
(function () {
  'use strict';

  var NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’\-\s]*$/u;
  var USERNAME_RE = /^[a-z0-9._]+$/;

  var REQUIRED_KEYS = [
    'firstName', 'surname', 'username', 'dateOfBirth', 'gender',
    'nationality', 'race', 'mobileNumbers', 'whatsappNumbers',
    'countryOfResidence', 'locationDetail', 'interests',
    'password', 'passwordConfirm'
  ];

  function validName(s) { return typeof s === 'string' && s.trim().length >= 1 && NAME_RE.test(s.trim()); }

  function numberComplete(entry) {
    return !!(entry && entry.countryCode && entry.number &&
      String(entry.number).replace(/\D/g, '').length >= 7);
  }

  /* ---------- individual rules ---------- */
  var RULES = {
    firstName: function (f) { return validName(f.firstName); },
    surname: function (f) { return validName(f.surname); },
    username: function (f) {
      if (!f.username) return false;
      var u = f.username.toLowerCase();
      if (!USERNAME_RE.test(u)) return false;
      if (u.length < 3 || u.length > 24) return false;
      return !f.takenUsernames || !f.takenUsernames.includes(u);
    },
    dateOfBirth: function (f) {
      if (!f.dateOfBirth) return false;
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.dateOfBirth);
      if (!m) return false;
      var d = new Date(+m[1], +m[2] - 1, +m[3]);
      if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return false;
      var now = new Date();
      if (d > now) return false;                       // not in future
      var age = (now - d) / 31557600000;
      return age <= 120;                               // realistic bound
    },
    gender: function (f) { return f.gender === 'male' || f.gender === 'female'; },
    nationality: function (f) { return !!f.nationality; },
    race: function (f) {
      if (!f.race) return false;
      if (f.race === 'other') return !!f.raceOther;
      return true;
    },
    mobileNumbers: function (f) {
      return Array.isArray(f.mobileNumbers) &&
        f.mobileNumbers.length >= 1 &&
        f.mobileNumbers.every(numberComplete);
    },
    whatsappNumbers: function (f) {
      return Array.isArray(f.whatsappNumbers) &&
        f.whatsappNumbers.length >= 1 &&
        f.whatsappNumbers.every(numberComplete);
    },
    countryOfResidence: function (f) { return !!f.countryOfResidence; },
    locationDetail: function (f) {
      return !!(f.province || f.regionGeneric) && !!(f.townCityVillage);
    },
    interests: function (f) {
      return Array.isArray(f.interests) && f.interests.length >= 5;
    },
    password: function (f) { return typeof f.password === 'string' && f.password.length >= 6; },
    passwordConfirm: function (f) {
      return typeof f.passwordConfirm === 'string' && f.passwordConfirm.length >= 6 &&
        f.password === f.passwordConfirm;
    }
  };

  var LABELS = {
    firstName: 'First name', surname: 'Surname', username: 'Username',
    dateOfBirth: 'Date of birth', gender: 'Gender', nationality: 'Nationality',
    race: 'Race', mobileNumbers: 'At least one mobile number',
    whatsappNumbers: 'At least one WhatsApp number',
    countryOfResidence: 'Country of residence', locationDetail: 'Location details',
    interests: 'At least 5 interests', password: 'Password (6+ chars)',
    passwordConfirm: 'Password confirmation'
  };

  window.validateRegistration = function (formState) {
    var checks = [], errors = [];
    REQUIRED_KEYS.forEach(function (k) {
      var ok = RULES[k](formState || {});
      checks.push({ key: k, label: LABELS[k], ok: ok });
      if (!ok) errors.push(LABELS[k]);
    });
    var completed = checks.filter(function (c) { return c.ok; }).length;
    var required = checks.length;
    return {
      valid: completed === required,
      errors: errors,
      checks: checks,
      completed: completed,
      required: required,
      percentage: Math.round((completed / required) * 100)
    };
  };

  window.ValidationRules = { REQUIRED_KEYS: REQUIRED_KEYS, RULES: RULES };
})();
