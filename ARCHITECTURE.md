# Roots App — Architecture & Ownership

Multi-page offline-first genealogy app (Capacitor/Android + PWA).
Plain HTML/CSS/JS — no frameworks, no build step beyond `npm run copy:www`.

## Page ownership (one developer per page)

| File | Owner | Scope |
|---|---|---|
| `index.html` | Shell owner | Welcome gate, Profile view, Groups view, settings hub |
| `timeline.html` | Timeline dev | Feed, stories, posts |
| `tree.html` | Tree dev | TCM family tree engine, ego picker, profile panel overlays |
| `library.html` | Library dev | Cultural library sections |

Each page may have its own JS file (`timeline.js`, `tree.js`, …). A dev touches
**only their own page and their own JS file**.

## Shared files (shell owner only — do not edit without approval)

- `style.css` — design tokens, `.app-topbar`, `.bottom-nav`, shared components
- `shell.js` — top bar / bottom nav behavior, active-tab sync, hash routing,
  back button, cross-page toast
- `settings.js` — Tree Display Settings + EcoCash premium panel (included by
  `index.html` AND `tree.html`)
- `data.js` — people/posts data model
- `lookups.js`, `customary.js` — cultural reference data (totems, proverbs,
  roora, glossary)

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
