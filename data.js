/* ============================================================
   CHITATE / KEPEKEPE FAMILY TREE — DATA MODEL
   Every person is a node: { id, name, born, died, gender, relation,
   profession, location, notes, spouseId, parentIds:[], img }
   Tree is rendered by walking parentIds -> children.
   ============================================================ */

const PEOPLE = [];
const byId = {};
function P(o){ PEOPLE.push(o); byId[o.id]=o; return o.id; }

/* ---------- GREAT-GRANDPARENTS' GENERATION (roots) ---------- */

// Maternal grandmother's generation (7 siblings, grandmother is one)
const gogoBanda = P({id:'gogoBanda', name:'Gogo Banda', born:null, died:2026, gender:'f',
  relation:"Maternal great-aunt (grandmother's sister)", profession:'Retired nurse',
  notes:'Passed 2026, almost 90. One of 7 siblings — sister of maternal grandmother.'});

const maternalGrandmother = P({id:'maternalGrandmother', name:'Maternal Grandmother', born:null, died:null, gender:'f',
  relation:'Maternal Grandmother', spouseId:'maternalGrandfather',
  notes:'Last living of 7 siblings. Only living direct grandparent.'});

const maternalGrandfather = P({id:'maternalGrandfather', name:'Maternal Grandfather', born:null, died:2014, gender:'m',
  relation:'Maternal Grandfather', spouseId:'maternalGrandmother',
  notes:'Oldest of 5 siblings. Passed 2014.'});

// Maternal grandmother's other siblings (5 unnamed branches, generated)
const mgmSibs = [];
for(let i=1;i<=6;i++){
  const g = i%2===0?'f':'m';
  mgmSibs.push(P({id:'mgmSib'+i, name:(g==='f'?'Sister':'Brother')+' '+i+' (of Gogo Banda)', gender:g,
    relation:"Maternal great-aunt/uncle", parentIds:[], notes:'Sibling of Gogo Banda / maternal grandmother. Generated branch — children & grandchildren represented as a count.',
    branchCount:{children:[5,4,6,3,7,5][i-1]||4, grandchildren:[14,11,19,8,22,16][i-1]||10}}));
}

/* Maternal grandfather's siblings */
const sekuruBishop = P({id:'sekuruBishop', name:'Sekuru Bishop', gender:'m', relation:"Maternal great-uncle",
  profession:'Prophet', notes:'Brother of maternal grandfather. Has 5 daughters, only 1 married.'});
const bishopDaughters=[];
for(let i=1;i<=5;i++){ bishopDaughters.push(P({id:'bishopDau'+i, name:'Daughter '+i+' of Sekuru Bishop', gender:'f',
  relation:'2nd cousin (once removed)', parentIds:['sekuruBishop'], notes: i===1?'Only married daughter.':''})); }

const sekuruaWaManu = P({id:'sekuruaWaManu', name:'Sekurua wa Manu', gender:'m', relation:'Maternal great-uncle',
  notes:'Brother of maternal grandfather.'});
const uncleManu = P({id:'uncleManu', name:'Uncle Manu', gender:'m', relation:'Maternal 1st cousin once removed',
  parentIds:['sekuruaWaManu']});
const manuSons=[];
for(let i=1;i<=3;i++){ manuSons.push(P({id:'manuSon'+i, name:"Manu's Son "+i, gender:'m',
  relation:'2nd cousin', parentIds:['uncleManu']})); }

const teteJamu = P({id:'teteJamu', name:'Tete Jamu', gender:'f', relation:'Maternal great-aunt',
  notes:'Sister of maternal grandfather. Has children based in UK (exact number unknown).'});
const teteJamuUKChild = P({id:'teteJamuUKChild', name:'Children of Tete Jamu (UK)', gender:'u',
  relation:'2nd cousins', parentIds:['teteJamu'], notes:'Exact number unknown — based in the UK.'});

const teteUnty = P({id:'teteUnty', name:'Tete Unty', gender:'f', relation:'Maternal great-aunt (youngest sibling)',
  spouseId:'kenyanUncle', notes:'Married to a Kenyan uncle. Based in Kenya after living in Australia.'});
const kenyanUncle = P({id:'kenyanUncle', name:'Kenyan Uncle', gender:'m', relation:'Maternal great-uncle by marriage',
  spouseId:'teteUnty'});

const nicholas = P({id:'nicholas', name:'Nicholas', born:1987, gender:'m', relation:'1st cousin once removed (maternal)',
  parentIds:['teteUnty'], spouseId:'nicholasWife'});
const nicholasWife = P({id:'nicholasWife', name:"Nicholas's Wife", gender:'f', relation:'Cousin-in-law',
  notes:'White Australian with Italian heritage. Her family: 5 siblings, 13 children among them.',
  spouseId:'nicholas'});
const nicholasSon1 = P({id:'nicholasSon1', name:"Nicholas's Son", born:2017, gender:'m', relation:'2nd cousin', parentIds:['nicholas','nicholasWife']});
const nicholasSon2 = P({id:'nicholasSon2', name:"Nicholas's Son", born:2019, gender:'m', relation:'2nd cousin', parentIds:['nicholas','nicholasWife']});

const nia = P({id:'nia', name:'Nia', born:1988, gender:'f', relation:'1st cousin once removed (maternal)',
  parentIds:['teteUnty'], location:'UK', notes:"Husband's family: 6 siblings, 17 children among them.", spouseId:'niaHusband'});
const niaHusband = P({id:'niaHusband', name:"Nia's Husband", gender:'m', relation:'Cousin-in-law', spouseId:'nia'});
const niaChild1 = P({id:'niaChild1', name:"Nia's Child 1", gender:'u', relation:'2nd cousin', parentIds:['nia','niaHusband']});
const niaChild2 = P({id:'niaChild2', name:"Nia's Child 2", gender:'u', relation:'2nd cousin', parentIds:['nia','niaHusband']});

const alishaMaternal = P({id:'alishaMaternal', name:'Alisha', born:1994, gender:'f', relation:'1st cousin once removed (maternal)',
  parentIds:['teteUnty'], location:'Australia', notes:"Husband's family: 4 siblings, 10 children among them.", spouseId:'alishaMHusband'});
const alishaMHusband = P({id:'alishaMHusband', name:"Alisha's Husband", gender:'m', relation:'Cousin-in-law', spouseId:'alishaMaternal'});
const alishaMDaughter = P({id:'alishaMDaughter', name:"Alisha's Daughter", born:2025, gender:'f', relation:'2nd cousin', parentIds:['alishaMaternal','alishaMHusband']});

/* ---------- PATERNAL GRANDPARENTS ---------- */

const paternalGrandfather = P({id:'paternalGrandfather', name:'Paternal Grandfather', died:null, gender:'m',
  relation:'Paternal Grandfather', spouseId:'paternalGrandmother', notes:'Had 3 siblings (2 boys, 1 girl), all deceased.'});
const paternalGrandmother = P({id:'paternalGrandmother', name:'Paternal Grandmother', died:2025, gender:'f',
  relation:'Paternal Grandmother', spouseId:'paternalGrandfather', notes:'Passed 2025. Came from a large polygamous family. Had 2 sisters.'});

const sekuruFrancis = P({id:'sekuruFrancis', name:'Sekuru Francis', died:1985, gender:'m',
  relation:"Paternal great-uncle", parentIds:[], notes:"Paternal grandfather's brother. Passed 1985.",
  branchCount:{children:6, grandchildren:18}});
const pgfOtherBrother = P({id:'pgfOtherBrother', name:"Paternal Grandfather's Other Brother", gender:'m',
  relation:'Paternal great-uncle', notes:'Deceased.', branchCount:{children:4, grandchildren:12}});
const pgfSister = P({id:'pgfSister', name:"Paternal Grandfather's Sister", gender:'f',
  relation:'Paternal great-aunt', notes:'Deceased. Had 5 children, all based in UK.',
  branchCount:{children:5, grandchildren:15, greatgrandchildren:8}});

const maiWaGrace = P({id:'maiWaGrace', name:'Mai wa Grace', gender:'f', relation:'Paternal great-aunt',
  location:'US', notes:"Paternal grandmother's sister."});
const maiWaShupi = P({id:'maiWaShupi', name:'Mai wa Shupi', gender:'f', relation:'Paternal great-aunt',
  notes:"Paternal grandmother's sister."});
const shupi = P({id:'shupi', name:'Shupi', died:2002, gender:'f', relation:'1st cousin once removed (paternal)', parentIds:['maiWaShupi']});
const plaxedis = P({id:'plaxedis', name:'Plaxedis', gender:'f', relation:'1st cousin once removed (paternal)',
  parentIds:['maiWaShupi'], location:'UK', notes:'No children.'});
const pamela = P({id:'pamela', name:'Pamela', gender:'f', relation:'1st cousin once removed (paternal)',
  parentIds:['maiWaShupi'], location:'Zimbabwe', notes:'Lives in Zimbabwe with her mother.'});

// Paternal grandmother's polygamous family — 5 branches from her father's other wives
const polygamousBranches = [
  {wife:'Wife 1', children:6, grandchildren:20},
  {wife:'Wife 2 (Great-Grandmother)', children:4, grandchildren:11},
  {wife:'Wife 3', children:5, grandchildren:15},
  {wife:'Wife 4', children:7, grandchildren:23},
  {wife:'Wife 5', children:3, grandchildren:9},
];
const polyIds = polygamousBranches.map((b,i)=>P({id:'polyBranch'+i, name:b.wife, gender:'f',
  relation:"Paternal great-grandmother's co-wife branch", notes:i===1?'Direct great-grandmother line.':'Generated branch.',
  branchCount:{children:b.children, grandchildren:b.grandchildren}}));

/* ---------- YOUR FATHER'S FAMILY (Chitate side) ---------- */

const father = P({id:'father', name:'Shamiso Paul Chitate', born:1964, gender:'m',
  relation:'Father', parentIds:['paternalGrandfather','paternalGrandmother'], spouseId:'mother',
  location:'UK', notes:'Oldest boy, 2nd of 6 children. The 3rd Paul.'});

const maiShona = P({id:'maiShona', name:'Mai Shona', gender:'f', relation:"Father's sister (oldest)",
  parentIds:['paternalGrandfather','paternalGrandmother'], location:'UK'});
const shonaDaughter = P({id:'shonaDaughter', name:'Shona', born:1991, gender:'f', relation:'1st cousin',
  parentIds:['maiShona'], location:'UK', notes:'Lesbian.'});

const tendaiChitambo = P({id:'tendaiChitambo', name:'Tendai Chitambo', gender:'f', relation:"Father's sister",
  parentIds:['paternalGrandfather','paternalGrandmother'], spouseId:'charlesChitambo',
  notes:'Married twice; second marriage 2017 to Charles Chitambo.'});
const charlesChitambo = P({id:'charlesChitambo', name:'Charles Chitambo', gender:'m', relation:'Uncle by marriage',
  spouseId:'tendaiChitambo', notes:'Married Tendai in 2017. Has 4 children including Craig from a previous marriage.'});
const garikai = P({id:'garikai', name:'Garikai Madzikanda', born:1984, gender:'m', relation:'1st cousin',
  parentIds:['tendaiChitambo'], notes:'Gay.'});
const tinasheMelissa = P({id:'tinasheMelissa', name:'Tinashe Melissa Madzikanda', born:1986, gender:'f',
  relation:'1st cousin', parentIds:['tendaiChitambo'], location:'UK'});
const nathanBoyfriend = P({id:'nathanBoyfriend', name:'Nathan', gender:'m', relation:"Cousin's partner",
  notes:'Nigerian boyfriend of Tinashe Melissa.', spouseId:'tinasheMelissa'});
const tinasheMelissaChild = P({id:'tinasheMelissaChild', name:"Tinashe Melissa's Child", born:2025, gender:'u',
  relation:"1st cousin's child", parentIds:['tinasheMelissa','nathanBoyfriend'], location:'UK'});
const craig = P({id:'craig', name:'Craig Kudzanai Chitambo', born:1987, gender:'m', relation:"Step-cousin",
  parentIds:['charlesChitambo'], notes:"Charles's son from previous marriage."});
const charlesOtherChild1 = P({id:'charlesOtherChild1', name:"Charles's Child", born:1988, gender:'u', relation:'Step-cousin', parentIds:['charlesChitambo']});
const charlesOtherChild2 = P({id:'charlesOtherChild2', name:"Charles's Child", born:1990, gender:'u', relation:'Step-cousin', parentIds:['charlesChitambo']});
const charlesOtherChild3 = P({id:'charlesOtherChild3', name:"Charles's Child", born:1993, gender:'u', relation:'Step-cousin', parentIds:['charlesChitambo']});

const williamChitate = P({id:'williamChitate', name:'William Chitate', gender:'m', relation:"Father's brother",
  parentIds:['paternalGrandfather','paternalGrandmother'], notes:'Divorced. Has 5 boys.'});
const williamExWife = P({id:'williamExWife', name:"William's Ex-Wife", gender:'f', relation:'Aunt by former marriage',
  notes:"Family: 4 sisters, 2 brothers; their children: 8 cousins (generated).",
  branchCount:{children:0, grandchildren:8}});

const fungai = P({id:'fungai', name:'Fungai Chitate', born:1982, gender:'m', relation:'1st cousin',
  parentIds:['williamChitate','williamExWife'], spouseId:'fungaiWife', notes:'Married 2004.'});
const fungaiWife = P({id:'fungaiWife', name:"Fungai's Wife", gender:'f', relation:'Cousin-in-law', spouseId:'fungai'});
const natashaFungai = P({id:'natashaFungai', name:'Natasha (Fungai\'s daughter)', born:2003, gender:'f',
  relation:"1st cousin once removed", parentIds:['fungai','fungaiWife'], spouseId:'natashaFungaiPartner'});
const natashaFungaiPartner = P({id:'natashaFungaiPartner', name:"Natasha's Partner", born:2002, gender:'m',
  relation:"Partner", notes:'UK-based Motswana man.', spouseId:'natashaFungai'});
const natashaFungaiDaughter = P({id:'natashaFungaiDaughter', name:"Natasha's Daughter", born:2026, gender:'f',
  relation:'2nd cousin', parentIds:['natashaFungai','natashaFungaiPartner']});
const fungaiSecondDaughter = P({id:'fungaiSecondDaughter', name:"Fungai's Daughter", born:2011, gender:'f',
  relation:"1st cousin once removed", parentIds:['fungai','fungaiWife']});

const tawandaChitate = P({id:'tawandaChitate', name:'Tawanda Chitate', born:1984, gender:'m', relation:'1st cousin',
  parentIds:['williamChitate','williamExWife'], spouseId:'tawandaWife'});
const tawandaWife = P({id:'tawandaWife', name:"Tawanda's Wife", gender:'f', relation:'Cousin-in-law',
  notes:'UK-based Zimbabwean woman.', spouseId:'tawandaChitate'});

const faiariMother = P({id:'faiariMother', name:"Faiari's Mother", gender:'f', relation:"William's former partner", died:2016});
const faiari = P({id:'faiari', name:'Faiari Mukarati', born:1984, gender:'m', relation:'1st cousin (born out of wedlock)',
  parentIds:['williamChitate','faiariMother'], notes:"Mother passed 2016.", spouseId:'kimFaiari'});
const kimFaiari = P({id:'kimFaiari', name:'Kim', born:1988, gender:'f', relation:"Cousin's partner", spouseId:'faiari'});
const jayden = P({id:'jayden', name:'Jayden', born:2013, gender:'m', relation:"1st cousin once removed", parentIds:['faiari','kimFaiari']});
const faiariDaughter = P({id:'faiariDaughter', name:"Faiari's Daughter", born:2020, gender:'f', relation:"1st cousin once removed", parentIds:['faiari','kimFaiari']});

const tanakaChitate = P({id:'tanakaChitate', name:'Tanaka Chitate', born:1992, gender:'m', relation:'1st cousin',
  parentIds:['williamChitate','williamExWife'], location:'UK', spouseId:'tanakaWife', notes:'Has 4 children with a white woman.'});
const tanakaWife = P({id:'tanakaWife', name:"Tanaka's Partner", gender:'f', relation:'Cousin-in-law', spouseId:'tanakaChitate'});
const tanakaKids=[];
for(let i=1;i<=4;i++){ tanakaKids.push(P({id:'tanakaChild'+i, name:"Tanaka's Child "+i, gender:'u',
  relation:"1st cousin once removed", parentIds:['tanakaChitate','tanakaWife']})); }

const tendaiChitateYounger = P({id:'tendaiChitateYounger', name:'Tendai Chitate', born:1998, gender:'m',
  relation:'1st cousin', parentIds:['williamChitate','williamExWife']});

const tina = P({id:'tina', name:'Tina', gender:'f', relation:"Father's sister", parentIds:['paternalGrandfather','paternalGrandmother'],
  spouseId:'tinaBoyfriend', notes:'Has a boyfriend. 3 boys.'});
const tinaBoyfriend = P({id:'tinaBoyfriend', name:"Tina's Boyfriend", gender:'m', relation:'Uncle by relationship',
  spouseId:'tina', notes:'His siblings: 5, their children: 12 (generated).', branchCount:{children:5, grandchildren:12}});
const tawana = P({id:'tawana', name:'Tawana', born:1999, gender:'m', relation:'1st cousin', parentIds:['tina','tinaBoyfriend']});
const tadiwa = P({id:'tadiwa', name:'Tadiwa', born:2003, gender:'m', relation:'1st cousin', parentIds:['tina','tinaBoyfriend']});
const halo = P({id:'halo', name:'Halo', born:2008, gender:'m', relation:'1st cousin', parentIds:['tina','tinaBoyfriend']});

const barbbra = P({id:'barbbra', name:'Barbbra Kangwende', gender:'f', relation:"Father's sister (youngest)",
  parentIds:['paternalGrandfather','paternalGrandmother'], spouseId:'sam', notes:'Married 2000 to Sam.'});
const sam = P({id:'sam', name:'Sam', gender:'m', relation:'Uncle by marriage', spouseId:'barbbra',
  notes:'Siblings: 6 (3 brothers, 3 sisters); their children: 14 (generated).', branchCount:{children:6, grandchildren:14}});
const chermain = P({id:'chermain', name:'Chermain', born:2001, gender:'f', relation:'1st cousin', parentIds:['barbbra','sam']});
const tyrone = P({id:'tyrone', name:'Tyrone', born:2003, gender:'m', relation:'1st cousin', parentIds:['barbbra','sam']});
const angel = P({id:'angel', name:'Angel', born:2008, gender:'f', relation:'1st cousin', parentIds:['barbbra','sam']});
const samantha = P({id:'samantha', name:'Samantha', born:2011, gender:'f', relation:'1st cousin', parentIds:['barbbra','sam']});

/* ---------- YOUR MOTHER'S FAMILY (Kepekepe side) ---------- */

const mother = P({id:'mother', name:'Mildred Sibongile Chitate (née Kepekepe)', born:1964, gender:'f',
  relation:'Mother', parentIds:['maternalGrandfather','maternalGrandmother'], spouseId:'father'});

const junipper = P({id:'junipper', name:'Junipper', gender:'f', relation:"Mother's sister",
  parentIds:['maternalGrandfather','maternalGrandmother'], spouseId:'junipperHusband',
  notes:"Husband's siblings: 4, their children: 11 (generated)."});
const junipperHusband = P({id:'junipperHusband', name:"Junipper's Husband", gender:'m', relation:'Uncle by marriage',
  spouseId:'junipper', branchCount:{children:4, grandchildren:11}});
const tafadzwa = P({id:'tafadzwa', name:'Tafadzwa', born:1990, gender:'m', relation:'1st cousin',
  parentIds:['junipper','junipperHusband'], location:'Scotland', spouseId:'tafadzwaWife'});
const tafadzwaWife = P({id:'tafadzwaWife', name:"Tafadzwa's Wife", gender:'f', relation:'Cousin-in-law',
  notes:'Scottish. Her family: 5 siblings, 12 children among them (generated).', spouseId:'tafadzwa',
  branchCount:{children:5, grandchildren:12}});
const mera = P({id:'mera', name:'Mera', born:2022, gender:'f', relation:"1st cousin once removed",
  parentIds:['tafadzwa','tafadzwaWife'], location:'Scotland'});
const takunda = P({id:'takunda', name:'Takunda', born:1998, gender:'m', relation:'1st cousin', parentIds:['junipper','junipperHusband']});

const uncleJohn = P({id:'uncleJohn', name:'Uncle John', gender:'m', relation:"Mother's brother",
  parentIds:['maternalGrandfather','maternalGrandmother'], spouseId:'uncleJohnWife'});
const uncleJohnWife = P({id:'uncleJohnWife', name:"Uncle John's Wife", gender:'f', relation:'Aunt by marriage',
  spouseId:'uncleJohn', notes:'Siblings: 4, children: 10 (generated).', branchCount:{children:4, grandchildren:10}});
const nyasha = P({id:'nyasha', name:'Nyasha', born:1993, gender:'m', relation:'1st cousin', parentIds:['uncleJohn','uncleJohnWife']});
const farai = P({id:'farai', name:'Farai', born:1998, gender:'m', relation:'1st cousin', parentIds:['uncleJohn','uncleJohnWife']});

const uncleEnoch = P({id:'uncleEnoch', name:'Uncle Enoch', gender:'m', relation:"Mother's brother",
  parentIds:['maternalGrandfather','maternalGrandmother'], location:'Ireland', spouseId:'uncleEnochWife'});
const uncleEnochWife = P({id:'uncleEnochWife', name:"Uncle Enoch's Wife", gender:'f', relation:'Aunt by marriage',
  location:'Ireland', spouseId:'uncleEnoch', notes:'Family: 7 siblings, 16 children among them (generated).',
  branchCount:{children:7, grandchildren:16}});
const tinasheEnoch = P({id:'tinasheEnoch', name:'Tinashe (Enoch\'s son)', born:1998, gender:'m', relation:'1st cousin',
  parentIds:['uncleEnoch','uncleEnochWife'], location:'Canada', notes:"Spouse's family: 4 siblings, 8 children among them (generated).",
  branchCount:{children:4, grandchildren:8}});
const anonEnoch = P({id:'anonEnoch', name:'Anon', born:2001, gender:'m', relation:'1st cousin', parentIds:['uncleEnoch','uncleEnochWife']});
const bongie = P({id:'bongie', name:'Bongie', born:2002, gender:'f', relation:'1st cousin', parentIds:['uncleEnoch','uncleEnochWife']});

const uncleElisha = P({id:'uncleElisha', name:'Uncle Elisha', gender:'m', relation:"Mother's brother",
  parentIds:['maternalGrandfather','maternalGrandmother'],
  notes:"Girlfriends' families: 3, combined children: 9 (generated)."});
const elishaFirstWife = P({id:'elishaFirstWife', name:'First Wife', gender:'f', relation:"Uncle Elisha's former wife", spouseId:'uncleElisha'});
const chido = P({id:'chido', name:'Chido', born:1997, gender:'f', relation:'1st cousin', parentIds:['uncleElisha','elishaFirstWife']});
const elishaGF1 = P({id:'elishaGF1', name:'Girlfriend 1', gender:'f', relation:"Uncle Elisha's former partner"});
const alishaElisha = P({id:'alishaElisha', name:'Alisha (Elisha\'s daughter)', born:1998, gender:'f', relation:'1st cousin', parentIds:['uncleElisha','elishaGF1']});
const elishaGF2 = P({id:'elishaGF2', name:'Girlfriend 2', gender:'f', relation:"Uncle Elisha's former partner"});
const tinasheElisha = P({id:'tinasheElisha', name:'Tinashe (Elisha\'s son)', born:1998, gender:'m', relation:'1st cousin', parentIds:['uncleElisha','elishaGF2']});
const elishaCurrentWife = P({id:'elishaCurrentWife', name:'Current Wife', gender:'f', relation:"Uncle Elisha's wife", spouseId:'uncleElisha'});
const panashe = P({id:'panashe', name:'Panashe', born:2009, gender:'m', relation:'1st cousin', parentIds:['uncleElisha','elishaCurrentWife']});
const tanakaElisha = P({id:'tanakaElisha', name:'Tanaka (Elisha\'s son)', born:2013, gender:'m', relation:'1st cousin', parentIds:['uncleElisha','elishaCurrentWife']});
const anesuElisha = P({id:'anesuElisha', name:'Anesu (Elisha\'s son)', born:2016, gender:'m', relation:'1st cousin', parentIds:['uncleElisha','elishaCurrentWife']});

/* ---------- YOU AND YOUR IMMEDIATE FAMILY ---------- */

const you = P({id:'you', name:'Kudzanai Paul Chitate', born:1987, gender:'m', relation:'You',
  parentIds:['father','mother'], location:'Zimbabwe', spouseId:'natashaJansen',
  notes:'The 4th Paul — father, grandfather, and great-grandfather were all named Paul.'});

const jansenMother = P({id:'jansenMother', name:"Natasha's Mother", gender:'f', relation:"Partner's mother", notes:'Xhosa.', spouseId:'jansenFather'});
const jansenFather = P({id:'jansenFather', name:"Natasha's Father", gender:'m', relation:"Partner's father",
  died:2021, notes:'Coloured pastor.', spouseId:'jansenMother'});
const natashaJansen = P({id:'natashaJansen', name:'Natasha Jansen', born:1985, gender:'f', relation:'Partner',
  location:'Johannesburg, South Africa', spouseId:'you', parentIds:['jansenFather','jansenMother'],
  notes:"Mother is Xhosa. Father was a Coloured pastor, passed 2021. Has 2 siblings with 5 children among them (generated).",
  branchCount:{children:2, grandchildren:5}});
const ayanna = P({id:'ayanna', name:'Ayanna Jansen', born:2011, gender:'f', relation:'Daughter', parentIds:['you','natashaJansen']});

const nomsaMother = P({id:'nomsaMother', name:"Nomsa's Mother", gender:'f', relation:"Father's former partner",
  died:2003, notes:'Half Zimbabwean, half Xhosa, born in SA.'});
const nomsa = P({id:'nomsa', name:'Nomsa Michelle Chitate', born:1985, gender:'f', relation:'Sister',
  parentIds:['father','nomsaMother'], spouseId:'nelson',
  notes:"Mother passed 2003 (half Zimbabwean, half Xhosa, born in SA)."});
const nelson = P({id:'nelson', name:'Nelson', born:1983, gender:'m', relation:"Sister's partner",
  notes:'Half Zimbabwean, half Malawian.', spouseId:'nomsa'});
const nikaela = P({id:'nikaela', name:'Nikaela', born:2011, gender:'f', relation:'Niece', parentIds:['nomsa','nelson']});
const anesuNomsa = P({id:'anesuNomsa', name:'Anesu', born:2015, gender:'u', relation:'Niece/Nephew', parentIds:['nomsa','nelson']});
const kuda = P({id:'kuda', name:'Kuda', born:2016, gender:'u', relation:'Niece/Nephew', parentIds:['nomsa','nelson']});

const alfonce = P({id:'alfonce', name:'Alfonce Tatenda Chitate', born:1989, gender:'m', relation:'Brother',
  parentIds:['father','mother'], location:'UK', spouseId:'veronica', notes:'Married 2026.'});
const veronica = P({id:'veronica', name:'Veronica', born:1990, gender:'f', relation:"Brother's wife",
  profession:'Doctor', notes:'Motswana. Siblings: 6 (3 older, 3 younger — 2 are twin boys); their children: 18 (generated).',
  spouseId:'alfonce', branchCount:{children:6, grandchildren:18}});
const alentle = P({id:'alentle', name:'Alentle', born:2021, gender:'u', relation:'Niece/Nephew', parentIds:['alfonce','veronica']});
const mildredYounger = P({id:'mildredYounger', name:'Mildred (Alfonce\'s daughter)', born:2026, gender:'f',
  relation:'Niece', parentIds:['alfonce','veronica'], notes:'Named after paternal grandmother.'});

const paidamoyo = P({id:'paidamoyo', name:'Paidamoyo Laura Chitate', born:1997, gender:'f', relation:'Sister',
  parentIds:['father','mother'], location:'UK', spouseId:'gamu', notes:'No children.'});
const gamu = P({id:'gamu', name:'Gamu', born:1996, gender:'m', relation:"Sister's husband",
  notes:'Ndebele, grew up in Harare, moved to UK at 13.', spouseId:'paidamoyo'});

const ROOT_IDS = [
  'gogoBanda','maternalGrandmother',
  ...mgmSibs,
  'paternalGrandfather',
  'sekuruBishop','sekuruaWaManu','teteJamu','teteUnty',
  'sekuruFrancis','pgfOtherBrother','pgfSister',
  'maiWaGrace','maiWaShupi',
  ...polyIds,
  'jansenFather', // Natasha Jansen's parents — married-in branch, not blood-linked to Chitate/Kepekepe roots
];

/* ============================================================
   SPEC-COMPLIANT UPGRADE LAYER (Section 1 of ROOTS_Cultural_Data_Structure)
   Wraps flat data into nested admin/ethnicity/kinship/oral model.
   ============================================================ */
(function upgradeToSpecModel(){
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
})();

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
