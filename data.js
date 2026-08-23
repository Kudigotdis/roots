/* ============================================================
   ROOTS — PERSON DATA MODEL & INFRASTRUCTURE
   Every person is a node: { id, name, born, died, gender,
   relation, profession, location, notes, spouseId,
   parentIds:[], img }
   Tree is rendered by walking parentIds -> children.

   POPULATION:
   - Family mode  : dataset.js imports the 533-person master
                    dataset (dataset_v2.js) into PEOPLE/byId.
   - Personal mode: dataset.js inserts only the signed-up
                    user's own person record.
   This file no longer seeds any demo family directly.
   ============================================================ */

const PEOPLE = [];
const byId = {};
function P(o){ PEOPLE.push(o); byId[o.id]=o; return o.id; }

window.RootsData = {};

/* ============================================================
   SPEC-COMPLIANT UPGRADE LAYER (Section 1 of ROOTS_Cultural_Data_Structure)
   Wraps flat records into nested admin/ethnicity/kinship/oral model.
   Exposed so dataset.js can re-run it after importing new people.
   ============================================================ */
window.RootsData.upgradeAll = function upgradeToSpecModel(){
  Object.keys(byId).forEach(function(id){
    var p = byId[id];
    if (!p) return;
    if (p._upgraded) return;
    p.admin = p.admin || {
      province: '', district: '', ward: '', chief: '', headman: '',
      sabhuku: '', villageBookId: '', nationalId: ''
    };
    p.ethnicity = p.ethnicity || { languageCluster: '', specificGroup: '' };
    p.kinship = p.kinship || {
      culturalSystem: 'SHONA', mutupo: '', chidawo: '',
      mukowaMatriclan: '', luzuboPatriclan: '',
      houseRank: null, lineageAnchorType: 'BIOLOGICAL_FATHER',
      customaryLineageOverrideId: null,
      zera: false, kuremara: false, mhosva: false
    };
    p.oral = p.oral || {
      guruuswaOrigin: '', praisePoem: '', greeting: '', taboo: ''
    };
    p.relations = p.relations || {
      parentIds: p.parentIds || [],
      spouseIds: p.spouseId ? [p.spouseId] : [],
      childIds: []
    };
    p.lifecycleState = p.lifecycleState || (p.died ? 'DECEASED_FROZEN' : 'ALIVE');
    p.media = p.media || { profilePhoto: null, galleryRefs: [] };
    p.sync = p.sync || { versionSequence: 0, lastMutatedByDevice: 'local', utcTimestampApprox: '' };
    p._upgraded = true;
  });

  // Build childIds from parentIds
  Object.keys(byId).forEach(function(id){
    var p = byId[id];
    (p.relations.parentIds || []).forEach(function(pid){
      var parent = byId[pid];
      if (parent && parent.relations && parent.relations.childIds.indexOf(id) === -1) {
        parent.relations.childIds.push(id);
      }
    });
  });
};
window.RootsData.upgradeAll();

/* Helper: create a spec-compliant person record directly */
function createPerson(opts){
  var id = P({
    id: opts.id,
    name: opts.fullName,
    fullName: opts.fullName,
    preferredName: opts.preferredName || '',
    gender: opts.gender || 'u',
    born: opts.dob ? String(new Date(opts.dob).getFullYear()) : '',
    died: opts.dateOfDeath ? String(new Date(opts.dateOfDeath).getFullYear()) : '',
    dob: opts.dob || null,
    isAlive: opts.isAlive !== false,
    dateOfDeath: opts.dateOfDeath || null,
    relation: opts.relation || '',
    profession: opts.profession || '',
    location: opts.location || '',
    notes: opts.notes || '',
    spouseId: (opts.relations && opts.relations.spouseIds && opts.relations.spouseIds[0]) || null,
    parentIds: (opts.relations && opts.relations.parentIds) || [],
    admin: opts.admin || {},
    ethnicity: opts.ethnicity || {},
    kinship: Object.assign({ zera: false, kuremara: false, mhosva: false }, opts.kinship || {}),
    oral: opts.oral || {},
    relations: opts.relations || { parentIds: [], spouseIds: [], childIds: [] },
    lifecycleState: opts.lifecycleState || 'ALIVE',
    media: opts.media || { profilePhoto: null, galleryRefs: [] },
    sync: opts.sync || { versionSequence: 0, lastMutatedByDevice: 'local', utcTimestampApprox: '' }
  });
  return id;
}
