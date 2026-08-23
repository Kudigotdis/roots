# Review Guide — Admin Console Phase C (a51b980)

**Commit:** `a51b980` — "Admin console Phase C: auth gate, 16 permission-gated views, suspension + export hooks"
**Spec:** `Institutional User Development Notes/Institutional User Setup 3.txt` (C1 + C2 built together)
**Status:** All verification green — see "How to verify" at the bottom.

---

## 1. What this commit adds

The **Roots Administrator console** (`admin/`): an independent, offline-first
admin surface that manages institutions, applications, users, access,
products, subscriptions, dataset governance, disputes, imports/exports,
audit, geography, schools, the cultural library, and system settings.

It reads the B1 institutional stores **in place**
(`roots_institutional_applications` / `roots_institutional_accounts`) and
keeps all of its own state under a separate `roots_admin_*` namespace.
Nothing is duplicated; the institutional workspace itself was not rebuilt
(Setup 3 §47, §73).

### New files

| File | Purpose |
|---|---|
| `admin/admin-permissions.js` | Central permission engine: 7 roles → ~30 permissions. SUPER_ADMIN mapped to ALL in one place. No scattered role checks anywhere else (§5-7). |
| `admin/admin-data.js` | Storage layer + seeds (5 demo admins, 3 institutions, access requests, 9 products, subscriptions, queues), audit log (cap 2000), counters, suspension helpers, `approveApplication` / `rejectApplication` / `requestApplicationInfo`. |
| `admin/admin.css` | Dark slate console theme; responsive drawer sidebar, side panel, confirm modal, toasts. |
| `admin/admin-login.html/.js` | Independent admin auth gate: SHA-256 salted hashes (`roots::roots-admin::`), lockout 5 attempts / 60s, session `{adminId,name,role}` in `roots_admin_session`. |
| `admin/admin.html` | Single shell: hash-routed views, side panel, confirm modal (reason required), bell, global search. |
| `admin/admin.js` | Router + 16 views + workflows + global search (~1300 lines). |
| `tools/smoke-admin.js` | Headless jsdom E2E for everything below (`npm run test:admin`, 46 checks). |

### Changed files (all additive)

- `index.html` + `app.js` — welcome gate gets a third entry:
  **🛡️ Roots Administrator** → `admin/admin-login.html`.
- `institutional/institutional-login.js` — after a credential match, checks
  `roots_admin_user_suspensions` (key = `applicationId|lowercase(adminName)`).
  Suspended accounts are rejected with the stored reason; no session written.
- `institutional/institutional-workspace.js` — every CSV/EAD3/JSON export
  mirrors an entry into `roots_admin_export_log` (Export Centre shows who
  exported what, never the file contents, §71-72).
- `sw.js` — CACHE bumped `roots-v6 → roots-v7`; 7 admin URLs precached
  (45 total).
- `package.json` — `copy:www` copies `admin/`; new script `test:admin`.
- `tools/verify-pages.js` — both admin pages registered (10 pages checked).
- `tools/smoke-institutional.js` — sw version assertion updated to v7.
- `ARCHITECTURE.md` — ownership rows for the two admin pages + hook notes.

---

## 2. Demo credentials (seeded on first visit, shown on the login screen)

| Name | WhatsApp | Password | Role |
|---|---|---|---|
| Roots Super Admin | 0770000001 | super2026 | Super Administrator (ALL) |
| Rudo Institutions | 0770000002 | institution2026 | Institution Administrator |
| Data Keeper | 0770000003 | data2026 | Data Administrator |
| Finance Desk | 0770000004 | finance2026 | Finance Administrator |
| Quiet Auditor | 0770000005 | audit2026 | Auditor (read-mostly) |

Route: `index.html` → **Roots Administrator** → login → console.

---

## 3. Key behaviours to review

1. **Approval chain (§65-66)** — Applications view → open an UNDER REVIEW
   application → APPROVE → submit form. One action creates:
   Institution (**VERIFIED**, ACTIVE) · membership ACTIVE for the primary
   admin · AccessGrant (scope/modules/person-level/anonymization/expiry) ·
   Subscription ACTIVE (product picked by module overlap) — plus three audit
   entries (`APPROVE_INSTITUTION`, `GRANT_ACCESS`, `ACTIVATE_SUBSCRIPTION`)
   and flips the B1 application status to ACTIVE, which removes the
   provisional banner from that institution's workspace. The smoke test
   asserts every one of these side effects.
2. **Danger actions need confirmation + reason (§54)** — suspend user,
   reject/export approvals, dispute resolutions, etc. The confirm modal
   refuses an empty reason (asserted by test).
3. **Suspension round-trip (§55)** — Users view → suspend `Tendai Moyo`
   (account-backed record wins over static membership copies so the real
   login is targeted) → institutional login with correct credentials is now
   rejected with "Account suspended…". Full E2E asserted.
4. **Permission gating** — locked nav items per role; forced hash routes
   fall back to a permitted view; action buttons hidden when the role lacks
   the permission; `guard()` writes `PERMISSION_DENIED … FAILED` audit
   entries. The auditor sees applications read-only (no approve button).
5. **View→permission mapping tightened during testing**: datasets /
   geography / schools / library / system were initially visible to every
   role via DASHBOARD_VIEW; they now use their dedicated manage permissions
   (least privilege, §5-7).

## 4. Bugs found & fixed while testing

- **admin.html was missing `store.js`** — `dataset.js` runs at parse time
  and calls `window.RootsStore.read()`, throwing on every admin page load.
  Fixed by loading `store.js` before the dataset scripts.
- **Static membership copies shadowed live accounts** — after approval, the
  inserted membership row hid the account-backed user, so suspending wrote
  a useless key and never blocked the actual login. Fixed in
  `allUsers()` (admin.js): the ACCT-* record now supersedes any static copy
  of the same person.
- Two test-side bugs (jsdom `dom.document` undefined; post-approval apps sit
  on the *Approved* tab) fixed in `tools/smoke-admin.js`.

## 5. Known limitations (by design, local demo)

- Everything lives in `localStorage` on one device; no server sync yet.
- Dispute resolutions persist as an overlay registry
  (`roots_admin_dispute_resolutions`) keyed by person id.
- Import Centre is a seeded static register until D-phase import tooling.
- Products/subscriptions/pricing are demo defaults (§26-29 shapes ready).

## 6. How to verify

```
node --check app.js admin/*.js institutional/*.js tools/smoke-admin.js
node tools/verify-pages.js        # 10/10 pages OK
npm run test:data                 # dataset checks pass
npm run test:inst                 # 22/22 institutional smoke checks
npm run test:admin                # 46/46 admin smoke checks
```

Manual walk: welcome gate → Administrator → login as Roots Super Admin →
Applications → approve the seeded UNDER REVIEW application → watch
institution/grant/subscription appear → open the institutional workspace
(banner gone) → back in console suspend the user → try logging into the
institutional workspace (blocked with reason).
