/* ============================================================
   ROOTS — OFFLINE LOOKUP TABLES (Section 5 of ROOTS_Cultural_Data_Structure.md)
   All data seeded verbatim from spec. No fabricated content.
   ============================================================ */

/* ---- 5.1 Administrative Hierarchy ---- */
const provinces = [
  "Bulawayo", "Harare", "Manicaland", "Mashonaland Central",
  "Mashonaland East", "Mashonaland West", "Masvingo",
  "Matabeleland North", "Matabeleland South", "Midlands"
];

const districtSeed = [
  "Goromonzi", "Chivi", "Tsholotsho", "Chipinge", "Bulilima",
  "Mangwe", "Binga", "Beitbridge", "Chiredzi", "Mbire", "Kanyemba"
];

/* ---- 5.2 Languages & Dialect Clusters ---- */
const languageClusters = {
  "Shona Dialect Tree": ["Zezuru", "Karanga", "Manyika", "Korekore", "Ndau"],
  "Nguni Dialect Tree": ["Ndebele", "Kalanga"],
  "Sotho-Tswana Tree": ["Sotho", "Tswana", "Birwa"],
  "Zambezi & Border Tree": ["Tonga", "Venda", "Shangani", "Sena", "Chewa", "Chibarwe", "Nambya", "Tshwa San", "Doma/Vadema", "Xhosa"],
  "Official & Assistive": ["English", "Sign Language"]
};

const all16Languages = [
  "Shona", "Ndebele", "Chewa", "Chibarwe", "Kalanga", "Koisan (Tshwa San)",
  "Nambya", "Ndau", "Shangani", "Sotho", "Tonga", "Tswana", "Venda",
  "Xhosa", "English", "Sign Language"
];

/* ---- 5.3 The 28-Totem Master Table ---- */
const totemRegistry = {
  "Moyo (Moyondizvo)": { system:"SHONA", zvidawo:["Moyondizvo","Dehwa","Bvumavaranda","Mithasa"], greeting:"Maita Moyondizvo, Changamire.", proverb:"Moyo muti, unomera paunoda.", taboo:"Heart of any animal" },
  "Moyo (Chirandu)": { system:"SHONA", zvidawo:["Chirandu","Muzukuru","Machuma","Monomotapa"], greeting:"Maita Chirandu, vari munaSvosve.", proverb:"Kandiro kanoenda kunobva kamwe.", taboo:"Lungs of animal" },
  "Moyo (Sinyoro)": { system:"SHONA", zvidawo:["Sinyoro","Vachinjanja","Donzvambeva"], greeting:"Maita Sinyoro, maita zvenyu.", proverb:"Kure kwegava ndokusina musungusungu.", taboo:"Spleen of animal" },
  "Shumba (Murambwi)": { system:"SHONA", zvidawo:["Murambwi","Chibi","Sipambi","Nyamuzihwa"], greeting:"Maita Shumba, vari Chibi, Murambwi.", proverb:"Shumba inodya inofamba.", taboo:"Lion meat and paws" },
  "Shumba (Mhazi)": { system:"SHONA", zvidawo:["Mhazi","Nyamuzihwa","Mukatayi","Chinamhora"], greeting:"Maita Mhazi, vari Chishawasha.", proverb:"Pasi pomoto pane madota.", taboo:"Big cat claws and flesh" },
  "Soko/Shoko (Mukanya)": { system:"SHONA", zvidawo:["Mukanya","Chinamora","Vhudzijena","Soko"], greeting:"Maita Mukanya, Soko Mukanya.", proverb:"Tsoko kana yoti tsvo, yaona bako.", taboo:"Velvet monkey" },
  "Soko/Shoko (Murehwa)": { system:"SHONA", zvidawo:["Murehwa","Mutasa","Mwari","Mbire"], greeting:"Maita Murehwa, vari muMbire.", proverb:"Chara chimwe hachitswanyi hinda.", taboo:"Baboon" },
  "Mbizi (Samaita)": { system:"SHONA", zvidawo:["Samaita","Mutasa","Dhuve","Wakapiwa"], greeting:"Maita Samaita, heri Mbizi.", proverb:"Mbizi ikaswera mumatope inofana nembongoro.", taboo:"Zebra flesh" },
  "Tembo (Mazvimbakupa)": { system:"SHONA", zvidawo:["Mazvimbakupa","Wandishona","Chitehwe"], greeting:"Maita Tembo, Mazvimbakupa.", proverb:"Ndambakuudzwa akaonekwa nembonje pamhanza.", taboo:"Zebra stripe-skin / liver" },
  "Nzou (Samanyanga)": { system:"SHONA", zvidawo:["Samanyanga","Marange","Katasa"], greeting:"Maita Samanyanga, vari muBocha.", proverb:"Nzou hairemerwi nenyanga dzayo.", taboo:"Elephant trunk" },
  "Zhou (Mhukahuru)": { system:"SHONA", zvidawo:["Mhukahuru","Divaremvura","Sukumani"], greeting:"Maita Zhou, vari muMberengwa.", proverb:"Mviromviro dzembanje dzinotanga nemashizha.", taboo:"Elephant flesh" },
  "Shava (Mhofu/Museyamwa)": { system:"SHONA", zvidawo:["Mhofu","Museyamwa","Chisvi","Nhuka"], greeting:"Maita Mhofu, Museyamwa.", proverb:"Mhofu yomukono haina danga.", taboo:"Eland flesh" },
  "Shava (Chihera)": { system:"SHONA", zvidawo:["Chihera","Mutenhesanwa","Nyakudirwa"], greeting:"Maita Chihera, Chidavarume.", proverb:"Mukadzi anofamba haashayi mapfihwa.", taboo:"Female Eland" },
  "Gumbo (Madyirapasi)": { system:"SHONA", zvidawo:["Madyirapasi","Chitova","Gutu","Madyarapanze"], greeting:"Maita Gumbo, Madyirapasi, vari muGutu.", proverb:"Gumbo rine mhanza rinotsika pane rine rombe.", taboo:"Cloven-hoofed animals" },
  "Dziva/Hove/Mvuu (Mbedzi)": { system:"SHONA", zvidawo:["Mbedzi","Sambiri","Musaigwa","Muyambo","Dziriro"], greeting:"Maita Dziva, vari muMatonjeni.", proverb:"Hove dzinofamba nemvura.", taboo:"Scale fish; Hippopotamus" },
  "Ngara/Nungu (Chipunza)": { system:"SHONA", zvidawo:["Chipunza","Zimuto","Wamambo","Mukanyairi","Mafuzi"], greeting:"Maita Ngara, Chipunza.", proverb:"Nungu haisweli musaga.", taboo:"Porcupine" },
  "Garwe (Nyamasvisva)": { system:"SHONA", zvidawo:["Nyamasvisva","Mamba","Chiwawa"], greeting:"Maita Garwe, Nyamasvisva.", proverb:"Garwe haridyi chebamba.", taboo:"Crocodile meat" },
  "Nyati (Chidawanyika)": { system:"SHONA", zvidawo:["Chidawanyika","Muchenje","Shanyai","Chirombowe"], greeting:"Maita Nyati, Chidawanyika.", proverb:"Nyati haityi vana vaduku.", taboo:"Buffalo meat" },
  "Humba/Nguruve (Nyakuvimba)": { system:"SHONA", zvidawo:["Nyakuvimba","Makombe","Chingowo"], greeting:"Maita Humba, vari muMakombe.", proverb:"Humba inotenda panyoro.", taboo:"Wild boar" },
  "Beta/Ishwa (Mazviona)": { system:"SHONA", zvidawo:["Mazviona","Muchena","Chikonan'ombe","Dhliwayo"], greeting:"Maita Beta, Mazviona.", proverb:"Ishwa inobuda mumwena une mvura.", taboo:"Winged harvester termites" },
  "Tsiwo/Gushungo": { system:"SHONA", zvidawo:["Gushungo","Mukanya","Zvimba"], greeting:"Maita Gushungo, vari muZvimba.", proverb:"Gushungo rinoruma nenzara.", taboo:"Albino / white-spotted game" },
  "Shiri/Hungwe": { system:"SHONA", zvidawo:["Hungwe","Nyajena","Chirongamabwe","Nyoni","Chasura","Mawuruka"], greeting:"Maita Hungwe, Shiri yomudenga.", proverb:"Shiri inovururuka nemapapiro ayo.", taboo:"Fish eagle" },
  "Mbeva (Mouse)": { system:"SHONA", zvidawo:["Zungunde","Mukundwa","Tovakare","Warerwa"], greeting:"", proverb:"", taboo:"Mouse" },
  "Mhara (Antelope/Impala)": { system:"SHONA", zvidawo:["Chikonan'ombe"], greeting:"", proverb:"", taboo:"Impala" },
  "Nkomo (Cattle)": { system:"SHONA", zvidawo:["Mupamombe"], greeting:"", proverb:"", taboo:"Cattle" },
  "Mheta": { system:"SHONA", zvidawo:["Saunyama"], greeting:"", proverb:"", taboo:"" },
  "Bepe (Lung)": { system:"SHONA", zvidawo:[], greeting:"", proverb:"", taboo:"Lung" },
  "Chuma (Tortoise)": { system:"SHONA", zvidawo:["Machuma","Kota","Gumbi"], greeting:"", proverb:"", taboo:"Tortoise" },
  "Nhewa/Ingwe (Leopard)": { system:"SHONA", zvidawo:["Simboti"], greeting:"", proverb:"", taboo:"Leopard" },
  "Nhire/Gwizo (Spring Hare)": { system:"SHONA", zvidawo:["Mugombi","Matutu","Muwariwa","Vhenya"], greeting:"", proverb:"", taboo:"Spring hare" },
  "Shato (Python)": { system:"SHONA", zvidawo:[], greeting:"", proverb:"", taboo:"Python" },
  "Twiza/Ndudza (Giraffe)": { system:"SHONA", zvidawo:["Nondo"], greeting:"", proverb:"", taboo:"Giraffe" },
  "Khumalo": { system:"NDEBELE", izithakazelo:["Mntungwa","Lobengula","Mzilikazi","Zwide"], greeting:"Bayethe Mntungwa, Khumalo!", proverb:"Imbila yaswela umsila ngokuyalezela.", taboo:"Royal game / Eland" },
  "Sibanda": { system:"NDEBELE", izithakazelo:["Shumba","Thambo","Gwaza","Ncindela"], greeting:"Ngiabonga Sibanda, lina bakwaChibi.", proverb:"Inkunzi isematholeni.", taboo:"Lion meat / claws" },
  "Dube": { system:"NDEBELE", izithakazelo:["Zephania","Mpunzi","Mbizi","Khanye"], greeting:"Dube, Mbombela, lina elimitshatshazi.", proverb:"Kakho mfula ungabo gubha.", taboo:"Zebra" },
  "Ndlovu": { system:"NDEBELE", izithakazelo:["Gatsheni","Boyikazi","Mpofu","Msopho"], greeting:"Gatsheni, lina elisenga inkomo zokusisela.", proverb:"Indlovu ayisindwa ngumbhoko wayo.", taboo:"Elephant meat and tusks" },
  "Ncube": { system:"NDEBELE", izithakazelo:["Mzilankatha","Phathokoza","Ntabeni"], greeting:"Ncube, lina elikhwela emithini.", proverb:"Indlela ibuzwa kwabaphambili.", taboo:"Monkey / Baboon" },
  "Ngwenya": { system:"NDEBELE", izithakazelo:["Mambo","Mtimande","Libazi","Malandela"], greeting:"Ngwenya, lina elihlala emanzini amanyama.", proverb:"Izandla sihlamba esinye.", taboo:"Crocodile" }
};

function getTotemKey(mutupo, chidawo) {
  const match = Object.keys(totemRegistry).find(k => {
    const entry = totemRegistry[k];
    const praises = entry.zvidawo || entry.izithakazelo || [];
    return k.toLowerCase().startsWith(mutupo.toLowerCase()) &&
      praises.some(p => p.toLowerCase() === chidawo.toLowerCase());
  });
  return match || null;
}

/* ---- 5.4 Greetings by Time of Day ---- */
const timeGreetings = {
  morning:   { shona: "Mangwanani",  ndebele: "Livuke njani?" },
  afternoon: { shona: "Masikati",    ndebele: "Litshone njani?" },
  evening:   { shona: "Manheru",     ndebele: "" }
};

/* ---- 5.5 Proverbs Library (Tsumo/Izaga) ---- */
const proverbs = [
  { shona: "Chara chimwe hachitswanyi hinda.", translation: "One thumb cannot crush a louse.", meaning: "Unity is strength. No individual can stand entirely alone without their lineage.", category: "kinship" },
  { shona: "Rume rimwe harikambi pfurwa.", translation: "One man cannot surround an elephant.", meaning: "Complex problems or heavy burdens require a collective family effort to solve.", category: "kinship" },
  { shona: "Nhowo yemwana ndiyo iri mumaoko aamai.", translation: "The child's safe resting place is in the mother's hands.", meaning: "Celebrates maternal security, structural nurture, and foundational lineage.", category: "kinship" },
  { shona: "Kandiro kanoenda kunobva kamwe.", translation: "A small dish goes to where another small dish comes from.", meaning: "Reciprocity. True community thrives on mutual support and ongoing family gift exchanges.", category: "kinship" },
  { shona: "Kugara nhaka huona dzevamwe.", translation: "To inherit successfully is to observe how others did it before you.", meaning: "Respecting historical precedent and learning from ancestral patterns.", category: "kinship" },
  { shona: "Mwana washe muranda kumwe.", translation: "A chief's child is a servant/subject in another territory.", meaning: "Humility. Outside your protected family ecosystem, you must earn respect on your merits.", category: "kinship" },
  { shona: "Musha mukadzi.", translation: "A home is defined by the presence of a woman.", meaning: "Recognizes the structural role of women/mothers as the anchors of a household's stability.", category: "kinship" },
  { shona: "Ndambakuudzwa akaonekwa nembonje pamhanza.", translation: "The one who refused advice was later spotted with a permanent scar on their forehead.", meaning: "Listen to elders. Disregarding ancestral or parental wisdom leads to preventable life scars.", category: "wisdom" },
  { shona: "Gungwo rakaramba revana richiti mafuta ari mberi.", translation: "The crow rejected its chicks, claiming better ones lay ahead.", meaning: "Do not abandon your current family or biological roots in pursuit of speculative, shallow fortunes.", category: "wisdom" },
  { shona: "Kure kwegava ndokusina musungusungu.", translation: "The only place far for a jackal is where there are no wild berries.", meaning: "People will travel any distance to reconnect with what they love — such as their home village or lineage.", category: "wisdom" },
  { shona: "Mviromviro dzembanje dzinotanga nemashizha.", translation: "The onset of a wild smoking habit starts simply with the leaves.", meaning: "Major family disputes or systemic breakdowns always trace back to small, unaddressed roots.", category: "wisdom" },
  { shona: "Pasi pomoto pane madota.", translation: "Beneath the active fire lies the quiet ash.", meaning: "Appearances can be deceiving; great wisdom or quiet power often hides beneath an unassuming exterior.", category: "wisdom" },
  { shona: "Zano ndega akasiya jira mumvura.", translation: 'The "know-it-all" left his blanket soaking in the river.', meaning: "Isolationism causes failure. Relying completely on your own isolated intellect leads to avoidable losses.", category: "wisdom" },
  { shona: "Mhosva hairovi.", translation: "A crime/guilt never rots or fades away with time.", meaning: "Accountability. Past actions and ancestral responsibilities must eventually be settled, no matter how much time passes.", category: "consequence" },
  { shona: "Aiva madziva ava mazambuko.", translation: "What used to be deep pools have now become shallow crossing points.", meaning: "Change is inevitable. Great family empires shift, and landscapes evolve; preservation is necessary.", category: "consequence" },
  { shona: "Chura kugara mumvura haasi hove.", translation: "A frog living in the water does not make it a fish.", meaning: "Proximity does not equal identity. True lineage is determined by deep-rooted identity (Mutupo), not just temporary location.", category: "consequence" },
  { shona: "Gonzo kugarisa mumatsire rinoti ndava muna mambo.", translation: "A rat that stays too long in the granary eventually fancies itself a king.", meaning: "Warning against unearned complacency or arrogance born out of temporary privilege.", category: "consequence" },
  { shona: "Kupfuma kune zvacho, kurova imbwa nemukaka.", translation: "Extreme wealth comes with strange habits, like beating a dog with fresh milk.", meaning: "A commentary on how structural prosperity can alter behavior, prompting unique family eccentricities.", category: "consequence" },
  { shona: "Sabhuku ndiye musimboti wemusha.", translation: "The village head is the true central pillar of the village.", meaning: "Validation for the Sabhuku database tier. Without the village head, local administrative data lacks its true structural anchor.", category: "consequence" }
];

function getProverbOfDay() {
  const idx = Math.floor(Math.random() * proverbs.length);
  return proverbs[idx];
}

/* ============================================================
   5.6 Glossary of Customary Terms (searchable in Library)
   ============================================================ */
const glossaryTerms = [
  // ---- Succession, Lifecycle & Death ----
  { term:"Nhaka", lang:"Shona", lit:"Inheritance, legacy", meaning:"Estate and responsibilities of a deceased person; also lifecycle state NHAKA_RESOLVED", src:"customary.js" },
  { term:"Kugara Nhaka", lang:"Shona", lit:"To sit/ settle the inheritance", meaning:"Final phase where estate is distributed and successor is installed after rituals", src:"customary.js" },
  { term:"Kuchenura", lang:"Shona", lit:"To cleanse / purify", meaning:"Cleansing ceremony phase after burial; first ritual phase", src:"customary.js" },
  { term:"Kubvisa", lang:"Shona", lit:"To remove", meaning:"Removal of mourning attire ceremony; second ritual phase", src:"customary.js" },
  { term:"Kugadza", lang:"Shona", lit:"To install / establish", meaning:"Installation of the heir ceremony; third ritual phase", src:"customary.js" },
  { term:"Zera", lang:"Shona", lit:"Generation / age set", meaning:"Living elder of an elder generation who blocks succession; used in hasZera() check", src:"customary.js / data.js" },
  { term:"Kuremara", lang:"Shona", lit:"To be physically disabled", meaning:"Physical wholeness flag; traditional succession disqualifier if set to true", src:"customary.js / data.js" },
  { term:"Mhosva", lang:"Shona", lit:"Crime / guilt / moral failing", meaning:"Criminal or moral disqualification flag; used in hasMhosva() and Mhosva neHuroyi (witchcraft)", src:"customary.js / data.js" },
  { term:"Rufu", lang:"Shona", lit:"Death", meaning:"The event of death; triggers the lifecycle state machine", src:"Research" },
  { term:"Mudzimu (pl. Vadzimu)", lang:"Shona", lit:"Ancestral spirit", meaning:"Deceased transformed into a protective guardian ancestor after final rituals", src:"Research" },
  { term:"Kurova Makuva", lang:"Shona", lit:"To beat the graves", meaning:"Major ceremony ~1 year after death; brings home the spirit", src:"Research" },
  { term:"Magadzira", lang:"Shona", lit:"Final burial rites", meaning:"Alternate name for the spiritual anchoring ceremony (Kurova Makuva)", src:"Research" },
  { term:"Bhuku reChemo", lang:"Shona", lit:"Book of condolence", meaning:"Ledger tracking communal funeral contributions for future reciprocity", src:"Research" },
  { term:"Chemo", lang:"Shona", lit:"Funeral contribution", meaning:"Token cash or food contributed by visitors during a funeral", src:"Research" },
  { term:"Nyaradzo", lang:"Shona", lit:"Consolation", meaning:"Memorial service weeks/months post-burial; outstanding debts declared publicly", src:"Research" },
  { term:"Kugovera Mbatya", lang:"Shona", lit:"Distribution of clothes", meaning:"Formal allocation of deceased's clothing to bloodline relatives (6–12 months)", src:"Research" },
  { term:"Bira", lang:"Shona", lit:"Traditional millet beer", meaning:"Home-brewed millet beer used in the final Kurova Makuva ceremony", src:"Research" },
  // ---- Ndebele Death ----
  { term:"Idlozi (pl. AmaDlozi)", lang:"Ndebele", lit:"Ancestor spirit", meaning:"Elevated ancestral guardian after Ukubuyisa ceremony", src:"Research" },
  { term:"Ukubuyisa", lang:"Ndebele", lit:"To bring back", meaning:"Final ceremony to bring the spirit home as an Idlozi (year 1–2)", src:"Research" },
  { term:"Inzilo", lang:"Ndebele", lit:"Mourning state", meaning:"Surviving spouse's mourning restriction period (~1 year); tracked as a state flag", src:"Research" },
  { term:"Ukudla Ifa", lang:"Ndebele", lit:"To eat the inheritance", meaning:"Estate distribution assembly after Ukubuyisa is complete", src:"Research" },
  { term:"Izibulo", lang:"Ndebele", lit:"Firstborn son", meaning:"Primary heir under Ndebele primogeniture; inherits status, name, and role", src:"Research" },
  { term:"Isinyama", lang:"Ndebele", lit:"Shadow of grief", meaning:"Spiritual pollution from death that must be ritually cleansed", src:"Research" },
  { term:"Ukugezwa Kwezikhali", lang:"Ndebele", lit:"Cleansing of tools", meaning:"Ritual wash of burial tools and family immediately after interment", src:"Research" },
  { term:"Ukungcwaba", lang:"Ndebele", lit:"To bury", meaning:"Burial protocol phase (day 3–5)", src:"Research" },
  // ---- Marriage / Bridewealth ----
  { term:"Roora", lang:"Shona", lit:"Bridewealth", meaning:"The full Shona marriage negotiation and payment process", src:"customary.js / Research" },
  { term:"Lobola", lang:"Shona/Ndebele", lit:"Bridewealth", meaning:"Alternate term for bridewealth; pan-Southern African", src:"Research" },
  { term:"Amalobolo", lang:"Ndebele", lit:"Bridewealth", meaning:"Ndebele marriage negotiation and cattle-payment system", src:"Research" },
  { term:"Chiko", lang:"Tonga", lit:"Bridewealth", meaning:"Tonga bridewealth; does not transfer children to father's clan", src:"Research" },
  { term:"Dare", lang:"Shona", lit:"Traditional court", meaning:"Main negotiation meeting where Roora is discussed; also general traditional court", src:"customary.js / Research" },
  { term:"Rusambo", lang:"Shona", lit:"Core bride price", meaning:"Foundational bride price paid to the father; legally binds the marriage", src:"customary.js" },
  { term:"Mombe yeHumai", lang:"Shona", lit:"Mother's cow", meaning:"Non-refundable live cow for the mother; cannot be cash-substituted", src:"customary.js" },
  { term:"Maputiro", lang:"Shona", lit:"Pre-wedding ceremony", meaning:"Pre-wedding ceremony payment; also Ukuyala (Ndebele)", src:"customary.js" },
  { term:"Chiredzwa", lang:"Shona", lit:"Final / totem-clearing payment", meaning:"Final payment that clears the totem for out-of-wedlock children", src:"customary.js" },
  { term:"Mbudzi", lang:"Shona", lit:"Goat", meaning:"Goat ceremony post-wedding ritual; Imbuzi (Ndebele)", src:"customary.js" },
  { term:"Kupinza", lang:"Shona", lit:"To bring in / receive", meaning:"Bride officially received into groom's family; Ukungenisa (Ndebele)", src:"customary.js" },
  { term:"Munyai", lang:"Shona", lit:"Go-between / messenger", meaning:"The groom's lead negotiator who does all the talking and handles money", src:"Research" },
  { term:"Vatete", lang:"Shona", lit:"Paternal aunt", meaning:"Bride's paternal aunt; mediator in weddings and authority over female funeral matters", src:"Research" },
  { term:"Vakwasha", lang:"Shona", lit:"Groom's party / in-laws", meaning:"The groom's delegation at a Roora negotiation", src:"Research" },
  { term:"Tezvara", lang:"Shona", lit:"Father-in-law", meaning:"Bride's father; primary recipient of Rusambo", src:"Research" },
  { term:"Ambuya", lang:"Shona", lit:"Mother-in-law / grandmother", meaning:"Bride's mother; recipient of Mombe yeHumai", src:"Research" },
  { term:"Zvirehwa", lang:"Shona", lit:"Fines", meaning:"Penalties imposed on Vakwasha for protocol violations during Roora", src:"Research" },
  { term:"Vhuramuromo", lang:"Shona", lit:"Mouth opener", meaning:"Initial fee sent with the letter requesting a negotiation date", src:"Research" },
  { term:"Saga reMunyu", lang:"Shona/Manyika", lit:"Bag of salt", meaning:"Manyika-specific entry item in bridewealth negotiations", src:"Research" },
  // ---- Ndebele Marriage ----
  { term:"Ukhula", lang:"Ndebele", lit:"Go-between", meaning:"Ndebele Munyai; diplomat for groom's family (Abayeni)", src:"Research" },
  { term:"Abayeni", lang:"Ndebele", lit:"Groom's delegation", meaning:"The groom's party at an Amalobolo negotiation", src:"Research" },
  { term:"Omalume (sg. Umalume)", lang:"Ndebele", lit:"Maternal uncles", meaning:"Most critical Ndebele role; maternal uncle has veto power in marriage and funerals", src:"Research" },
  { term:"Isicelo", lang:"Ndebele", lit:"The request / asking", meaning:"First phase: formal letter requesting a negotiation date", src:"Research" },
  { term:"Isivulamulomo", lang:"Ndebele", lit:"Mouth opener", meaning:"Cash sent with letter to initiate talks; equivalent to Vhuramuromo", src:"Research" },
  { term:"Ikhazi", lang:"Ndebele", lit:"Cattle dowry", meaning:"Core cattle count (5–10 beasts) in Ndebele marriage", src:"Research" },
  { term:"Inkomo kaMama", lang:"Ndebele", lit:"Mother's cow", meaning:"Mandatory live cow for mother; equivalent to Mombe yeHumai", src:"Research" },
  { term:"Inkomo kaMalume", lang:"Ndebele", lit:"Maternal uncle's cow", meaning:"Standardised beast or cash for maternal uncle's blessing", src:"Research" },
  { term:"Izibizo", lang:"Ndebele", lit:"Family demands", meaning:"Physical manifest of required material gifts (blankets, clothing)", src:"Research" },
  { term:"Isigo (pl. Izigo)", lang:"Ndebele", lit:"Fine", meaning:"Penalties for protocol violations during Ndebele negotiations", src:"Research" },
  // ---- Kinship / Identity ----
  { term:"Mutupo (pl. Mitupo)", lang:"Shona", lit:"Totem / clan animal", meaning:"Primary totem category (animal, organ, or object); inherited patrilineally", src:"data.js / lookups.js" },
  { term:"Chidawo (pl. Zvidawo)", lang:"Shona", lit:"Praise name / sub-clan name", meaning:"Sub-clan lineage descriptor distinguishing branches within a Mutupo", src:"data.js / lookups.js" },
  { term:"Isibongo (pl. Izibongo)", lang:"Ndebele", lit:"Clan name / surname", meaning:"Ndebele equivalent of Mutupo; functions as surname and totem identifier", src:"lookups.js" },
  { term:"Izithakazelo", lang:"Ndebele", lit:"Praise names / clan praises", meaning:"Ndebele equivalent of Zvidawo; ancestral praise names in formal address", src:"lookups.js" },
  { term:"Detembo", lang:"Shona", lit:"Praise poem", meaning:"Full poetic recitation of clan history and praises", src:"Research" },
  { term:"Mukowa", lang:"Tonga", lit:"Matriclan", meaning:"Mother's clan; the primary lineage anchor for Tonga identity", src:"data.js / Research" },
  { term:"Luzubo", lang:"Tonga", lit:"Patriclan", meaning:"Father's clan; secondary lineage anchor for Tonga (does not confer inheritance rights)", src:"data.js / Research" },
  { term:"Guruuswa", lang:"Shona", lit:"Ancient grasslands", meaning:"The ancestral origin node; for Shona, traces to Guruuswa northern grasslands", src:"data.js / Research" },
  { term:"Ngozi", lang:"Shona", lit:"Avenging spirit", meaning:"Spiritual lineage override case; a person raised in another clan's spiritual care", src:"customary.js" },
  { term:"Kumutsa Mapfihwa", lang:"Shona", lit:"To wake the hearthstones", meaning:"Ritual of re-establishing a spiritual hearth for a displaced lineage", src:"customary.js" },
  { term:"Miko (sg. Muito)", lang:"Shona", lit:"Taboo / dietary restriction", meaning:"Totem-specific dietary prohibition (e.g. not eating your totem animal)", src:"Research" },
  { term:"Izila", lang:"Ndebele", lit:"Taboo / dietary restriction", meaning:"Ndebele equivalent of Miko; dietary prohibitions tied to clan", src:"Research" },
  { term:"Kutyora miko", lang:"Shona", lit:"To break a taboo", meaning:"Violation of a totem's dietary restriction; believed to bring spiritual bad luck", src:"Research" },
  { term:"Dangwe", lang:"Shona", lit:"Firstborn child", meaning:"The eldest sibling; ranked highest in seniority", src:"Research" },
  { term:"Chigupawanga", lang:"Shona", lit:"Lastborn child", meaning:"The youngest sibling; ranked lowest in seniority", src:"Research" },
  { term:"Amai Guru", lang:"Shona", lit:"Senior mother", meaning:"First/senior wife in a polygamous marriage (houseRank = 1)", src:"Spec" },
  { term:"Imba / Indlu", lang:"Shona/Ndebele", lit:"House", meaning:"Polygamous house grouping; children grouped under the mother's 'House'", src:"Spec" },
  { term:"Mafwa", lang:"Tonga", lit:"Inheritance", meaning:"Tonga matrilineal inheritance; estate passes to sister's sons, not own children", src:"Research" },
  { term:"BaMalume", lang:"Tonga", lit:"Maternal uncle", meaning:"Legal and economic custodian of sister's children; primary inheritance node", src:"Research" },
  // ---- Administrative Roles ----
  { term:"Sabhuku", lang:"Shona", lit:"Village head / bookkeeper", meaning:"Lowest traditional administrative node; keeps the village registration book", src:"data.js / Spec" },
  { term:"Ushabhuku", lang:"Shona", lit:"Village head position", meaning:"The office/jurisdiction of a Sabhuku", src:"Research" },
  { term:"Sadunhu", lang:"Shona", lit:"Headman", meaning:"Sub-chief jurisdiction under a Chief; Level 5 admin hierarchy", src:"Research" },
  { term:"Isiduna (pl. Izinduna)", lang:"Ndebele", lit:"Headman / councilor", meaning:"Ndebele equivalent of Sadunhu; local traditional leaders", src:"Research" },
  { term:"Umambo", lang:"Shona", lit:"Chieftainship", meaning:"Jurisdiction of a recognised Chief (~272 in Zimbabwe)", src:"Research" },
  { term:"Sahwira", lang:"Shona", lit:"Ritual friend / undertaker", meaning:"Non-bloodline friend who manages funeral logistics; cannot be overruled by relatives", src:"Research" },
  { term:"Muzukuru", lang:"Shona", lit:"Nephew / grandchild", meaning:"Paternal grandchild who serves as operational foreman at funerals", src:"Research" },
  { term:"Abakhwenyana", lang:"Ndebele", lit:"In-laws / sons-in-law", meaning:"Perform physical grave-digging and heavy funeral logistics", src:"Research" },
  // ---- Proverbs ----
  { term:"Tsumo (pl. Tsumo)", lang:"Shona", lit:"Proverb", meaning:"Traditional Shona proverbs used in dispute resolution, kinship logic, and UI tooltips", src:"lookups.js" },
  { term:"Izaga (sg. Isaga)", lang:"Ndebele", lit:"Proverb", meaning:"Traditional Ndebele proverbs stored alongside Shona Tsumo in the library", src:"lookups.js" },
  // ---- Greetings / Etiquette ----
  { term:"Kuwuchira", lang:"Shona", lit:"Clapping protocol", meaning:"Gendered hand-clapping styles for respect (men: flat; women: cupped)", src:"Research" },
  { term:"Kutyora ibvi", lang:"Shona", lit:"To bend the knee", meaning:"Women's respectful knee-bend gesture accompanying cupped-hand clapping", src:"Research" },
  { term:"Kwaziso", lang:"Shona", lit:"Greeting / salutation", meaning:"Traditional greeting protocol varying by time of day and person's status", src:"Research" },
  { term:"Mangwanani", lang:"Shona", lit:"Morning", meaning:"Morning greeting phrase", src:"lookups.js" },
  { term:"Masikati", lang:"Shona", lit:"Afternoon", meaning:"Afternoon greeting phrase", src:"lookups.js" },
  { term:"Manheru", lang:"Shona", lit:"Evening", meaning:"Evening greeting phrase", src:"lookups.js" },
  { term:"Maita", lang:"Shona", lit:"Thank you / well done", meaning:"Gratitude prefix in totem greetings (e.g. 'Maita Moyondizvo, Changamire')", src:"lookups.js" },
  { term:"Bayethe", lang:"Ndebele", lit:"Hail / royal greeting", meaning:"Honorific greeting for Ndebele royalty (e.g. 'Bayethe Mntungwa, Khumalo!')", src:"lookups.js" },
  { term:"Ngiabonga", lang:"Ndebele", lit:"I thank you", meaning:"Gratitude expression in Ndebele totem greetings", src:"lookups.js" },
  // ---- Funeral Phases (app UI labels) ----
  { term:"Nhaka Reading", lang:"App", lit:"N/A", meaning:"Will and estate declaration phase; last ritual phase before NHAKA_RESOLVED", src:"customary.js" },
  // ---- App-internal terms ----
  { term:"MUTUPO_VEKUBEREKANA", lang:"App (Error Code)", lit:"Totem of reproduction", meaning:"Error raised when marriage is blocked due to identical totem + praise name (exogamy)", src:"customary.js" },
  { term:"DECEASED_FROZEN", lang:"App", lit:"N/A", meaning:"Lifecycle state: person died, no rituals completed yet", src:"customary.js" },
  { term:"RITUAL_CLEARED", lang:"App", lit:"N/A", meaning:"Lifecycle state: funeral and ritual phases completed", src:"customary.js" },
  { term:"NHAKA_RESOLVED", lang:"App", lit:"N/A", meaning:"Lifecycle state: estate fully distributed, succession complete", src:"customary.js" },
  { term:"ROOTS_V1", lang:"App", lit:"N/A", meaning:"Header token for WhatsApp text-snippet sync payload", src:"customary.js" },
  // ---- People / cultural groups ----
  { term:"Vabereki", lang:"Shona", lit:"Parents / in-laws (maternal)", meaning:"Maternal in-laws; Vatete negotiates with them to clear payments before burial", src:"Research" },
  { term:"Ukama", lang:"Shona", lit:"Relationship tier", meaning:"Relationship classification (Vakwasha, Vazukuru, Vagari etc.) used in Bhuku reChemo", src:"Research" },
];
