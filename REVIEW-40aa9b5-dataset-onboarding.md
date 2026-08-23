# Review Guide — Dataset v2 Integration + Account Gate + Onboarding Wizard

**Commit:** `40aa9b5` (branch `main`, pushed) · **Build state:** `www/` + Android synced · SW cache: `roots-v5`

## 1 · What Changed

| Area | Files | Summary |
|---|---|---|
| Dataset import | `dataset_v2.js` (generated), `dataset.js` | 533 people + 593 relationships loaded per account mode; runs on every page after `store.js` |
| Legacy removal | `data.js` | ~290-line hardcoded family deleted; now only model + `RootsData.upgradeAll()` |
| Account gate | `index.html`, `app.js` | Regular User → choose Login-as-Kudzanai or Create Profile; session-aware boot |
| Onboarding | `onboarding.html/.css/.js`, `registration-data.js`, `validation.js` | 8-step registration per spec |
| Tree ego | `tree.js` | ego = logged-in person (`R001` family mode / created user personal mode) |
| Account mgmt | `settings.js`, profile view | Switch Account buttons; account mode info line |
| Plumbing | `sw.js`, `package.json`, `tools/*` | v5 precache incl. new files; `gen:data` / `test:data` scripts |

## 2 · Test Flow A — Fresh install → Login as Kudzanai

> Clear app storage first (Android: Settings → Apps → Roots → Clear Data, or DevTools → Application → Local Storage → clear).

1. Open app → Welcome screen shows
2. Tap **👤 Regular User** → **account gate** appears ("Choose your path")
3. Tap **← Back** → welcome again ✓ re-enter → gate
4. Tap **🔑 Login as Kudzanai Chitate**
5. Expected: Profile tab loads, name shows **Kudzanai Paul Chitate IV**, born 1987, Harare Zimbabwe
6. Tap **🌳 Tree tab** → renders with **Kudzanai as Ego card** (badge), parents Shamiso (father) + Mildred (mother) above, daughter Ayanna below
7. Stats strip ≈ 533 people · search "Natasha", "Bulawayo", any dataset name works
8. Timeline tab → **stories populated from real dataset people** (not old demo names)
9. Kill & reopen app → **gate skipped**, straight into Profile (session remembered)

## 3 · Test Flow B — Create Profile (onboarding)

From gate tap **➕ Create Profile**:

| Step | Must pass | Try breaking it |
|---|---|---|
| 1 Identity | Photo preview after upload; Unicode names (e.g. `Tafadzwa`, `Élodie`) accepted; username live status (`✓ available` / `✗ taken`); DOB 3 selectors rejects future date; Male/Female toggle; nationality list ~194 entries; Race "Other" reveals text field | Enter username with spaces (rejected); DOB year 2099 |
| 2 Contact | ≥1 mobile + ≥1 WhatsApp required; "+ Add another" works; dial code auto-fills from country; WhatsApp shows "○ Not verified" | Delete all rows → Continue blocked |
| 3 Location | Country=Zimbabwe → province/town/area hierarchy; other country → generic fields; "Can't find your area?" saves submission | — |
| 4 Education | Optional; ZW school autocomplete suggests real schools (type "Kutama"); multiple institutions per category | — |
| 5 Interests | Counter updates; <5 blocks Continue | Pick exactly 5 → proceeds |
| 6 Security | Strength meter colors; mismatch confirm blocked at step gate | Passwords differ |
| 7 Review | Live tally `Required: X/14`; ✗ lines turn ✓ as fixed; **Create button disabled until 100%**; Edit buttons jump to steps | — |
| 8 Created | "Welcome to Roots, {name}" → **Enter Roots** lands in Profile tab | — |

After creation: Tree tab shows **single ego card only** (your profile, correct gender colour) with quick-add parent ghosts · Timeline empty of stories · Library works normally · Settings ⚙️ → Account section reads *"Personal profile — build your own tree"*.

## 4 · Test Flow C — Switch Account & persistence

1. Profile view → **⇄ Switch Account** → returns to Welcome, all account keys cleared
2. Repeat via **⚙️ Settings → Switch Account** (bottom section)
3. Log in as Kudzanai again → tree intact; posts you made earlier still present (author preserved)

## 5 · Expected behaviours — NOT bugs

- **Grey/neutral cards everywhere**: dataset has no gender column yet. When you supply it → edit `data/roots_family_tree_master_dataset_v2.json` (add `gender`) → run `npm run gen:data`
- **Old photos/notes/death records reset once**: one-time migration remapped `'you'`→`'R001'`; flagged by `roots_family_migration_v1`
- **WhatsApp always "Not verified"** — real verification needs backend later (per spec §12)
- **Password never stored plaintext** — only SHA-256 hash in `roots_auth`
- **No KYC fields anywhere** — intentional (spec §23/§46)

## 6 · Automated checks (all green pre-release)

```
npm run test:data            # 12/12: counts, R001 links, spouses, upgrade layer, myId=R001
node tools/verify-pages.js   # every element ID each script calls exists on its page
npx cap sync android         # www -> android OK
```

## 7 · File inventory (this change)

**New:** `dataset.js`, `dataset_v2.js*`, `zw_locations.js*`, `schools_db.js*` (*generated), `registration-data.js`, `validation.js`, `onboarding.html/css/js`, `tools/generate-dataset-js.js`, `tools/test-dataset-load.js`, `tools/verify-pages.js`

**Modified:** `data.js`, `index.html`, `app.js`, `tree.js`, `tree.html`, `timeline.html`, `library.html`, `settings.js`, `style.css`, `sw.js`, `package.json`, `ARCHITECTURE.md`

## 8 · Key localStorage keys

| Key | Purpose |
|---|---|
| `roots_session` | `{accountType:'regular', mode:'family'\|'personal', personId}` — decides entry + dataset mode |
| `roots_user` | Canonical user record incl. `familyTreePersonId` + `personNode` |
| `roots_auth` | `{username, authHash}` — hashed password only |
| `roots_app_state.myId` | Current ego id (`R001` or `u_<username>`); patched by `dataset.js` on every boot |
| `submitted_areas` | Pending user-submitted locations from onboarding |
