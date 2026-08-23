/* Headless verification of data.js + store.js + dataset.js + wrappers */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

const store = {};
const sandbox = {
  console,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  setTimeout, clearTimeout
};
sandbox.window = sandbox;
vm.createContext(sandbox);

function load(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}

['data.js', 'store.js', 'dataset_v2.js', 'zw_locations.js', 'schools_db.js', 'dataset.js'].forEach(load);

let fails = 0;
sandbox.__report = function (label, cond) { console.log((cond ? 'OK   ' : 'FAIL ') + label); if (!cond) fails++; };

vm.runInContext(`
  check = __report;
  check('533 people imported', PEOPLE.length === 533);
  check('R001 focus person', byId.R001 && byId.R001.name === 'Kudzanai Paul Chitate IV');
  check('R001 born 1987', byId.R001.born === 1987);
  check('R001 parents = [R002,R003]', JSON.stringify(byId.R001.parentIds) === '["R002","R003"]');
  check('R002 spouse R003', byId.R002.spouseId === 'R003' && byId.R003.spouseId === 'R002');
  check('spec upgrade applied', !!(byId.R001.kinship && byId.R001.relations));
  check('myId = R001 in store', JSON.parse(localStorage.getItem('roots_app_state')).myId === 'R001');
  check('gender valid enum', ['m','f','u'].includes(byId.R001.gender));
  check('ZW locations loaded', Array.isArray(window.ZIMBABWE_LOCATIONS_DATA.districts) && window.ZIMBABWE_LOCATIONS_DATA.districts.length > 0);
  check('schools loaded', Array.isArray(window.SCHOOLS_ZW) && window.SCHOOLS_ZW.length > 8000);
  let dangling = 0;
  (window.ROOTS_DATASET_V2.relationships || []).forEach(r => { if (!byId[r.from] || !byId[r.to]) dangling++; });
  check('no dangling relationship endpoints', dangling === 0);
  let missingParents = 0;
  window.ROOTS_DATASET_V2.relationships.forEach(r => {
    if (r.relationship === 'child-of' && !(byId[r.from].parentIds || []).includes(r.to)) missingParents++;
  });
  check('all child-of -> parentIds', missingParents === 0);
`, sandbox, { filename: 'assertions' });

console.log(fails ? '\n' + fails + ' FAILURE(S)' : '\nALL DATASET CHECKS PASSED');
process.exit(fails ? 1 : 0);
