# Review — 79f72b4 — Institutional User B1

**Commit:** `79f72b4` · **Branch:** `main` · **Scope:** Phase B1 only (institutional login gate, onboarding wizard, legacy dashboard relocation). D1 workspace rebuild and C Admin console are deferred by design.

## What changed

### New — `institutional/` (8 files)
| File | Purpose |
|---|---|
| `institutional-config.js` | Single source of truth: `window.RootsInstConfig` — 10 institution TYPES (per-type roles, lifecycle flag, included module suites, conditional org fields), PURPOSES, DATA_GROUPS (PEOPLE/LINEAGE/CULTURAL/ADMINISTRATIVE/LIFECYCLE), SCOPE_LEVELS + follow-up kinds, MODULE_SUITES, PROVINCES_ZW, `zwDistrictNames()`, storage `KEYS`, notice strings. |
| `institutional.css` | Namespaced `body.institutional-root` tokens (`--inst-primary:#003366` government palette), all wizard/login/workspace components. Workspace reskinned to light via `body.workspace-scope` variable overrides — legacy dark rules untouched. |
| `institutional-login.html/.js` | Login gate. SHA-256 salted auth (`'roots::inst::'`), 5-attempt / 60 s lockout, offline cached-session continue, application status checker (UNDER REVIEW vs APPROVED — PROVISIONAL ACCESS). Success writes session → workspace. |
| `institutional-onboarding.html/.js` | 9-step wizard per Setup 2: type cards → organisation (+conditional fields) → location & geographic scope (ZW province/district chips or country multi-select) → purpose → data access groups (lifecycle gated) → modules (locked included suites + optional) → primary admin account → staff invites (per-type role selects) → review & submit. Draft autosave to `roots_institutional_draft`, unsaved-changes modal, full gating, submit provisions application `ROOTS-INST-000NNN` (UNDER REVIEW) + ACTIVE demo account immediately. |
| `institutional-workspace.html/.js` | Legacy institutional dashboard relocated behind the session guard. Adds identity chip, provisional banner, sign-out, working profile overlay (`openProfile` previously broken outside tree.js), succession simulator (uses `computeNextInLine` from customary.js), JSON/CSV/EAD3 export. |

### Modified
- `index.html` — removed inline `#institutional-app`; welcome button now routes to `institutional/institutional-login.html`.
- `app.js` — removed `renderInstitutional`, succession patch, `instBack`, `instApp` routing; boot with `roots_role==='institutional'` redirects to login page.
- `style.css` — removed `.inst-*`/`#institutional-app` blocks; kept `.stat-label` (shared with tree.html).
- `sw.js` — cache bumped `roots-v5`→`roots-v6`; precaches the 8 new institutional files.
- `package.json` — `copy:www` copies `institutional/` recursively.
- `tools/verify-pages.js` — added 3 institutional pages; asset check now resolves refs relative to each page's directory.
- `ARCHITECTURE.md` — ownership table rows for the three institutional pages.

## Verification performed
- `node --check` on all 5 touched/new JS files — pass.
- `node tools/verify-pages.js` — 8/8 pages OK, assets resolve.
- `npm run test:data` — all dataset checks pass.
- Cross-page contract audit: onboarding provisioning keys (`adminWhatsappDigits/adminWhatsappFull/authHash`) match login matcher; all inter-page links are flat relative paths inside `institutional/`.

## Manual acceptance (Setup 2 §52) — for reviewer
1. Welcome → **Institutional User** → login page renders (no bottom nav).
2. **Register your institution** → complete all 9 steps; verify gating (cannot continue with empty required fields), ZW district chips when province scope chosen, lifecycle toggle disabled for types without it, locked module suites.
3. Submit → app ID shown → auto-redirect to login.
4. Sign in with the provisioned admin name + WhatsApp + password → lands in light-themed workspace; banner says provisional; stats/filters/export work; **Sign Out** returns to login.
5. Wrong password ×5 → lockout countdown; airplane-mode reload of login → cached-session continue appears.

## Known limitations (by design, B1)
- Auth is a local working demo; no server verification yet.
- Application stays UNDER REVIEW while demo accounts are ACTIVE (provisional access).
- No admin console yet (Phase C); status flips must be done via devtools if needed.
