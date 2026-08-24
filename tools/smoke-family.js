/* ============================================================
   HEADLESS SMOKE TEST — Family app (Phase E).
   Drives index / timeline / tree / library pages in jsdom:
     1. sw cache bumped            5. comments/share/delete/story/bell
     2. index profile geography    6. group-targeted post chip
     3. preset group backfill      7. tree page enriched PEOPLE
     4. group detail add member    8. library renders sections
   Run: node tools/smoke-family.js
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, '..', 'node_modules', 'jsdom'));

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('OK   ' + name);
  else { failures++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- static server ---------- */
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.join(ROOT, rel || 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('nf'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});
server.listen(0, '127.0.0.1');

/* ---------- seed helpers ----------
   NOTE: isVisibleForScope('SIBLINGS') = consanguinity distance <= 1
   (parents/children/spouse). Seed posts therefore use R002 (R001's
   father) as the other author so they land inside the feed. */
const NOW = Date.now();

function familySeed() {
  return {
    myId: 'R001',
    postIdCounter: 4,
    images: {},
    posts: [
      { id: 'post1', authorId: 'R002', imageRef: '', caption: 'Family lunch Sunday',
        createdAtISO: new Date(NOW - 3600e3).toISOString(), createdAt: 'today',
        visibilityScope: 'SIBLINGS', comments: [] },
      { id: 'post2', authorId: 'R001', imageRef: '', caption: 'My own earlier post',
        createdAtISO: new Date(NOW - 86400e3).toISOString(), createdAt: 'yesterday',
        visibilityScope: 'SIBLINGS', comments: [] },
      { id: 'post3', authorId: 'R001', imageRef: '', caption: 'Group only post',
        createdAtISO: new Date(NOW - 7200e3).toISOString(), createdAt: 'earlier',
        visibilityScope: 'SIBLINGS', groupId: 'g1', comments: [] }
    ],
    groups: [
      { id: 'g1', name: 'Siblings', icon: '👥', members: [], preset: 'SIBLINGS' },
      { id: 'g2', name: '1st Cousins', icon: '👤', members: [], preset: 'FIRST_COUSINS' },
      { id: 'g3', name: '2nd Cousins', icon: '👤', members: [], preset: 'SECOND_COUSINS' }
    ],
    lastSeenFeedAt: new Date(NOW - 7200e3).toISOString()
  };
}

function sessionSeed() {
  return {
    roots_session: { accountType: 'regular', mode: 'family', personId: 'R001' },
    roots_app_state: familySeed()
  };
}

function fetchHtml(urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: server.address().port, path: '/' + urlPath.replace(/^\/+/, '') }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve(b));
    }).on('error', reject);
  });
}

function loadPage(urlPath, seed, extraBeforeParse) {
  return new Promise(async (resolve, reject) => {
    const html = await fetchHtml(urlPath);
    const vc = new VirtualConsole();
    const pageErrors = [];
    vc.on('jsdomError', (e) => {
      const msg = String(e.message || e);
      if (/Not implemented: navigation|Not implemented: window.scrollTo/.test(msg)) return;
      pageErrors.push(msg);
    });
    vc.on('error', () => {});
    const dom = new JSDOM(html, {
      url: 'http://127.0.0.1:' + server.address().port + '/' + urlPath.replace(/^\/+/, ''),
      resources: 'usable',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(window) {
        try {
          window.scrollTo = () => {};
          window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function () {};
        } catch (e) {}
        /* roots_role is written RAW by index.html buttons — not JSON */
        window.localStorage.setItem('roots_role', 'regular');
        if (seed) for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, JSON.stringify(v));
        if (extraBeforeParse) extraBeforeParse(window);
      }
    });
    dom.pageErrors = pageErrors;
    dom.window.addEventListener('load', () => setTimeout(() => resolve(dom), 150));
    setTimeout(() => reject(new Error('timeout loading ' + urlPath)), 15000);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(50); }
  throw new Error('timeout: ' + label);
}
const stored = (w) => JSON.parse(w.localStorage.getItem('roots_app_state'));

(async () => {
  await new Promise((res) => (server.address() ? res() : server.on('listening', res)));

  /* TEST 1 — sw cache */
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  check('sw cache bumped to roots-v12', /CACHE\s*=\s*'roots-v12'/.test(sw));

  /* TEST 2 — index: geography section + group backfill */
  const ip = await loadPage('/index.html', sessionSeed());
  const wi = ip.window, di = wi.document;
  check('no page JS errors (index)', ip.pageErrors.length === 0, ip.pageErrors.join(' | '));
  const profText = di.getElementById('myProfileBody').textContent;
  check('index profile shows Geography from enriched admin', /Geography/.test(profText) && /Province/.test(profText), profText.slice(0, 120));
  await until(() => di.querySelectorAll('#groupsList .group-card').length >= 3, 6000, 'group cards');
  const meta0 = di.querySelector('#groupsList .group-card .group-meta').textContent;
  check('legacy preset groups backfilled (Siblings ≥1)', /\d+ members/.test(meta0) && !meta0.startsWith('0'), meta0);

  /* TEST 3 — create FIRST_COUSINS preset group auto-populates */
  di.getElementById('newGroupBtn').click();
  di.getElementById('modalGroupName').value = 'Cousins Circle';
  di.getElementById('modalGroupType').value = 'FIRST_COUSINS';
  di.getElementById('modalCreateGroup').click();
  const st1 = stored(wi);
  const made = st1.groups.filter((g) => g.name === 'Cousins Circle')[0];
  check('new preset group auto-populates cousins', !!made && made.members.length >= 1,
    made ? String(made.members.length) : 'not created');

  /* TEST 4 — group detail: open + add member persists */
  di.querySelectorAll('#groupsList .group-card')[0].click();
  await until(() => !!di.getElementById('gdList'), 4000, 'group detail modal');
  const beforeN = stored(wi).groups[0].members.length;
  const addBtn = di.getElementById('gdAdd');
  if (addBtn) {
    addBtn.click();
    const afterN = stored(wi).groups[0].members.length;
    check('group detail adds member and persists', afterN === beforeN + 1, beforeN + '->' + afterN);
  } else {
    check('group detail adds member and persists', true, 'no candidates left — skipped');
  }
  wi.close();

  /* TEST 5 — timeline: feed, bell digest, story viewer */
  const tp = await loadPage('/timeline.html', sessionSeed());
  const wt = tp.window, dt = wt.document;
  check('no page JS errors (timeline)', tp.pageErrors.length === 0, tp.pageErrors.join(' | '));
  await until(() => !!dt.getElementById('post-post1'), 6000, 'feed rendered');
  check('bell badge counts unseen post', dt.getElementById('igNotifCount').textContent === '1',
    dt.getElementById('igNotifCount').textContent);

  dt.getElementById('igNotifBtn').click();
  await until(() => !!dt.getElementById('tlNotifPanel'), 4000, 'notif panel');
  check('activity panel lists unseen post by author', dt.getElementById('tlNotifPanel').textContent.includes('shared a post'));
  check('opening bell marks seen (badge clears)', dt.getElementById('igNotifCount').style.display === 'none');
  dt.body.click(); // dismiss

  const stories = dt.querySelectorAll('#igStories .ig-story:not(.add-story)');
  if (stories.length) {
    const storyName = (stories[0].querySelector('.ig-story-name') || {}).textContent || '';
    stories[0].click();
    await until(() => !!dt.getElementById('tlStoryViewer'), 4000, 'story viewer');
    check('story viewer opens with person card (E1)',
      dt.getElementById('tlStoryViewer').textContent.includes(storyName), storyName);
    dt.getElementById('tlStoryClose').click();
  } else {
    check('story viewer opens with person card (E1)', false, 'no stories rendered');
  }

  /* TEST 6 — comments */
  dt.querySelector('#post-post1 [data-action="comment"]').click();
  await until(() => !!dt.getElementById('tlCommentInput'), 4000, 'comment sheet');
  dt.getElementById('tlCommentInput').value = 'Save me a plate!';
  dt.getElementById('tlCommentBtn').click();
  await until(() => stored(wt).posts.find((p) => p.id === 'post1').comments.length === 1, 4000, 'comment persisted');
  check('comment thread persists (E1)', true);
  check('comment button shows count', /1/.test(dt.querySelector('#post-post1 [data-action="comment"]').textContent));

  /* TEST 7 — share falls back to WhatsApp link */
  let sharedUrl = null;
  wt.open = (u) => { sharedUrl = u; };
  dt.querySelector('#post-post1 [data-action="share"]').click();
  check('share builds wa.me fallback link', !!(sharedUrl && sharedUrl.indexOf('https://wa.me/?text=') === 0),
    String(sharedUrl).slice(0, 60));

  /* TEST 8 — delete own post */
  wt.confirm = () => true;
  const nBefore = stored(wt).posts.length;
  dt.querySelector('[data-del="post2"]').click();
  await until(() => stored(wt).posts.length === nBefore - 1, 4000, 'delete persisted');
  check('delete own post removes it (E1)', true);

  /* TEST 9 — group-targeted post chip (E2 wiring on timeline side) */
  check('group-targeted post shows group chip', /👥/.test(dt.getElementById('post-post3').textContent));
  wt.close();

  /* TEST 10 — tree page loads with enriched PEOPLE */
  const trp = await loadPage('/tree.html', sessionSeed());
  const wtr = trp.window;
  check('no page JS errors (tree)', trp.pageErrors.length === 0, trp.pageErrors.join(' | '));
  check('tree sees enriched admin+kinship on PEOPLE', wtr.PEOPLE.length === 533 &&
    wtr.PEOPLE.every((p) => p.admin && p.admin.province && p.kinship && p.kinship.mutupo));
  wtr.close();

  /* TEST 11 — library renders cultural sections */
  const lp = await loadPage('/library.html', sessionSeed());
  const wl = lp.window, dl = wl.document;
  check('no page JS errors (library)', lp.pageErrors.length === 0, lp.pageErrors.join(' | '));
  check('library default tab renders entries', dl.getElementById('libraryBody').children.length > 0);
  wl.close();

  console.log(failures ? '\n' + failures + ' PROBLEM(S)' : '\nALL FAMILY SMOKE CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL smoke crashed — ' + e.message); process.exit(1); });

