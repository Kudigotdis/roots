/* ============================================================
   ROOTS — CUSTOMARY LAW LOGIC ENGINE (Section 6 of spec)
   Pure functions. No DOM, no side effects. Independently testable.
   ============================================================ */

/* ---- 6.1 Offline Incest Prevention (Exogamy Check) ---- */
function validateMarriageFeasibility(a, b) {
  if (!a || !b) return { allowed: false, message: "Cannot validate — missing person data." };
  const aMutupo = (a.kinship && a.kinship.mutupo || '').trim().toLowerCase();
  const aChidawo = (a.kinship && a.kinship.chidawo || '').trim().toLowerCase();
  const bMutupo = (b.kinship && b.kinship.mutupo || '').trim().toLowerCase();
  const bChidawo = (b.kinship && b.kinship.chidawo || '').trim().toLowerCase();
  if (aMutupo && bMutupo && aMutupo === bMutupo && aChidawo && bChidawo && aChidawo === bChidawo) {
    return { allowed: false, code: "MUTUPO_VEKUBEREKANA", message: "Marriage strictly prohibited — identical totem and praise name (Mutupo neChidawo zvakafanana)." };
  }
  return { allowed: true, message: "" };
}

/* ---- 6.2 Patrilineal Inheritance (default) vs. Matrilineal Exception (Tonga) ---- */
function inheritLineage(fatherNode, motherNode, childInput) {
  const isTonga = motherNode && motherNode.kinship &&
    motherNode.kinship.culturalSystem === "TONGA_MATRILINEAL";
  if (isTonga) {
    return Object.assign({}, childInput, {
      kinship: Object.assign({}, childInput.kinship || {}, {
        culturalSystem: "TONGA_MATRILINEAL",
        mukowaMatriclan: motherNode.kinship.mukowaMatriclan || '',
        luzuboPatriclan: fatherNode ? fatherNode.kinship.mutupo : '',
        lineageAnchorType: "MATERNAL_GRANDFATHER"
      })
    });
  }
  return Object.assign({}, childInput, {
    kinship: Object.assign({}, childInput.kinship || {}, {
      mutupo: fatherNode ? fatherNode.kinship.mutupo : '',
      chidawo: fatherNode ? fatherNode.kinship.chidawo : ''
    })
  });
}

/* ---- 6.3 Out-of-Wedlock Totem Drift ---- */
function resolveChildTotem(child, maternalGrandfather, biologicalFather, ledger) {
  const cleared = ledger && ledger.maputiroStatus === "PAID" && ledger.chiredzwaStatus === "PAID";
  if (cleared && biologicalFather) {
    return {
      activeTotem: biologicalFather.kinship.mutupo,
      custodian: biologicalFather.id,
      anchor: "BIOLOGICAL_FATHER"
    };
  }
  if (maternalGrandfather) {
    return {
      activeTotem: maternalGrandfather.kinship.mutupo,
      custodian: maternalGrandfather.id,
      anchor: "MATERNAL_GRANDFATHER"
    };
  }
  return { activeTotem: "UNKNOWN", custodian: null, anchor: "COMPUTED_FLOATING" };
}

/* ---- 6.4 Polygamous House Seniority ---- */
function sortByHouseSeniority(siblings) {
  return siblings.slice().sort(function(a, b) {
    var aRank = (a.kinship && a.kinship.houseRank != null) ? a.kinship.houseRank : Infinity;
    var bRank = (b.kinship && b.kinship.houseRank != null) ? b.kinship.houseRank : Infinity;
    if (aRank !== bRank) return aRank - bRank;
    var aBorn = a.dob ? new Date(a.dob).getTime() : 0;
    var bBorn = b.dob ? new Date(b.dob).getTime() : 0;
    return aBorn - bBorn;
  });
}

/* ---- 6.5 Deceased Node Lifecycle State Machine ---- */
var LIFECYCLE_STATES = {
  ALIVE: "ALIVE",
  DECEASED_FROZEN: "DECEASED_FROZEN",
  RITUAL_CLEARED: "RITUAL_CLEARED",
  NHAKA_RESOLVED: "NHAKA_RESOLVED"
};

var LIFECYCLE_TRANSITIONS = {};
LIFECYCLE_TRANSITIONS[LIFECYCLE_STATES.ALIVE] = [LIFECYCLE_STATES.DECEASED_FROZEN];
LIFECYCLE_TRANSITIONS[LIFECYCLE_STATES.DECEASED_FROZEN] = [LIFECYCLE_STATES.RITUAL_CLEARED];
LIFECYCLE_TRANSITIONS[LIFECYCLE_STATES.RITUAL_CLEARED] = [LIFECYCLE_STATES.NHAKA_RESOLVED];
LIFECYCLE_TRANSITIONS[LIFECYCLE_STATES.NHAKA_RESOLVED] = [];

function canTransitionTo(currentState, nextState) {
  var allowed = LIFECYCLE_TRANSITIONS[currentState] || [];
  return allowed.indexOf(nextState) !== -1;
}

/* ---- 6.6 Offline Consanguinity / Timeline Visibility ---- */
function calculateConsanguinityDistance(startId, targetId, graph, visited, depth) {
  if (startId === targetId) return depth || 0;
  visited = visited || new Set();
  depth = depth || 0;
  if (depth > 4) return Infinity;
  visited.add(startId);
  var node = graph[startId];
  if (!node) { visited.delete(startId); return Infinity; }
  var min = Infinity;
  var adjacents = [];
  var rels = node.relations || node;
  var parentIds = rels.parentIds || [];
  var childIds = rels.childIds || [];
  var spouseIds = rels.spouseIds || [];
  adjacents = adjacents.concat(parentIds, childIds, spouseIds);
  for (var i = 0; i < adjacents.length; i++) {
    var next = adjacents[i];
    if (next && !visited.has(next)) {
      var d = calculateConsanguinityDistance(next, targetId, graph, visited, depth + 1);
      if (d < min) min = d;
    }
  }
  visited.delete(startId);
  return min;
}

function isVisibleForScope(postScope, viewerId, authorId, graph) {
  if (postScope === "PUBLIC_CONNECTED") return true;
  var dist = calculateConsanguinityDistance(viewerId, authorId, graph);
  switch (postScope) {
    case "SIBLINGS": return dist <= 1;
    case "FIRST_COUSINS": return dist <= 2;
    case "SECOND_COUSINS": return dist <= 4;
    case "THIRD_COUSINS": return dist <= 6;
  }
  return false;
}

/* ---- 6.7 Spiritual Lineage Overrides (Ngozi / Kumutsa Mapfihwa) ---- */
// Reserved field: customaryLineageOverrideId in Person.kinship
// This is a manual, elder-confirmed data entry — never auto-computed.

/* ---- 6.8 Offline P2P Sync (WhatsApp Text-Snippet Engine) ---- */
function generateWhatsAppPayload(person) {
  var pAdmin = person.admin || {};
  var pKinship = person.kinship || {};
  var segments = [
    "ROOTS_V1",
    pAdmin.province || '',
    pAdmin.district || '',
    pAdmin.villageBookId || '',
    pKinship.mutupo || '',
    pKinship.chidawo || '',
    (pAdmin.nationalId || '').replace(/-/g, '')
  ];
  var combined = segments.join('|');
  var encoded = btoa(encodeURIComponent(combined));
  return 'whatsapp://send?text=ROOTS_SYNC:' + encoded;
}

function parseWhatsAppPayload(rawText) {
  var prefix = "ROOTS_SYNC:";
  var idx = rawText.indexOf(prefix);
  if (idx === -1) return null;
  var encoded = rawText.substring(idx + prefix.length);
  try {
    var decoded = decodeURIComponent(atob(encoded));
    var parts = decoded.split('|');
    if (parts[0] !== "ROOTS_V1") return null;
    return {
      province: parts[1] || '',
      district: parts[2] || '',
      villageBookId: parts[3] || '',
      mutupo: parts[4] || '',
      chidawo: parts[5] || '',
      nationalIdStripped: parts[6] || ''
    };
  } catch(e) {
    return null;
  }
}

/* ---- 6.9 Chieftainship Collateral Succession ---- */
function computeNextInLine(candidates) {
  var sorted = candidates.slice().filter(function(c) { return c.lifecycleState !== 'DECEASED_FROZEN' && !c.died; });
  sorted.sort(function(a, b) {
    var aRank = (a.kinship && a.kinship.houseRank != null) ? a.kinship.houseRank : Infinity;
    var bRank = (b.kinship && b.kinship.houseRank != null) ? b.kinship.houseRank : Infinity;
    if (aRank !== bRank) return aRank - bRank;
    var aBorn = a.dob ? new Date(a.dob).getTime() : 0;
    var bBorn = b.dob ? new Date(b.dob).getTime() : 0;
    return aBorn - bBorn;
  });
  for (var i = 0; i < sorted.length; i++) {
    var c = sorted[i];
    var flags = [];
    if (hasZera(c)) flags.push("ZERA");
    if (hasKuremara(c)) flags.push("KUREMARA");
    if (hasMhosva(c)) flags.push("MHOSVA_NEHUROYI");
    if (flags.length === 0) return { candidate: c, disqualifications: [] };
    if (i === sorted.length - 1) return { candidate: c, disqualifications: flags };
  }
  return { candidate: null, disqualifications: ["NO_ELIGIBLE_CANDIDATE"] };
}

function hasZera(person) {
  if (!person || person.kinship && person.kinship.zera) return true;
  var parentIds = person.relations && person.relations.parentIds || [];
  for (var i = 0; i < parentIds.length; i++) {
    var parent = byId[parentIds[i]];
    if (parent && parent.lifecycleState === 'ALIVE' && !parent.died) return true;
    var grandParentIds = parent && parent.relations && parent.relations.parentIds || [];
    for (var j = 0; j < grandParentIds.length; j++) {
      var gp = byId[grandParentIds[j]];
      if (gp && gp.lifecycleState === 'ALIVE' && !gp.died) return true;
    }
  }
  return false;
}

function hasKuremara(person) {
  if (!person) return false;
  if (person.kinship && person.kinship.kuremara) return true;
  return false;
}

function hasMhosva(person) {
  if (!person) return false;
  if (person.kinship && person.kinship.mhosva) return true;
  return false;
}

/* ============================================================
   7.0 DEATH & SUCCESSION (KUGARA NHAKA)
   ============================================================ */

var FUNERAL_PHASES = [
  { id: 'notify_family', label: 'Notify immediate family', done: false },
  { id: 'notify_extended', label: 'Notify extended relatives', done: false },
  { id: 'notify_community', label: 'Notify community / church', done: false },
  { id: 'burial_arrangements', label: 'Burial arrangements', done: false },
  { id: 'funeral_service', label: 'Funeral service held', done: false },
  { id: 'mourning_period', label: 'Mourning period observed', done: false }
];

var RITUAL_PHASES = [
  { id: 'kuchenura', label: 'Kuchenura (cleansing ceremony)', done: false },
  { id: 'kubvisa', label: 'Kubvisa (removal of mourning attire)', done: false },
  { id: 'kugadza', label: 'Kugadza (installation of heir)', done: false },
  { id: 'nhaka_reading', label: 'Nhaka reading (will/estate declaration)', done: false }
];

var ESTATE_ACTIONS = [
  { id: 'inventory_assets', label: 'Inventory assets', done: false },
  { id: 'identify_heirs', label: 'Identify rightful heirs', done: false },
  { id: 'assign_executor', label: 'Assign executor', done: false },
  { id: 'distribute_estate', label: 'Distribute estate', done: false },
  { id: 'close_estate', label: 'Close estate (Nhaka resolved)', done: false }
];

function createDeathRecord(personId) {
  return {
    personId: personId,
    dateOfDeath: null,
    placeOfDeath: '',
    causeOfDeath: '',
    funeral: {
      phases: FUNERAL_PHASES.map(function(p){ return { id: p.id, label: p.label, done: false }; }),
      burialDate: null,
      burialPlace: ''
    },
    ritual: {
      phases: RITUAL_PHASES.map(function(p){ return { id: p.id, label: p.label, done: false }; }),
      ritualDate: null,
      officiant: ''
    },
    estate: {
      phases: ESTATE_ACTIONS.map(function(p){ return { id: p.id, label: p.label, done: false }; }),
      assets: [],
      heirs: [],
      executorId: null,
      willNotes: ''
    }
  };
}

function transitionLifecycleState(person, nextState) {
  if (!person) return { allowed: false, message: 'No person data' };
  var current = person.lifecycleState || 'ALIVE';
  if (!canTransitionTo(current, nextState)) {
    return { allowed: false, message: 'Cannot transition from ' + current + ' to ' + nextState };
  }
  return { allowed: true };
}

function advanceLifecycleState(person, deathRecords) {
  if (!person) return { allowed: false, message: 'No person data' };
  var current = person.lifecycleState || 'ALIVE';
  var record = deathRecords && deathRecords[person.id];
  if (current === 'ALIVE') return { allowed: true, nextState: 'DECEASED_FROZEN' };
  if (current === 'DECEASED_FROZEN') {
    if (!record) return { allowed: false, message: 'No death record — complete funeral registration first' };
    var ritualDone = record.ritual.phases.every(function(p){ return p.done; });
    if (!ritualDone) return { allowed: false, message: 'Complete all ritual phases before clearing' };
    return { allowed: true, nextState: 'RITUAL_CLEARED' };
  }
  if (current === 'RITUAL_CLEARED') {
    if (!record) return { allowed: false, message: 'No death record' };
    var estateDone = record.estate.phases.every(function(p){ return p.done; });
    if (!estateDone) return { allowed: false, message: 'Complete all estate phases before resolving' };
    return { allowed: true, nextState: 'NHAKA_RESOLVED' };
  }
  return { allowed: false, message: 'No further transitions available' };
}

function getAllowedActions(lifecycleState) {
  switch (lifecycleState) {
    case 'ALIVE': return { canRegisterDeath: true, canViewEstate: false, canDistribute: false };
    case 'DECEASED_FROZEN': return { canRegisterDeath: false, canViewEstate: false, canDistribute: false, canClearRitual: true };
    case 'RITUAL_CLEARED': return { canRegisterDeath: false, canViewEstate: true, canDistribute: true };
    case 'NHAKA_RESOLVED': return { canRegisterDeath: false, canViewEstate: true, canDistribute: false };
    default: return { canRegisterDeath: false, canViewEstate: false, canDistribute: false };
  }
}

/* ============================================================
   8.0 MARRIAGE LEDGER (ROORA / LOBOLA)
   ============================================================ */

var ROORA_PHASES = [
  { id: 'kubvunza',     label: 'Kubvunza / Ukucela',         desc: 'Family emissaries ask for the bride\'s hand', demanded: 0, paid: 0 },
  { id: 'kuzivisa',     label: 'Kuzivisa / Ukwazisa',        desc: 'Formal introduction of families', demanded: 0, paid: 0 },
  { id: 'negotiation',  label: 'Roora Negotiation (Dare)',   desc: 'Main negotiation meeting', demanded: 0, paid: 0 },
  { id: 'rusambo',      label: 'Rusambo / Isu (Token)',      desc: 'Initial bride-price deposit', demanded: 0, paid: 0 },
  { id: 'mombe_humai',  label: 'Mombe yeHumai / Inkomo kaMama', desc: 'Mother\'s cow — non-refundable, no cash substitute', demanded: 1, paid: 0, nonRefundable: true },
  { id: 'maputiro',     label: 'Maputiro / Ukuyala',         desc: 'Pre-wedding ceremony payment', demanded: 0, paid: 0 },
  { id: 'chiredzwa',    label: 'Chiredzwa / Isu lokugcina',  desc: 'Final payment / totem-clearing payment', demanded: 0, paid: 0 },
  { id: 'mbudzi',       label: 'Mbudzi / Imbuzi (Goat)',     desc: 'Goat ceremony — post-wedding ritual', demanded: 0, paid: 0 },
  { id: 'kupinza',      label: 'Kupinza / Ukungenisa',       desc: 'Bride officially received into groom\'s family', demanded: 0, paid: 0 }
];

function createMarriageLedger(personAId, personBId) {
  return {
    id: 'marriage_' + personAId + '_' + personBId,
    personAId: personAId,
    personBId: personBId,
    status: 'NEGOTIATING',
    phases: ROORA_PHASES.map(function(p){
      return { id: p.id, label: p.label, desc: p.desc, demanded: p.demanded, paid: 0, status: 'PENDING', nonRefundable: !!p.nonRefundable };
    }),
    representatives: [],
    notes: '',
    createdDate: new Date().toISOString().split('T')[0]
  };
}

function completeRooraPhase(ledger, phaseId) {
  var idx = -1;
  for (var i = 0; i < ledger.phases.length; i++) {
    if (ledger.phases[i].id === phaseId) { idx = i; break; }
  }
  if (idx === -1) return { success: false, message: 'Phase not found' };
  if (idx > 0 && ledger.phases[idx - 1].status !== 'COMPLETED') {
    return { success: false, message: 'Cannot skip phases — complete ' + ledger.phases[idx - 1].label + ' first' };
  }
  ledger.phases[idx].status = 'COMPLETED';
  ledger.phases[idx].paid = ledger.phases[idx].demanded;
  var allDone = ledger.phases.every(function(p){ return p.status === 'COMPLETED'; });
  if (allDone) ledger.status = 'COMPLETED';
  return { success: true };
}

function getRooraProgress(ledger) {
  var total = ledger.phases.length;
  var done = 0;
  var totalDemanded = 0;
  var totalPaid = 0;
  ledger.phases.forEach(function(p){
    if (p.status === 'COMPLETED') done++;
    totalDemanded += p.demanded;
    totalPaid += p.paid;
  });
  return { completed: done, total: total, percent: Math.round(done / total * 100), totalDemanded: totalDemanded, totalPaid: totalPaid };
}
