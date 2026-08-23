#!/usr/bin/env node
/* Generates offline JS wrappers from source data files:
   - data/roots_family_tree_master_dataset_v2.json -> dataset_v2.js
   - data/zimbabwe_locations.js                    -> zw_locations.js (normalized)
   - data/schools_list.json                        -> schools_db.js
   Run: node tools/generate-dataset-js.js          */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => { fs.writeFileSync(path.join(ROOT, f), s, 'utf8'); console.log('wrote', f, (s.length / 1024).toFixed(1) + 'KB'); };

let out = 0;

/* ---- 1. Family tree master dataset v2 ---- */
const D = JSON.parse(read('data/roots_family_tree_master_dataset_v2.json'));
// Pass through an optional gender column when it is added later.
let genders = 0;
D.people.forEach(p => { if (p.gender) genders++; });
write('dataset_v2.js',
  '/* GENERATED FILE - edit data/roots_family_tree_master_dataset_v2.json then run: npm run gen:data */\n' +
  'window.ROOTS_DATASET_V2 = ' + JSON.stringify({ app: D.app, focusPerson: D.focusPerson, version: D.version, people: D.people, relationships: D.relationships }) + ';\n');
console.log('   people:', D.people.length, '| relationships:', D.relationships.length, '| gender fields present:', genders);

/* ---- 2. Zimbabwe locations (source already defines window.ZIMBABWE_LOCATIONS_DATA) ---- */
const zw = read('data/zimbabwe_locations.js').trim();
if (!zw.startsWith('window.ZIMBABWE_LOCATIONS_DATA')) throw new Error('Unexpected zimbabwe_locations.js shape');
write('zw_locations.js', '/* GENERATED FILE - source: data/zimbabwe_locations.js */\n' + zw + '\n');

/* ---- 3. Zimbabwe schools list ---- */
const S = JSON.parse(read('data/schools_list.json'));
if (!Array.isArray(S)) throw new Error('schools_list.json must be an array of names');
write('schools_db.js',
  '/* GENERATED FILE - source: data/schools_list.json (' + S.length + ' schools) */\n' +
  'window.SCHOOLS_ZW = ' + JSON.stringify(S) + ';\n');

console.log('DONE');
