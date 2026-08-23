# Review Guide — Institutional Workspace Phase D1 (`17da5d1`)

## What this commit does
Implements **Setup 4 — the complete post-login institutional workspace**. The legacy
single-file dashboard (`institutional/institutional-workspace.js`, 510 lines) is deleted
and replaced by a modular, type-specific workspace driven by an effective-access engine.

An organisation now lands in a workspace shaped by its type, role, approved datasets,
geographic scope, purchased modules and subscription status — never a generic menu.

## New files (institutional/)
| File | Role |
|---|---|
| `institutional-workspace-config.js` | `INSTITUTION_WORKSPACE_CONFIG` for all 10 org types (landing titles, navigation, widgets, primary actions, recommended reports) + institutional role→permission map (ADMINISTRATOR / Researcher / Archivist / Data Officer / Viewer) |
| `institutional-access.js` | `RootsInstAccess.compute()` builds the single effective-access object: session → application → account → grant → modules → subscription → accessStatus; geographic scope matcher; workspace-local stores (`roots_inst_*`) + own-org audit |
| `institutional-shell.js` | Session guard, header identity (org/type/user/role/scope/plan), provisional/suspended banner, ONLINE/OFFLINE + last-sync chip, notification bell (no chat), hash router that renders lock states for un-purchased modules and hides views outside the role |
| `institutional-dashboard.js` | Type-specific Overview: alerts row, primary actions, widget grid from config, recent records/exports |
| `institutional-search.js` | Record search with wide filters; person detail sheet (Overview/Administrative/Cultural/Lifecycle/Sources/Audit tabs, data-quality score 0–5, confidence labels, SUGGEST DATA CORRECTION); totem directory + detail; cultural library (proverbs/greetings/glossary); aggregate-only mode when person-level data is not approved |
| `institutional-lineage.js` | Advanced Lineage Auditor (RESEARCH_SUITE), succession simulator reusing `computeNextInLine()` (GOVERNMENT_SUITE), family groupings |
| `institutional-projects.js` | Research projects CRUD + saved queries |
| `institutional-reports.js` | Report builder (group-by/filter → aggregated table → CSV) + village books registry, places coverage, schools registry, collections/fonds, finding aids (EAD3 readiness) |
| `institutional-exports.js` | Configure → preview → run exports (CSV/JSON/EAD3 gated by modules); anonymisation enforced where required; mirrors every export into `roots_admin_export_log` |
| `institutional-disputes.js` | Dispute queue with filters, detail sheet, MARK RESOLVED (role-gated, mirrored into `roots_admin_dispute_resolutions`) or ESCALATE TO ROOTS ADMIN |
| `institutional-access-centre.js` | Access Centre: datasets/person-level/anonymisation/geography/expiry/export formats/module matrix + REQUEST MORE ACCESS filing into `roots_admin_access_requests` (visible in the admin console queue) |
| `institutional-organisation.js` | Org profile editing, staff roster (invite via WhatsApp / suspend / reactivate / remove), role matrix, read-only subscription panel (no financial data), own-org audit trail + CSV |
| `institutional-workspace.css` | Full responsive stylesheet: desktop sidebar, mobile bottom nav, sheets, tables, lock cards |

## Changed files
- `institutional/institutional-workspace.html` — rewritten as the modular shell (21 scripts; store.js before dataset.js).
- `institutional/institutional-config.js` — comment-only fix.
- `sw.js` — cache `roots-v8`, new file set precached (57 entries).
- `tools/verify-pages.js`, `ARCHITECTURE.md` — updated maps.
- `tools/smoke-institutional.js` — workspace section rewritten for D1 (27 checks total).
- `tools/smoke-admin.js` — TEST 7 drives a real export through the Export Centre (46 checks).

## Bugs found & fixed while testing
1. **Provisional banner stayed hidden** — inline `style="display:none"` was never cleared when access *was* provisional.
2. **Dataset keys mismatch** — onboarding persists item-level keys (`accessSearchPeople`…); the access engine now normalises them to canonical groups (`PEOPLE`, `LINEAGE`…) via `CFG.DATA_GROUPS`. Without this, every provisioned institution saw "PEOPLE dataset" locked.

## Key behaviours to verify manually
- Login as a freshly onboarded GOVERNMENT org → landing title is REGIONAL DATA OVERVIEW, sidebar has exactly its 10 nav items (locked suites show 🔒 styling but render plan-lock cards when opened).
- Without an admin grant, Records shows AGGREGATE VIEW ONLY + REQUEST ACCESS card; after admin approval (person-level), full search + person sheet unlock.
- Exports always create a row in the Roots Admin console export log.
- Forcing `#/totems` on a GOVERNMENT org falls back to the default view (no universal menu).

## Verification performed
- `node --check` all 12 new JS files ✓
- `node tools/verify-pages.js` → 10/10 pages ✓ (workspace = 21 scripts)
- `npm run test:data` → 12/12 ✓
- `npm run test:inst` → 27/27 ✓ (incl. no-JS-error assertions per page)
- `npm run test:admin` → 46/46 ✓

## Known demo-data limitations (not bugs)
- The seeded dataset carries empty `admin.*` geography, so Village Books shows its scoped empty state; Places still aggregates by `location`.
- EAD3/EAC-CPF/GEDCOM beyond module entitlements appear as 🔒 entries in the format select.
