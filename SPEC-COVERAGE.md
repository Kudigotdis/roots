# Spec Completeness Audit — Roots Institutional Layer

Audit date: 2026-08-24 · Sources: `Institutional User Development Notes/` (Setup 1–4, Onboarding, Permissions Matrix)
Method: every requirement extracted into an inventory (~250 items), then mapped against shipped code with line-level evidence.

## Verdict

| Spec file | Coverage | Notes |
|---|---|---|
| Setup 1 (B1 login/onboarding UI) | ~100% | Fully built in phase B1 (`79f72b4`) |
| Setup 2 (duplicate of Setup 1) | ~100% | Same content; adds "next phase" question only |
| Setup 3 (Administrator console) | ~92% | Gaps G3–G5 below |
| Setup 4 (workspace shell/features) | ~90% | Gaps G1–G2, G6–G7 |
| Onboarding + Permissions Matrix | ~95% | Role-permission engine, invites, verification/suspension all built |

## Built & verified (highlights)

- **Onboarding**: 9-step wizard, type-specific fields for all 10 institution types, draft autosave/resume, submit → `ROOTS-INST-000xxx`, status checker, geographic scope pickers, data-access groups, module selection, staff invites with **type-filtered role lists** (`institutional-onboarding.js:612` reads `t.roles` from workspace config), review step, no KYC anywhere.
- **Login**: lockout after repeated failures, session persistence, role routing.
- **Workspace shell**: dynamic nav from effective access (`institutional-access.js` returns full access object incl. `personLevelAllowed`, `anonymizationRequired`, `allowedExports`), locked-card states, plan badges, sync chip, alerts bell honouring §66 mutes.
- **Landing titles**: all 10 types have distinct dashboards — REGIONAL DATA OVERVIEW / CHIEFDOM REGISTER / RESEARCH OVERVIEW / ARCHIVAL COLLECTIONS / HERITAGE COLLECTIONS / COMMUNITY PROGRAMMES / HERITAGE PORTFOLIO / EDUCATION & COMMUNITY HISTORY / CULTURAL RECORDS / GENEALOGY RESEARCH (`institutional-workspace-config.js:61–142`).
- **Search**: full filter set — name, surname, province, district, ward, chief, headman, sabhuku, village book, totem, praise name, language, gender, age band, alive/deceased (`institutional-search.js:274–288`); person record tabs Overview/Administrative/Cultural/Lifecycle/Sources/Audit with permission gating (`institutional-search.js:94–97`).
- **Access centre**: request form includes Duration-in-days field stored as `durationDays` with expiry countdown (`institutional-access-centre.js:67,105`); REQUEST MORE ACCESS flow; approve/approve-with-limits/reject/request-info on admin side with `NEEDS_INFORMATION` status.
- **Lineage view** nine-column auditor, succession analysis, exogamy checks, house seniority; disputes queue side-by-side resolution; exports centre with format permissions (CSV/JSON/EAD3 unlocked per grant); audit trail MY ORGANISATION with CSV export; organisation settings 8 tabs incl. §66 Notifications/Exports/Privacy.
- **Admin console**: permission-gated views for dashboard/institutions/applications/users/access/products/subscriptions/datasets/disputes/imports/exports/audit/geography/schools/library/system/reports; derived metrics (no hard-coded counts); approval cascade creates grant+subscription+notification; suspension semantics (org vs user vs grant revocation); export log mirror; audit centre; feature flags; retention settings; roles matrix; shared single country registry consumed by all three consoles.

## Gaps

| # | Gap | Spec ref | Severity | Evidence of absence |
|---|---|---|---|---|
| G1 | First-login welcome summary screen ("ENTER WORKSPACE" as persisted landing) | Setup 4 (first-login section) | Medium | No matches for `ENTER WORKSPACE`/`firstLogin` in `institutional/*.js` |
| G2 | Saved-query row actions: Run / Edit / Duplicate / Delete / Export | Setup 4 §23 | Medium | `institutional-projects.js:79–128`: reports have OPEN IN REPORTS only; plain queries have zero actions |
| ~~G3~~ | ~~Danger Reason field~~ — **AUDIT ERROR: already built** | Setup 3 §1665, §1690 | — | `confirmAction()` admin.js:90–109 enforces non-empty reason (:105); used at 12 danger sites (suspend/reactivate institution, user suspend/restore, access reject, subscription suspend/cancel, dispute resolve, export request, area/school reject); reasons logged via `logAdminAction(..., {reason})` |
| ~~G4~~ | ~~Global admin search~~ — **AUDIT ERROR: already built** | Setup 3 §1607 | — | GLOBAL SEARCH §51 at `admin.js:1591–1640`: Enter on `#adminGlobalSearch` matches institutions/applications/users/grants/export-log/people/totems/schools → results table with per-row navigation |
| G5 | Institution detail as tabbed panel: Overview/Users/Roles/Access/Projects/Products/Subscription/Exports/Audit | Setup 3 §524 | Low | Side panel shows kv + grants + 4 actions (`admin.js:367+`), no tabs |
| G6 | Notification types EXPORT COMPLETED / DISPUTE UPDATED / DATASET UPDATED (+ SUBSCRIPTION NOTICE beyond activation) | Setup 4 notifications list | Low | `notifyInstitution` sites cover application/access/activation/suspension only (`admin-data.js:380–552`, `admin.js:833–873`) |
| G7 | Org settings pending-invitation count copy ("N invitations pending") | Setup 1/2 staff section | Cosmetic | No string match in workspace files |
| G8 | System settings editable Mobile Networks (Econet/NetOne/Telecel/BTC/Mascom/Orange) + Payment Methods sections | Setup 3 §1504 | Low | Registry shown read-only; flags+retention+roles matrix present (`admin.js:1535+`) |

## Explicitly out of scope (per spec's own caveats)

Server-side auth enforcement, real payment processing, real backend security, chart libraries (spec forbids them), multi-device real sync (local-first demo contract).
