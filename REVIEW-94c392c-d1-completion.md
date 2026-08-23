# Review Guide — 94c392c (Institutional D1 Completion)

Closes the remaining Setup 4 acceptance gaps on top of `17da5d1`.
15 files changed, +623 / −27.

## What shipped

| Spec | Feature | Where |
|---|---|---|
| §62 | Institutional lineage table — Years / Person / Parents / Children / Collateral / Totem / House / Administrative area / Source+confidence, per anchor person; relatives outside approved geography counted, never listed | `institutional/institutional-lineage.js` (`renderLineageTable`), 🧾 TABLE button on every auditor hit |
| §63–65 | Lifecycle & Customary Law Register: lifecycle-state cards + drill-down with permitted-action counts, marriage feasibility (exogamy) checker, polygamous house seniority ordering, totem-drift resolution. Gated on `LIFECYCLE` dataset + `inst.lifecycle` perm + TRADITIONAL/GOVERNMENT suite. Marriage registry rows labelled "not yet supported by the dataset model" (no invented data) | `institutional-lineage.js` (`id:'lifecycle'`), nav added to GOVERNMENT + TRADITIONAL_AUTHORITY in `institutional-workspace-config.js` |
| §47 | Saved Reports: name+save after each run (`roots_inst_saved_queries`, `kind:'report'`, stores the spec), RUN/DELETE list in Reports, listed in Saved view with OPEN IN REPORTS handoff (`window.RootsInstSavedReportToRun`) | `institutional-reports.js`, `institutional-projects.js` |
| §45 | Subscription tab: Users used vs limit (+ AT LIMIT chip), renewal date + interval from `roots_admin_subscriptions` | `institutional-organisation.js` |
| §51 | Sync chip shows "N submission(s) pending" = SUBMITTED corrections + own PENDING access requests | `institutional-shell.js` (`pendingSubmissions`) |
| §46 | Roots Administrator actions now write institution-facing notices into `roots_inst_notifications` tagged with `applicationId`: approve/reject/request-info application, grant/reject access request, suspend/restore user. Workspace bell filters notices by own `applicationId` | `admin/admin-data.js` (`notifyInstitution`), `admin/admin.js`, shell `computeAlerts` |

## Critical bug found & fixed

**`window.PEOPLE` was always undefined.** `data.js` declares `const PEOPLE = []`
and `lookups.js` declares `const totemRegistry/proverbs/timeGreetings/glossaryTerms/all16Languages`.
Top-level `const` creates a global *lexical* binding — visible to other classic scripts as a bare
identifier but **never** as a `window` property. Every workspace/admin read of
`(window.PEOPLE || [])` therefore operated on an empty array (48 call sites): dashboards showed
zeros, search returned nothing, exports exported zero records. Nothing caught it because no prior
smoke check asserted a nonzero count. Fix mirrors the bindings onto `window` in
`data.js` / `lookups.js` (mutation-safe — same array references).

## Test coverage changes

- `tools/smoke-institutional.js` 27 → **40 checks**:
  - §51 pending-submission count on sync chip
  - §63–65 lifecycle register renders + exogamy verdict via seeded ACTIVE grant
    (`roots_admin_grants` entry must carry `applicationId` or the engine ignores it)
  - §62 lineage table opens and shows all nine columns
  - §48/§69 role-based navigation: Viewer session (≤4 items, no Organisation/Lineage/
    Exports/Villages, hidden hash falls back to landing) and Researcher session
    (keeps lineage/reports/access, denied Organisation/succession/lifecycle/villages)
- `tools/smoke-admin.js` 46 → **48 checks**: approval notice visible in own bell;
  other institutions' notices filtered out. Note: jsdom windows have isolated localStorage,
  so TEST 7 seeds the exact entries `notifyInstitution()` writes rather than relying on
  cross-window persistence (in a real browser they share storage).
- sw cache bumped to `roots-v9`.

## Verification chain (all green)

```
node --check            all touched JS
verify-pages            10/10 pages (workspace = 21 scripts)
test:data               12/12
test:inst               40/40
test:admin              48/48
```

## Manual spot-checks (optional, browser)

1. Serve repo, sign in as Rudo Institutions (0770000002/institution2026).
2. Lineage → search → 🧾 TABLE → walk relatives via inline links.
3. Lifecycle (Government/Traditional types): run exogamy check on two people.
4. Reports → RUN → save → Saved view → OPEN IN REPORTS.
5. Admin console: reject an access request → institution bell shows rejection reason.
