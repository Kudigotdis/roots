# Roots App — Architecture & Ownership

Multi-page offline-first genealogy app (Capacitor/Android + PWA).
Plain HTML/CSS/JS — no frameworks, no build step beyond `npm run copy:www`.

## Page ownership (one developer per page)

| File | Owner | Scope |
|---|---|---|
| `index.html` | Shell owner | Welcome gate, account gate, Profile view, Groups view, settings hub |
| `timeline.html` | Timeline dev | Feed, stories, posts |
| `tree.html` | Tree dev | TCM family tree engine, ego picker, profile panel overlays |
| `library.html` | Library dev | Cultural library sections |
| `onboarding.html` | Onboarding dev | 8-step Regular-User registration wizard (`onboarding.css/js`) |
| `institutional/institutional-login.html` | Institutional dev | Login gate, demo auth + lockout, application status checker |
| `institutional/institutional-onboarding.html` | Institutional dev | 9-step institutional registration wizard (`institutional-config.js/css/js`) |
| `institutional/institutional-workspace.html` | Institutional dev | Type-specific post-login workspace: shell/router builds nav from effective access (`institutional-workspace-config.js`, `institutional-access.js`); views for records/person detail/totems/culture, lineage+succession+families, projects+saved queries, report builder+village books/places/schools/collections/finding aids, exports (mirrors admin log), dispute queue, access centre (REQUEST MORE ACCESS), organisation management |
| `admin/admin-login.html` | Admin dev | Independent Roots Administrator auth gate (`admin-permissions/data/login`) |
| `admin/admin.html` | Admin dev | Single-shell Roots Administrator console — 16 permission-gated views over `roots_admin_*` stores |

Each page may have its own JS file (`timeline.js`, `tree.js`, …). A dev touches
**only their own page and their own JS file**.

`index.html`'s **Institutional User** button routes to
`institutional/institutional-login.html`; the legacy in-page institutional
dashboard was removed from `index.html`/`app.js`. The **Roots Administrator**
button routes to `admin/admin-login.html`.

The institutional login refuses accounts suspended via the admin console
(`roots_admin_user_suspensions`), and every workspace export mirrors an entry
into `roots_admin_export_log` for the admin Export Centre. The institutional
research workspace itself stays owned by the Institutional dev — the console
reports on it but never rebuilds it.

## Shared files (shell owner only — do not edit without approval)

- `style.css` — design tokens, `.app-topbar`, `.bottom-nav`, shared components
- `shell.js` — top bar / bottom nav behavior, active-tab sync, hash routing,
  back button, cross-page toast
- `settings.js` — Tree Display Settings + EcoCash premium panel + account info /
  Switch Account (included by `index.html` AND `tree.html`)
- `data.js` — person data model + spec-upgrade layer (`RootsData.upgradeAll()`).
  No longer seeds demo people.
- `dataset_v2.js` (generated) + `dataset.js` — import the 533-person master
  dataset into `PEOPLE/byId` per account mode; runs on every page after `store.js`
- `registration-data.js`, `validation.js` — onboarding config & central validator
- `zw_locations.js`, `schools_db.js` (generated) — ZW locations + 8,156 schools
- `lookups.js`, `customary.js` — cultural reference data (totems, proverbs,
  roora, glossary)

Regenerate wrappers after editing source JSON/XLSX exports:
`npm run gen:data` · verify: `npm run test:data && node tools/verify-pages.js`

## Accounts & sessions

- Tap **Regular User → choose**: **Login as Kudzanai Chitate**
  (session `mode:'family'`, ego = focus person R001, full 533-person dataset)
  or **Create Profile** (→ `onboarding.html`; session `mode:'personal'`,
  empty tree with only your own person node).
- Session keys: `roots_session` {accountType, mode, personId}, canonical user
  record in `roots_user` (includes `familyTreePersonId` + `personNode`),
  hashed credentials only in `roots_auth`. Password never stored plaintext.
- Switch Account lives in the Profile view and the settings panel.

## How pages connect

- Bottom nav items are **real links**: `index.html` ↔ `timeline.html` ↔
  `tree.html` ↔ `library.html`. Profile lives inside `index.html`.
- Every page sets `<body data-page="home|timeline|tree|library">`; `shell.js`
  uses it to highlight the active nav item.
- Hash routing on `index.html`: `#profile` opens the profile view,
  `#settings` opens the settings panel.
- Data persists in `localStorage` (origin-wide), so it survives page switches.

## Build & device sync

```
npm run copy:www        # copies web assets into www/
npx cap sync            # www/ -> android project
npx cap open android    # build/run from Android Studio
```

`www/` and `android/app/src/main/assets/public/` are generated — never edit them;
they are git-ignored.

## Offline / service worker

`sw.js` precaches all four HTML pages + shared JS. Bump its `CACHE_VERSION`
whenever you change the file list.
