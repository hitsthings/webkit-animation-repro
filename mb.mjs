import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const page = fs.readFileSync(process.argv[2], 'utf8');
const srv = http.createServer((q, r) => {
  if (q.method === 'POST') { let s=''; q.on('data', c => s += c); q.on('end', () => { console.log(s); r.end(); if (s.includes('"done"')) finish(); }); return; }
  r.setHeader('content-type', 'text/html'); r.end(page);
}).listen(0, '127.0.0.1');
await new Promise(r => srv.once('listening', r));
const url = `http://127.0.0.1:${srv.address().port}/${process.argv[4] || ''}`;
const mb = spawn(process.env.HOME + '/.cache/ms-playwright/webkit-2311/minibrowser-wpe/MiniBrowser', ['--headless', ...(process.argv[3] ? [`--features=${process.argv[3]}`] : []), url], { stdio: ['ignore', 'ignore', 'ignore'] });
const t = setTimeout(() => { console.log('timeout'); finish(); }, +process.env.TMO || 120000);
function finish() { clearTimeout(t); mb.kill(); srv.close(); }
