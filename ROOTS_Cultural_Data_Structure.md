# Roots — Cultural Data Structure & Implementation Guide
**For: IDE AI Agent (Build Reference)**
**App type:** Offline-first single-HTML → Android family tree app, Zimbabwe-focused
**Purpose of this document:** Defines exactly how cultural, administrative, and kinship data from the Zimbabwe research corpus should be organized across the app's two user modes — **Regular User** and **Institutional User** — down to field names, lookup tables, tab structure, and validation logic. This is the source of truth for anyone (human or AI agent) implementing the `Roots` data layer and UI.

---

## 0. How to use this document

This document is organized so an IDE agent can work through it top-to-bottom and implement incrementally:

1. **Section 1** — the shared data model every profile is built from (implement first; everything else depends on it).
2. **Section 2** — the two-hub app shell (Regular vs Institutional) and its view states.
3. **Section 3** — full breakdown of every Regular User tab/section, field by field.
4. **Section 4** — full breakdown of every Institutional User dashboard/section, field by field.
5. **Section 5** — the offline lookup tables (languages, totems, praise names, proverbs, admin regions) as ready-to-paste JS objects.
6. **Section 6** — the customary-law logic engine (exogamy check, patrilineal inheritance, totem drift, succession, polygamy seniority, divorce tokens, matrilineal exception) as implementable function specs.
7. **Section 7** — the literal build prompt to hand to the IDE agent.

Build order recommendation: **Section 1 → 5 → 3.2 (Tree) → 6 → 3.1/3.3/3.4 → 4 → 3.5/3.6 (marriage/death modules, if time allows)**. The marriage/death customary-law modules are the most complex — treat them as a v2 layer once the core tree, timeline, and lookup library are working end to end.

---

## 1. The Shared Data Model

Every person in the system is one `Person` record. This is the single most important object in the app — **all UI sections read from and write to this shape.** Do not scatter cultural fields across ad hoc objects; keep them nested under the four namespaces below so lookups, exports, and the institutional dashboard can query consistently.

```javascript
const Person = {
  // ---- Core identity ----
  id: "uuid-or-local-string",
  fullName: "",
  preferredName: "",
  gender: "male | female",           // patrilineal/matrilineal logic depends on this being explicit
  dob: "YYYY-MM-DD | null",
  isAlive: true,
  dateOfDeath: "YYYY-MM-DD | null",

  // ---- MODULE 1: Administrative & Legal Identity ----
  admin: {
    province: "",             // one of the 10 — see 5.1
    district: "",             // one of the 59+ — see 5.1
    ward: "",
    chief: "",                 // Umambo / Chieftainship
    headman: "",               // Sadunhu
    sabhuku: "",                // Village Head name
    villageBookId: "",          // e.g. "V-GORO-042" — critical institutional field
    nationalId: "",             // masked input: 63-XXXXXXX-X-XX
  },

  // ---- MODULE 2: Ethno-Linguistic Identity ----
  ethnicity: {
    languageCluster: "",       // Shona | Ndebele/Nguni | Sotho-Tswana | Zambezi & Border | Official
    specificGroup: "",         // e.g. "Karanga", "Kalanga", "Tonga", "Venda"
  },

  // ---- MODULE 3: Kinship / Totem Architecture ----
  kinship: {
    culturalSystem: "SHONA | NDEBELE | TONGA_MATRILINEAL | OTHER",
    mutupo: "",                 // Shona totem, or Isibongo for Ndebele
    chidawo: "",                // Shona praise/sub-clan name, or Izithakazelo for Ndebele
    // Tonga-specific dual-clan fields (only populated when culturalSystem = TONGA_MATRILINEAL)
    mukowaMatriclan: "",
    luzuboPatriclan: "",
    houseRank: null,            // polygamy: 1 = senior house (Amai Guru), 2 = second house, etc.
    lineageAnchorType: "BIOLOGICAL_FATHER | MATERNAL_GRANDFATHER | COMPUTED_FLOATING | CUSTOMARY_OVERRIDE",
    customaryLineageOverrideId: null, // for Ngozi / Kumutsa Mapfihwa cases — see 6.7
  },

  // ---- MODULE 4: Oral Culture ----
  oral: {
    guruuswaOrigin: "",         // ancestral origin node text/label
    praisePoem: "",             // Chidawo/Izithakazelo recitation text
    greeting: "",                // auto-filled from totem lookup — see 5.3
    taboo: "",                   // Miko/Izila dietary restriction — auto-filled from totem lookup
  },

  // ---- Relations ----
  relations: {
    parentIds: [],               // [fatherId, motherId] — order matters for patrilineal default rendering
    spouseIds: [],                // supports polygamous multi-spouse arrays
    childIds: [],
  },

  // ---- Node lifecycle (see 6.5) ----
  lifecycleState: "ALIVE | DECEASED_FROZEN | RITUAL_CLEARED | NHAKA_RESOLVED",

  // ---- Media & privacy (see 3.1) ----
  media: {
    profilePhoto: "base64 | localFileRef | null",
    galleryRefs: [],             // timeline post IDs authored by this person
  },

  // ---- Sync/versioning (see 6.8) ----
  sync: {
    versionSequence: 0,
    lastMutatedByDevice: "",
    utcTimestampApprox: "",
  }
};
```

**Rule for the agent:** never let a UI component write a cultural field (mutupo, chidawo, province, etc.) directly into a flat top-level key. All reads/writes go through this nested shape so the institutional filter/export layer (Section 4) can query it predictably.

---

## 2. App Shell: Two Hubs, Seven Views

The whole app is a single HTML file with no router — a JS state machine toggles `.app-view.active` on wrapper divs.

```
[Boot View: Gate Selection]
   Two buttons only: "Regular User" / "Institutional User"
        │
        ├──> REGULAR USER HUB
        │      View 1: Timeline (media feed)         ← default landing tab
        │      View 2: Family Tree (staggered grid)
        │      View 3: Cultural Lookup Library
        │      View 4: Settings / Export / Backup
        │
        └──> INSTITUTIONAL USER HUB
               View 1: Aggregation Dashboard          ← default landing tab
               View 2: Lineage Auditor / Advanced Filters
```

Global shell rules (non-negotiable per the founder's spec):
- Portrait only, **no horizontal scroll ever**, no visible scrollbars (hide with `-ms-overflow-style` / `scrollbar-width:none` / `::-webkit-scrollbar{display:none}`) while retaining touch-scroll inertia.
- Bottom tab bar, **icons only, no text labels**, fixed position.
- WhatsApp is the only messaging surface — tapping a person's contact icon opens `whatsapp://send?phone=...`, never an in-app chat.
- Institutional Hub visually reskins to a **data-dense, high-legibility table interface** — no charting libraries, no canvas graphs. Keep it text/table based to stay lightweight on entry-level Android hardware.

---

## 3. REGULAR USER — Section-by-Section Structure

### 3.1 View 1 — Timeline (default landing tab)

An Instagram-style vertical feed, **images only** (no video, no long-form text posts — keep memory low).

**Post object:**
```javascript
const TimelinePost = {
  id: "",
  authorId: "",              // Person.id
  imageRef: "",               // base64 or local file path
  caption: "",                 // optional, short
  createdAt: "",
  visibilityScope: "PUBLIC_CONNECTED | SIBLINGS | FIRST_COUSINS | SECOND_COUSINS | CUSTOM_GROUP",
  customGroupId: null,         // if visibilityScope = CUSTOM_GROUP
};
```

**Groups system (required before Timeline ships):**
- Users can create named groups (Siblings, 1st Cousins, 2nd Cousins, 3rd Cousins, or arbitrary custom groups) and assign specific Person nodes into each.
- A post's `visibilityScope` is checked against the viewer using the **offline consanguinity traversal** described in Section 6.6 before the image is rendered — this must run entirely on-device, no network call.
- Default privacy is the most restrictive (`SIBLINGS`) — never default a new post to `PUBLIC_CONNECTED`.

**Implementation note:** Do not build a generic "social feed" — the whole point is that visibility is computed from blood/marriage distance, not from a follow/friend list. There is no follow button anywhere in this app.

---

### 3.2 View 2 — Family Tree

This is the flagship view and should get the most polish. Two orthogonal requirements stack here: (a) genealogical accuracy, (b) small-screen legibility.

**3.2.1 Layout engine — Rectilinear Orthogonal Grid**

Do not use diagonal/isometric tree lines. Use strict right-angle connectors (N/S/E/W only) and a **staggered sibling offset** so birth order reads visually without needing a separate legend:

```javascript
// Vertical drop per sibling rank within a generation band
function renderSiblingNode(person, siblingRankIndex) {
  const baseOffsetPx = 24; // tune per screen density
  const computedTopMargin = siblingRankIndex * baseOffsetPx;
  // eldest = rank 0 (highest/least offset), youngest = highest rank (most offset)
}
```

A fixed **Years axis** runs down the left edge of the canvas (not per-card, one shared axis), giving spatial meaning to the vertical offsets — this is the founder's own "years on the left" idea and should be treated as the signature visual element of this tab.

**3.2.2 Card component — settings-driven**

Support all of the following as user-togglable settings (cogwheel icon, top-right):
| Setting | Values | Effect |
|---|---|---|
| Thumbnail mode | On / Off | Show uploaded photo vs. initials-only card |
| Orientation | Vertical / Horizontal | Card aspect ratio |
| Card color style | Solid gender color / Thin frame accent | Visual density |
| Deceased ribbon | On / Off | Black ribbon overlay when `lifecycleState !== 'ALIVE'` |
| Generations slider | 1–5+ | Limits rendered depth from focused node |
| Hide cousins | On / Off | Filters out 1st-cousin-and-beyond branches |
| Quick-add parent prompts | On / Off | Shows "+ Add Mother/Father" ghost cards on incomplete nodes |

**3.2.3 Touch gestures**
- Pinch to zoom, drag/swipe to pan in all directions (already implemented in your current build — carry the pattern forward).
- Tap a card → opens the profile panel (existing Lifestory/Info/Sources/Family/Gallery/Notes tabs — keep this, it works).
- **New:** long-press or a dedicated "Switch Bloodline" toggle on a spouse card — expands to show the *spouse's own* parents/siblings/tree as an independent branch. Gate this behind the paid feature described in 3.2.4.

**3.2.4 Monetized feature: Bloodline Switch**
- Free tier: user sees their own direct bloodline tree only, plus immediate spouse/children.
- Paid tier ($10 USD/year, EcoCash-verified offline — see 3.4): unlocks tapping into a spouse's full independent tree (their bloodline, their siblings, their extended family) as a first-class navigable branch.
- Implementation: this is purely a **view-permission gate**, not a data-restriction — the spouse's tree data can still exist locally (e.g. if the spouse is also a user on the same household device), it's the *rendering/navigation* that's paywalled.

**3.2.5 Genealogically-required data overlays**
- **Polygamous house grouping** (Section 6.4): when a father node has multiple spouses, group children visually under a "House" sub-header (Imba/Indlu) ranked by marriage order, not birth date. Do not flatten polygamous children into one undifferentiated sibling row.
- **Totem Drift indicator** (Section 6.3): if a child's `lineageAnchorType` is `COMPUTED_FLOATING` or `MATERNAL_GRANDFATHER`, render their connector line to the biological father as a **dashed line**, not solid, until Maputiro + Chiredzwa are marked settled.
- **Deceased node ritual state**: a small badge on the card (e.g. small icon) reflecting `lifecycleState` — this is separate from the simple black-ribbon toggle; the ribbon is cosmetic, the badge/state actually gates whether estate/succession actions are available on that node.

---

### 3.3 View 3 — Cultural Lookup Library

This is the educational/institutional-bait section the founder wants school children and chiefs to explore. Structure it as a **searchable reference library**, not a settings form — users should be able to browse it with zero profile data entered.

**Sub-sections (implement as a simple sub-tab or accordion list within View 3):**

1. **Totem Directory** — full 28-entry Mutupo/Isibongo table (Section 5.3). Tapping an entry expands to show: praise name variants, core greeting line, associated proverb, dietary taboo.
2. **Praise Poems (Detembo/Izithakazelo)** — longer-form recitation text per totem, marked as **text-only unless the user has unlocked the paid Totemic Praise Audio Library** (per the monetization notes — audio files are a premium unlock, not free-tier).
3. **Proverbs Library (Tsumo/Izaga)** — organized by the three functional categories in Section 5.5 (Family & Kinship / Wisdom & Elders / Time & Consequence), each with literal translation + cultural meaning.
4. **Greetings by Time of Day** — Shona/Ndebele greeting phrases (Section 5.4), can double as a "Tsumo of the Day" / "Greeting of the Day" widget on the Timeline tab header.
5. **Regions & Administrative Map** — read-only browsing of the 10 provinces → district list, mainly for education, separate from the data-entry version of the same fields used on a profile.

**Design note:** This section is the natural home for the **"Tsumo of the Day" widget** — implement it once here as a reusable component, then also surface it as a small dismissible card on the Timeline tab header, and as a contextual validation tooltip wherever a Sabhuku/Guruuswa field is being filled in (Section 6, cross-reference).

---

### 3.4 View 4 — Settings, Export & Backup

Everything here must work with **zero internet connection.**

| Feature | Behavior |
|---|---|
| High-quality PDF export | Generate a print-ready vector PDF of the current tree view, sized for local print-shop output or WhatsApp sharing. **Paid unlock.** |
| Local SD card backup | Export/import the full local JSON database to/from external storage. **Paid unlock.** |
| WhatsApp text-snippet sync | Compress a profile's changed fields into a pipe-delimited, base64-encoded string and hand off to `whatsapp://send?text=...` (see Section 6.8 for exact payload spec). Free — this is the core offline-sync mechanism, not a premium feature. |
| Totemic Praise Audio Library | Unlocks pre-loaded audio recordings matching the user's totem. **Paid unlock** (physical merchandising upsell also lives here — "Order a printed canvas of your tree" call-to-action). |
| Bloodline Switch | Toggle described in 3.2.4. **Paid unlock**, $10/year. |
| EcoCash payment verification | All the above paid unlocks are verified via a locally-stored EcoCash reference/transaction code check — no live payment gateway call required for the unlock itself once a valid code is entered. |

---

### 3.5 Marriage Module (Roora/Amalobolo) — build after core tree is stable

This is a v2 feature but the data model should reserve space for it from day one so retrofitting isn't required. Full schema, ledger phases, and pricing matrix are in Section 6.1–6.2. In the UI, this manifests as:
- A "Marriage Record" attached to a spouse-pair edge in the tree, opened via a dedicated icon on the couple's connector line.
- A step-by-step checklist UI mirroring the exact chronological phase order (Section 6.1) — **the UI must not let a user mark phase 4 complete before phase 2**, enforcing the same sequencing customary law requires.
- A running ledger total (demanded vs. paid) with the `Mombe yeHumai` / `Inkomo kaMama` livestock line flagged as **non-refundable / cannot be substituted with cash** — style this line item visually distinct (e.g. locked icon) from ordinary cash line items.

### 3.6 Death & Succession Module — build after core tree is stable

Also v2. Attaches to a Person node once `isAlive` is toggled false. Walks the node through the lifecycle states in Section 6.5, and — only once `RITUAL_CLEARED` — unlocks the `Kugara Nhaka` succession/estate-distribution screen. Do not let estate/inheritance actions fire before ritual clearance; this is a hard business-logic gate the founder explicitly wants for institutional credibility.

---

## 4. INSTITUTIONAL USER — Section-by-Section Structure

Institutional users are researchers (UZ), government officers (Ministry of Local Government, NAZ), or grant bodies (UNESCO). This hub should feel like a **data terminal**, not a consumer app — dense tables, filters, and export buttons, minimal decoration.

### 4.1 View 1 — Aggregation Dashboard (default landing tab for this hub)

Opens directly to a **Totem Directory overview** (per the founder's specific request: "if you open the Institutional User Dashboard at the beginning it shows you a list of totems"). Structure:

```
+---------------------------------------------------------------------------------+
| INSTITUTIONAL DATA LEDGER — REGIONAL ANCESTRAL METRICS                          |
+---------------------------------------------------------------------------------+
| Filter Criteria: [ Province ] [ Totem ] [ District ] [ Age band ] [ Village ]    |
+---------------------------------------------------------------------------------+
| Total Audited Records: N Profiles                                               |
| Active Sabhuku Nodes Registered: N Distinct Books                               |
+---------------------------------------------------------------------------------+
  LINEAGE DENSITY TRACKING TABLE
  ---------------------------------------------------------------------------
  CHIEFTAINSHIP    | SUB-DIALECT   | DOMINANT CLAN PRAISE  | SAMPLE MATRIX SIZE
  ---------------------------------------------------------------------------
  ...rows...
```

**Required filter fields** (directly from the founder's request — "filter by age, race, region, village/town/city, totem, mutupo"):
- Province, District, Ward, Chief, Headman, Village/Sabhuku Book ID
- Totem (Mutupo/Isibongo) and Praise Name (Chidawo/Izithakazelo)
- Age band (computed from `dob`)
- Language cluster / specific ethnic group
- Gender
- Alive / deceased status

**No charting libraries.** Render aggregates as plain HTML tables. This keeps the dashboard fast on low-end hardware and matches the "high-legibility text readouts" requirement in the research notes.

### 4.2 View 2 — Lineage Auditor & Dispute Queue

- **Advanced search**: multi-field query builder over the same filter set as 4.1, plus free-text name search.
- **Chieftainship Succession Simulator**: given a clan/chief ID, runs the collateral succession algorithm (Section 6.9) and surfaces the computed next-in-line candidate with all disqualification flags shown (Zera, Kuremara, Mhosva neHuroyi) so a rural district council can sanity-check a real dispute.
- **Dispute queue**: lists any records flagged `DISPUTED` by the vector-clock sync conflict resolver (Section 6.8) — these need manual review by family elders/traditional council administrators, so this queue is the human-in-the-loop safety valve for the offline P2P sync engine.
- **Export tools**: produce anonymized/aggregated exports formatted to the metadata standards in Section 4.3 below, not raw personal data dumps.

### 4.3 Institutional Export Standards (implement as export format options)

When an institutional user exports data, offer these format presets rather than a single generic CSV:

| Standard | Use case | Notes for implementation |
|---|---|---|
| **CIDOC CRM** | Museum/heritage cataloging (praise poems, artifacts) | Model a praise-poem recording as an `E73 Information Object` produced by an `E65 Creation` event linking the reciter (`E21 Person`), place (`E53 Place`), and era (`E4 Period`). |
| **ISAD(G) / EAD3** | NAZ archival finding aids | Hierarchical XML: Fonds → Series → File → Item, matching the Clan → House → Branch → Individual structure. |
| **EAC-CPF** | Individual biographical context records | Separate biographical detail from record context per the standard. |
| **WHO CRVS / ICD-11** | Death registration, cause-of-death coding | Only relevant once the Death & Succession module (3.6) is live; use a localized ICD-11 dictionary offline. |
| **UN OCHA P-code** | Provincial/district geo alignment | `ADM1` = Province (ISO 3166-2:ZW, e.g. `ZW-MV`), `ADM2` = District P-code, `ADM3` = Ward P-code. |

**Implementation priority:** build the plain JSON/CSV export first (needed for the WhatsApp text-snippet sync anyway), then layer the ISAD(G)/EAD3 XML exporter as the first "institutional-grade" format, since NAZ partnership is the founder's most concrete monetization channel. CIDOC CRM and WHO CRVS exporters can wait until there's an actual partner requesting them.

---

## 5. Offline Lookup Tables (seed data — paste directly into a `lookups.js`)

### 5.1 Administrative Hierarchy

```javascript
const provinces = [
  "Bulawayo", "Harare", "Manicaland", "Mashonaland Central",
  "Mashonaland East", "Mashonaland West", "Masvingo",
  "Matabeleland North", "Matabeleland South", "Midlands"
];
// Districts (59+): seed with the ones already referenced in research —
// Goromonzi, Chivi, Tsholotsho, Chipinge, Bulilima, Mangwe, Binga,
// Beitbridge, Chiredzi, Mbire, Kanyemba — expand per province as data arrives.
// Do not hardcode all 59 up front if unavailable; make district a free-text
// field that suggests from this seed list, so data entry isn't blocked.
```

Village key composite format (for institutional cross-referencing):
`ZW-[PROVINCE_CODE]-[DISTRICT_CODE]` e.g. `ZW-MS-CHV` for Masvingo/Chivi, paired with `villageBookId` e.g. `V-CHIV-089`.

National ID input mask: `63-XXXXXXX-X-XX` (matches Zimbabwean ID card format for census alignment).

### 5.2 Languages & Dialect Clusters

```javascript
const languageClusters = {
  "Shona Dialect Tree": ["Zezuru", "Karanga", "Manyika", "Korekore", "Ndau"],
  "Nguni Dialect Tree": ["Ndebele", "Kalanga"],
  "Sotho-Tswana Tree": ["Sotho", "Tswana", "Birwa"],
  "Zambezi & Border Tree": ["Tonga", "Venda", "Shangani", "Sena", "Chewa", "Chibarwe", "Nambya", "Tshwa San", "Doma/Vadema", "Xhosa"],
  "Official & Assistive": ["English", "Sign Language"]
};
```
All 16 constitutional languages: Shona, Ndebele, Chewa, Chibarwe, Kalanga, Koisan (Tshwa San), Nambya, Ndau, Shangani, Sotho, Tonga, Tswana, Venda, Xhosa, English, Sign Language.

### 5.3 The 28-Totem Master Table

Implement as a single lookup object keyed by totem name, each entry carrying its praise names, greeting, proverb, and dietary taboo so the profile UI and Cultural Lookup Library (3.3) can both read from one source:

```javascript
const totemRegistry = {
  // ---- Shona Mitupo ----
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

  // ---- Ndebele Izibongo ----
  "Khumalo": { system:"NDEBELE", izithakazelo:["Mntungwa","Lobengula","Mzilikazi","Zwide"], greeting:"Bayethe Mntungwa, Khumalo!", proverb:"Imbila yaswela umsila ngokuyalezela.", taboo:"Royal game / Eland" },
  "Sibanda": { system:"NDEBELE", izithakazelo:["Shumba","Thambo","Gwaza","Ncindela"], greeting:"Ngiabonga Sibanda, lina bakwaChibi.", proverb:"Inkunzi isematholeni.", taboo:"Lion meat / claws" },
  "Dube": { system:"NDEBELE", izithakazelo:["Zephania","Mpunzi","Mbizi","Khanye"], greeting:"Dube, Mbombela, lina elimitshatshazi.", proverb:"Kakho mfula ungabo gubha.", taboo:"Zebra" },
  "Ndlovu": { system:"NDEBELE", izithakazelo:["Gatsheni","Boyikazi","Mpofu","Msopho"], greeting:"Gatsheni, lina elisenga inkomo zokusisela.", proverb:"Indlovu ayisindwa ngumbhoko wayo.", taboo:"Elephant meat and tusks" },
  "Ncube": { system:"NDEBELE", izithakazelo:["Mzilankatha","Phathokoza","Ntabeni"], greeting:"Ncube, lina elikhwela emithini.", proverb:"Indlela ibuzwa kwabaphambili.", taboo:"Monkey / Baboon" },
  "Ngwenya": { system:"NDEBELE", izithakazelo:["Mambo","Mtimande","Libazi","Malandela"], greeting:"Ngwenya, lina elihlala emanzini amanyama.", proverb:"Izandla sihlamba esinye.", taboo:"Crocodile" },
};
```
**Total: 28 core totems** (22 Shona-documented + 6 Ndebele in the fully-detailed table above, plus the 8 "Tier 2" minor Shona totems included with sparser data — greeting/proverb fields left blank where the source research didn't document them; fill in as data becomes available rather than inventing placeholder text).

### 5.4 Greetings by Time of Day

```javascript
const timeGreetings = {
  morning:   { shona: "Mangwanani",  ndebele: "Livuke njani?" },
  afternoon: { shona: "Masikati",    ndebele: "Litshone njani?" },
  evening:   { shona: "Manheru",     ndebele: "" }
};
```

### 5.5 Proverbs Library (Tsumo/Izaga) — by functional category

Store as an array of `{ shona, translation, meaning, category }` objects. Categories: `"kinship"`, `"wisdom"`, `"consequence"`. Seed at minimum with the 13 curated in the research corpus (Chara chimwe hachitswanyi hinda / Rume rimwe harikambi pfurwa / Nhowo yemwana ndiyo iri mumaoko aamai / Kandiro kanoenda kunobva kamwe / Kugara nhaka huona dzevamwe / Mwana washe muranda kumwe / Musha mukadzi / Ndambakuudzwa akaonekwa nembonje pamhanza / Gungwo rakaramba revana richiti mafuta ari mberi / Kure kwegava ndokusina musungusungu / Mviromviro dzembanje dzinotanga nemashizha / Pasi pomoto pane madota / Zano ndega akasiya jira mumvura / Mhosva hairovi / Aiva madziva ava mazambuko / Chura kugara mumvura haasi hove / Gonzo kugarisa mumatsire rinoti ndava muna mambo / Kupfuma kune zvacho, kurova imbwa nemukaka / Sabhuku ndiye musimboti wemusha) — full text and meanings are in the research document; port them verbatim into this array, do not paraphrase the Shona text itself.

**UI hook:** wire `"Sabhuku ndiye musimboti wemusha"` as the validation tooltip shown when a user fills in the Sabhuku field (3.1 admin block), and `"Mhosva hairovi"` / `"Mviromviro dzembanje dzinotanga nemashizha"` as the tooltip shown on an Offline Incest Prevention warning (Section 6.1).

---

## 6. Customary Law Logic Engine — Function Specs

These are the client-side rules that make the app "institutionally credible" rather than a generic tree tool. Implement each as a pure function operating on `Person`/`Marriage` objects so they're independently testable.

### 6.1 Offline Incest Prevention (Exogamy Check)

```javascript
function validateMarriageFeasibility(a, b) {
  if (a.kinship.mutupo?.trim().toLowerCase() === b.kinship.mutupo?.trim().toLowerCase()
      && a.kinship.chidawo?.trim().toLowerCase() === b.kinship.chidawo?.trim().toLowerCase()) {
    return { allowed: false, message: "MUTUPO VEKUBEREKANA: Marriage strictly prohibited — identical totem and praise name." };
  }
  return { allowed: true, message: "" };
}
```
Same `mutupo`, different `chidawo` (e.g. Soko Mukanya × Soko Murehwa) is **allowed**. Trigger this check the moment a user tries to link two Person nodes as spouses in the tree UI, before the edge is committed.

### 6.2 Patrilineal Inheritance (default) vs. Matrilineal Exception (Tonga)

```javascript
function inheritLineage(fatherNode, motherNode, childInput) {
  const isTonga = motherNode.kinship.culturalSystem === "TONGA_MATRILINEAL";
  if (isTonga) {
    return {
      ...childInput,
      kinship: {
        ...childInput.kinship,
        culturalSystem: "TONGA_MATRILINEAL",
        mukowaMatriclan: motherNode.kinship.mukowaMatriclan,
        luzuboPatriclan: fatherNode.kinship.mutupo,
        lineageAnchorType: "MATERNAL_GRANDFATHER" // primary anchor is mother's line
      }
    };
  }
  return {
    ...childInput,
    kinship: { ...childInput.kinship, mutupo: fatherNode.kinship.mutupo, chidawo: fatherNode.kinship.chidawo }
  };
}
```
**Trigger condition:** check `motherNode.kinship.culturalSystem` (or `ethnicity.specificGroup === "Tonga"`), not a global app setting — this must be per-family, since a single tree can contain both patrilineal and matrilineal branches (e.g. intermarriage).

### 6.3 Out-of-Wedlock Totem Drift

```javascript
function resolveChildTotem(child, maternalGrandfather, biologicalFather, ledger) {
  const cleared = ledger.maputiroStatus === "PAID" && ledger.chiredzwaStatus === "PAID";
  if (cleared) {
    return { activeTotem: biologicalFather.kinship.mutupo, custodian: biologicalFather.id, anchor: "BIOLOGICAL_FATHER" };
  }
  return { activeTotem: maternalGrandfather.kinship.mutupo, custodian: maternalGrandfather.id, anchor: "MATERNAL_GRANDFATHER" };
}
```
UI consequence: render the father-child connector as a **dashed line** (per 3.2.5) while `anchor === "MATERNAL_GRANDFATHER"`, switch to solid once drift resolves.

### 6.4 Polygamous House Seniority

Rank by **marriage order**, not child birth date. Every child inherits `motherHouseRank` from their mother's marriage sequence number; when sorting siblings for succession or display seniority, sort primarily by `motherHouseRank` ascending, then by birth date within the same house.

### 6.5 Deceased Node Lifecycle

State machine: `ALIVE → DECEASED_FROZEN → RITUAL_CLEARED → NHAKA_RESOLVED`. Lock all estate/succession UI actions unless the current state permits them (see table in Section 3.6). Do not allow skipping states.

### 6.6 Offline Consanguinity / Timeline Visibility

```javascript
function calculateConsanguinityDistance(startId, targetId, graph, visited = new Set(), depth = 0) {
  if (startId === targetId) return depth;
  if (depth > 4) return Infinity; // cap at 2nd cousins
  visited.add(startId);
  const node = graph[startId];
  let min = Infinity;
  const adjacents = [...node.relations.parentIds, ...node.relations.childIds, ...node.relations.spouseIds];
  for (const next of adjacents) {
    if (!visited.has(next)) {
      const d = calculateConsanguinityDistance(next, targetId, graph, visited, depth + 1);
      if (d < min) min = d;
    }
  }
  visited.delete(startId);
  return min;
}
```
Use the returned distance against a post's `visibilityScope` threshold (Section 3.1) before rendering any timeline image.

### 6.7 Spiritual Lineage Overrides (Ngozi / Kumutsa Mapfihwa)

Reserve a `customaryLineageOverrideId` field (already in the Section 1 schema) so a node's biological parentage can be tracked separately from its customary/spiritual lineage anchor. This is a **manual, elder-confirmed data entry** — never auto-computed. Surface it only in the Info tab of a profile, with a plain-language note, not a algorithmic trigger.

### 6.8 Offline P2P Sync (WhatsApp Text-Snippet Engine)

**Payload spec:**
```
ROOTS_V1|[PROVINCE_CODE]|[DISTRICT_CODE]|[SABHUKU_BOOK_ID]|[MUTUPO_ID]|[CHIDAWO_ID]|[NATIONAL_ID_STRIPPED]
```
```javascript
function generateWhatsAppPayload(person) {
  const segments = ["ROOTS_V1", person.admin.province, person.admin.district,
    person.admin.villageBookId, person.kinship.mutupo, person.kinship.chidawo,
    person.admin.nationalId.replace(/-/g,'')];
  const packed = encodeURIComponent(btoa(segments.join('|')));
  return `whatsapp://send?text=ROOTS_SYNC:${packed}`;
}
```
**Conflict resolution (vector clock):** every record carries `sync.versionSequence`. On import, if incoming `versionSequence` > local, auto-overwrite. If equal but content differs, flag `DISPUTED` and route to the Institutional Hub's dispute queue (4.2) — never silently pick a winner.

### 6.9 Chieftainship Collateral Succession

Rotation is horizontal across sibling "Houses" before dropping to the next generation (brother → brother → ... → eldest son of senior house). Disqualification checks per candidate: `Zera` (an elder generation member still alive), `Kuremara` (traditionally, physical wholeness), `Mhosva neHuroyi` (serious moral/criminal disqualification). Implement as a filter pipeline over candidate nodes sorted by `(houseRank ASC, birthDate ASC)`, returning the first candidate that passes all three disqualification checks and has `isAlive === true`.

---

## 7. The Build Prompt for the IDE Agent

Copy-paste the block below directly into your IDE AI agent as the task instruction. It references every section above by number so the agent can pull structure from this document as it works.

> **Prompt:**
>
> You are building `Roots`, a single-file, offline-first HTML family tree app for Zimbabwe, later ported to Android. Use the document `ROOTS_Cultural_Data_Structure.md` as your authoritative spec. Work in this order:
>
> 1. Implement the `Person` data model exactly as defined in Section 1 — do not flatten the nested `admin` / `ethnicity` / `kinship` / `oral` namespaces.
> 2. Build the two-hub app shell from Section 2: a boot gate with two buttons (Regular User / Institutional User), and the seven view states listed, using a class-toggle state machine (no router, no framework). Enforce portrait-only, zero horizontal scroll, hidden scrollbars, bottom icon-only tab bar.
> 3. Seed the lookup tables in Section 5 verbatim into a `lookups.js` — the 10 provinces, 16-language cluster map, full 28-totem registry with greetings/proverbs/taboos, time-of-day greetings, and proverb library. Do not invent totem data not present in Section 5; leave fields blank rather than fabricating praise names or proverbs that weren't documented.
> 4. Build the Family Tree view (Section 3.2) as a rectilinear orthogonal grid with a shared left-edge Years axis, staggered sibling vertical offsets by birth order, and the settings panel (thumbnails, orientation, card color, deceased ribbon, generations slider, hide-cousins, quick-add-parent). Support pinch-zoom and drag-pan.
> 5. Implement the customary-law engine functions from Section 6 as pure, independently-callable functions: exogamy check (6.1), patrilineal/matrilineal inheritance (6.2), totem drift (6.3), polygamous house seniority (6.4), deceased lifecycle state machine (6.5), consanguinity distance for timeline privacy (6.6), and the chieftainship succession filter (6.9). Wire the exogamy check to fire the moment two nodes are linked as spouses in the tree UI.
> 6. Build the Timeline view (Section 3.1): image-only posts, a Groups system for custom visibility circles, and privacy enforcement via the consanguinity function from step 5 before any image renders.
> 7. Build the Cultural Lookup Library (Section 3.3) as a standalone, no-login-required browsable reference over the same lookup tables from step 3 — totem directory, praise poems, proverbs by category, greetings, and a read-only admin-region browser.
> 8. Build Settings/Export (Section 3.4): WhatsApp text-snippet export using the exact payload spec in Section 6.8 (this must work free-tier, no paywall); gate PDF export, SD card backup, praise audio library, and the spouse Bloodline Switch behind a simple locally-verified EcoCash code check.
> 9. Build the Institutional Hub (Section 4): Aggregation Dashboard opening directly to the totem overview table with the filter set listed in 4.1 (province, district, ward, chief, headman, village book ID, totem, praise name, age band, language cluster, gender, alive/deceased) — plain HTML tables only, no charting libraries. Then the Lineage Auditor (4.2) with advanced search, the succession simulator wired to the 6.9 function, and a dispute queue reading from any record flagged `DISPUTED` by the sync conflict logic in 6.8.
> 10. Treat the Marriage Module (3.5) and Death & Succession Module (3.6) as v2 — implement their data-model hooks now (the schema already reserves space for them in Section 1) but you can defer their full step-by-step negotiation/ritual UI until the core tree, timeline, and lookup library are stable and demoable.
>
> At every step, if a cultural data point isn't present in this document (e.g. a district not in the seed list, a totem praise name not documented), leave the field free-text/blank rather than inventing content — this app's institutional credibility depends on not fabricating cultural data.

---

## Appendix: Quick field-reference cheat sheet

| You need to store... | Goes in... |
|---|---|
| Province/District/Chief/Sabhuku | `Person.admin` |
| Language/dialect | `Person.ethnicity` |
| Totem/praise name/house rank | `Person.kinship` |
| Praise poem text, greeting, taboo | `Person.oral` (auto-filled from `totemRegistry` lookup on totem selection) |
| Parent/spouse/child links | `Person.relations` |
| Alive/deceased ritual state | `Person.lifecycleState` |
| Timeline photo visibility | Computed via `calculateConsanguinityDistance` (6.6), not stored per-viewer |
| Marriage negotiation ledger | Separate `Marriage` object (Section 6.1/6.2), linked by `spouseIds` edge, not embedded in `Person` |
| Institutional filters | Query directly against the nested `Person` fields above — never duplicate them into a separate "institutional profile" object |
