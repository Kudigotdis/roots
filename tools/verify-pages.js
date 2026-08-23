/* Cross-check: every element ID referenced by each page's scripts must
   exist in that page's static HTML or be created dynamically by any JS.
   Also verifies local asset refs resolve. Run: node tools/verify-pages.js */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const pages = {
  'index.html': ['app.js', 'shell.js', 'store.js', 'settings.js'],
  'timeline.html': ['timeline.js', 'shell.js', 'store.js'],
  'tree.html': ['tree.js', 'shell.js', 'store.js', 'settings.js'],
  'library.html': ['library.js', 'shell.js', 'store.js'],
  'onboarding.html': ['onboarding.js'],
  'institutional/institutional-login.html': ['institutional/institutional-config.js', 'institutional/institutional-login.js', 'registration-data.js'],
  'institutional/institutional-onboarding.html': ['institutional/institutional-config.js', 'institutional/institutional-onboarding.js', 'registration-data.js', 'zw_locations.js'],
  'institutional/institutional-workspace.html': ['zw_locations.js', 'store.js', 'data.js', 'dataset_v2.js', 'dataset.js', 'lookups.js', 'customary.js', 'schools_db.js', 'institutional/institutional-config.js', 'institutional/institutional-workspace-config.js', 'institutional/institutional-access.js', 'institutional/institutional-dashboard.js', 'institutional/institutional-search.js', 'institutional/institutional-lineage.js', 'institutional/institutional-projects.js', 'institutional/institutional-reports.js', 'institutional/institutional-exports.js', 'institutional/institutional-disputes.js', 'institutional/institutional-access-centre.js', 'institutional/institutional-organisation.js', 'institutional/institutional-shell.js'],
  'admin/admin-login.html': ['registration-data.js', 'admin/admin-permissions.js', 'admin/admin-data.js', 'admin/admin-login.js'],
  'admin/admin.html': ['registration-data.js', 'zw_locations.js', 'schools_db.js', 'store.js', 'data.js', 'dataset_v2.js', 'dataset.js', 'lookups.js', 'customary.js', 'institutional/institutional-config.js', 'admin/admin-permissions.js', 'admin/admin-data.js', 'admin/admin.js']
};

let failures = 0;
for (const [page, scripts] of Object.entries(pages)) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  let dynamic = '';
  for (const s of Object.values(pages).flat()) {
    try { dynamic += fs.readFileSync(path.join(root, s), 'utf8'); } catch (e) {}
  }
  const idDefs = new Set();
  for (const m of html.matchAll(/id="([^"]+)"/g)) idDefs.add(m[1]);
  for (const m of dynamic.matchAll(/id\s*=\s*['"]([^'"]+)['"]/g)) idDefs.add(m[1]);
  for (const m of dynamic.matchAll(/\.id\s*=\s*['"]([^'"]+)['"]/g)) idDefs.add(m[1]);

  const missing = new Set();
  for (const s of scripts) {
    const js = fs.readFileSync(path.join(root, s), 'utf8');
    for (const m of js.matchAll(/\$\(['"]([^'"]+)['"]\)|getElementById\(['"]([^'"]+)['"]\)/g)) {
      const id = m[1] || m[2];
      if (!idDefs.has(id)) missing.add(`${s} -> #${id}`);
    }
    for (const m of js.matchAll(/querySelector(?:All)?\(['"]#([^'". >\[]+)['"]/g)) {
      if (!idDefs.has(m[1])) missing.add(`${s} -> #${m[1]} (selector)`);
    }
  }
  if (missing.size) {
    console.log(`FAIL ${page}:`);
    missing.forEach(f => console.log('   ' + f));
    failures += missing.size;
  } else {
    console.log(`OK   ${page} (${scripts.length} scripts)`);
  }
}

for (const page of [...Object.keys(pages)]) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^":#]+)"/g)) {
    const ref = m[1];
    if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:')) continue;
    if (!fs.existsSync(path.join(root, path.dirname(page), ref))) { console.log(`FAIL ${page}: missing asset ${ref}`); failures++; }
  }
}
console.log(failures ? `\n${failures} PROBLEM(S)` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
