#!/usr/bin/env node
/* ============================================================
   Zero-dependency static dev server for the Roots app.
   Serves the repo root so the app can be viewed in VS Code's
   built-in Simple Browser or any browser:

     node tools/serve.js        -> http://127.0.0.1:3000/
     npm run serve

   Entry points:
     /index.html                                    Family app
     /institutional/institutional-login.html        Institutional workspace
     /admin/admin-login.html                        Administrator console
   No-cache headers keep Simple Browser from showing stale assets.
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json'
};

const server = http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  } catch (e) {
    rel = '';
  }
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 forbidden');
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 not found: /' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(file).pipe(res);
  });
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use. Start on another port instead:');
    console.error('  $env:PORT = 3010; npm run serve      (PowerShell)');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Roots dev server running:');
  console.log('  http://127.0.0.1:' + PORT + '/index.html                                (Family app)');
  console.log('  http://127.0.0.1:' + PORT + '/institutional/institutional-login.html    (Institutional workspace)');
  console.log('  http://127.0.0.1:' + PORT + '/admin/admin-login.html                     (Administrator console)');
  console.log('Press Ctrl+C to stop.');
});
