# REVIEW — Release hardening prep (post-94c392c)

Scope: demo-data enrichment, §66 settings tabs, access-posture bugfix,
housekeeping (gitignore, SW bump), verification chain extension.

## What changed

### 1. Demo-data enrichment — `tools/enrich-dataset.js` (new)
One-time, idempotent (djb2 of stable ids) enrichment of
`data/roots_family_tree_master_dataset_v2.json`:
- `admin.*` on all 533 people: province/district/ward/chief/headman/
  sabhuku/`villageBookId` (VB-XXX-n, 66 books)/synthetic nationalId.
- Totems **per branch** (`p.branch` → one totemRegistry entry per clan,
  52 clans): kinship.mutupo/chidawo/zvidawo + oral.greeting/taboo.
  Families grouping, Totem Distribution and totem filters are now live.
- gender derived from relation semantics (father/brother/nephew… vs
  mother/daughter/aunt/gogo…), ambiguous buckets hash-assigned; 532/533
  ("Self" left unset by design).
- lifecycleState: ALIVE 333 / DECEASED_FROZEN 84 / RITUAL_CLEARED 59 /
  NHAKA_RESOLVED 57 (sum = 533; ≥2020 deaths stay FROZEN).
- kinship.houseRank for 78 children (birth order within mothers with ≥2 kids).
Re-run output confirms idempotency (second pass assigns 0 new genders).

### 2. Mapper passthrough — `dataset.js`
`importMasterDataset()` previously dropped enriched objects. Added
passthroughs: `admin`, `kinship`, `oral`, `ethnicity`, `lifecycleState`.
(`upgradeAll()` preserves them via `||` defaults.)

### 3. §66 settings tabs — `institutional-organisation.js`
Tab bar now: Profile · Users · Roles · **Notifications** · **Exports** ·
**Privacy** · Subscription · Audit.
- Notifications: four mute toggles (disputes/access-expiry/corrections/
  admin notices) stored in `ORG_NOTIF_SETTINGS`; shell bell honors them;
  toggle logs `UPDATE_NOTIFICATION_SETTINGS` and refreshes the bell.
- Exports: default format (`ORG_EXPORT_DEFAULTS`) preselected by Export
  Centre; posture summary; recent-export count; jump link.
- Privacy: read-only mirror of the grant posture (person-level,
  anonymisation, scope, datasets, National-ID masking, corrections count).

### 4. Bugfix surfaced by the Privacy tab — `institutional-access.js`
`personLevelAllowed` / `anonymizationRequired` were computed but never
returned on the access object — Exports' anonymisation checkbox and
Search's National-ID masking were silently reading `undefined`. Both now
exposed. *(Latent since D1; caught because §66 mirrors these flags.)*

### 5. Housekeeping
- `.gitignore`: `Institutional User Development Notes/`.
- `sw.js`: cache `roots-v9 → roots-v10`; both smoke assertions bumped.

## Verification
- `node --check`: all touched files ✓
- `verify-pages`: 10/10 ✓
- `test:data`: **21 checks** (12 prior + 9 enrichment coverage: admin on
  all, books ≥5, mutupo 100%, chidawo majority, totem known to registry,
  lifecycle sum, deceased-state consistency, gender all-but-Self,
  houseRank uniqueness within mother groups)
- `test:inst`: **45 checks** (was 40; +lifecycle drill-down, +village
  rows ≥3, +§66 mute/unmute bell delta, +export default persisted,
  +privacy posture mirror)
- `test:admin`: 48 ✓

## Known data quirk (documented, not a defect)
R034 carries three recorded parents; its houseRank comes from its
multi-sibling household, so single-edge mother groups can show one
out-of-range rank. The invariant that matters for `sortByHouseSeniority`
is rank *uniqueness* per household — asserted accordingly.

## Manual checklists (user-executed)

### Browser PWA
1. Serve (`npx serve .` or equivalent), open workspace, then reload ×2 —
   DevTools → Application → Service Workers should show roots-v10
   controlling (first reload activates, second claims).
2. Offline relaunch: Network → Offline, reload — shell renders from cache,
   sync chip shows OFFLINE with pending-submission count after edits.
3. Install prompt (Chrome address bar) → install as app window.
4. Mobile width ≤820px: bottom nav shows 5 items; lineage table scrolls
   horizontally inside its wrap.
5. Walkthrough: lineage TABLE view · lifecycle drill-downs · saved report
   re-run from Projects · Organisation → new three tabs.

### Android (Capacitor)
1. `npm run copy:www && npx cap sync android`
2. `npm run cap:open:android` → build/run on device or emulator.
3. On-device checks: first boot seeds demo data; kill + relaunch keeps
   session (localStorage persists); WhatsApp invite/intent links open;
   service worker is inert inside the WebView (Capacitor serves from
   assets) — offline behavior comes from bundled files, not SW.

## Files touched
tools/enrich-dataset.js (new) · data/roots_family_tree_master_dataset_v2.json ·
dataset_v2.js · dataset.js · institutional/institutional-organisation.js ·
institutional/institutional-shell.js · institutional/institutional-exports.js ·
institutional/institutional-access.js · sw.js · tools/test-dataset-load.js ·
tools/smoke-institutional.js · tools/smoke-admin.js · .gitignore
