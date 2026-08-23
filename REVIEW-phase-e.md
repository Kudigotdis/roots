# REVIEW — Phase E: family-app completion (43e91b8)

Scope: timeline completion, groups depth, enriched-data surfacing,
plus the first automated test suite for the consumer pages.

## What changed

### E1 · Timeline (`timeline.js` rewrite, `timeline.html` badge hook)
- **Comment threads**: `post.comments[]` persisted; 💬 opens a bottom
  sheet (thread + input); count on the button.
- **Share**: `navigator.share` with `wa.me` text fallback.
- **Delete own post** (🗑 + confirm), cascades comments.
- **Story viewer**: tap story → fullscreen overlay (avatar, name,
  relation/years/mutupo line, latest visible post) with 6s progress bar —
  replaces the old redirect-toast.
- **Activity bell (honest digest)**: single-user offline app, so no fake
  social notifications. ♥ badge counts unseen feed posts
  (`createdAtISO` > `lastSeenFeedAt` marker), birthdays today, and
  flagged records (`sync._disputed`). Opening the panel marks seen;
  items deep-link to the post card (flash highlight) or tree.html.

### E2 · Groups depth (`app.js`)
- **Group detail modal**: tap any group card → member list with remove,
  add-member select (scoped to the group's preset category), persists.
- **Preset auto-membership**: SIBLINGS / FIRST_COUSINS / SECOND_COUSINS
  computed from the relations graph at creation; legacy empty preset
  groups backfilled at boot.
- **Post-to-group**: composer gains a group target; feed visibility for
  targeted posts = `group.members.includes(me)` (chip 👥 shown);
  family-scope posts keep `isVisibleForScope`.

### E3 · Enriched-data surfacing
- `tree.js` profile Info tab: Province/District/Ward/Chiefdom/Village
  book rows + "Same village book" chips (tap → openProfile).
- `app.js` index profile: Geography section mirroring the tree panel.

### Bugs found & fixed along the way
- **Library never rendered its default tab** — `library.js` had no boot
  call; body stayed empty until first tab tap. Initial render added.
- `app.js` lacked an `initials()` helper (used by new group UI) — added.

### Test coverage (was zero)
- `tools/smoke-family.js` (new): **20 jsdom checks** across all four
  consumer pages — geography sections, preset backfill/auto-populate,
  group detail add+persist, bell digest count/mark-seen, story viewer,
  comment persist + count, wa.me share fallback, delete own post,
  group chip, enriched PEOPLE on tree, library default render,
  and "no page JS errors" per page.
- Wired as `npm run test:family`.
- `style.css`: one additive PHASE E block (badge, notif panel, sheet,
  story viewer, member rows, vb chips); no existing rules modified.

## Semantics worth remembering
- `isVisibleForScope('SIBLINGS')` = consanguinity distance ≤ 1 →
  parents/children/spouse only. Siblings are distance 2 (they fall under
  FIRST_COUSINS' ≤2). Smoke seeds use R002 (father) as co-author.
- `roots_role` is stored RAW (not JSON) by index.html buttons.

## Verification
- `node --check` all touched files ✓ · verify-pages 10/10 ✓
- `test:data` 21 ✓ · `test:family` 20 ✓ · `test:inst` 45 ✓ · `test:admin` 48 ✓
- SW cache `roots-v10 → roots-v11`; both institutional smoke assertions bumped.

## Files touched
timeline.js (rewrite) · timeline.html · app.js · tree.js · library.js ·
style.css · sw.js · tools/smoke-family.js (new) · tools/smoke-institutional.js ·
tools/smoke-admin.js · package.json

## Manual spot-checks suggested
1. Timeline: post → comment → share sheet (real device shows native
   share) → delete own post.
2. Groups: create "1st Cousins" → members appear; post to it from
   composer; feed shows 👥 chip only to members.
3. Tree: open anyone born in dataset → Info tab shows province/village
   book; village-book chips jump between neighbours.
4. Library: first paint now lists totems without tapping.
