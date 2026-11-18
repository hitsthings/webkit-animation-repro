// Runs app.jsx (real React + motion) in a cross-origin iframe in Playwright's WebKit and closes the config popup
// with Escape, the way the failing test did. A trial is stuck when the popup is still there 2s after Escape; it
// then records what getAnimations() and the inline style show. Usage: node h7.mjs <trials> [parallel pages] [query, e.g. ?work=60]
import http from 'node:http';
import { execSync } from 'node:child_process';
import { webkit } from 'playwright';

// Bundled to stdout rather than a file so parallel runs don't read each other's half-written output.
const js = execSync('node_modules/.bin/esbuild app.jsx --bundle --minify --define:process.env.NODE_ENV=\\"production\\" --log-level=warning').toString();
const html = `<!doctype html><body><div id=root></div><script>${js.replace(/<\/script/g, '<\\/script')}</script>`;
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(html); }).listen(0, '127.0.0.1');
await new Promise(r => srv.once('listening', r));

const N = +process.argv[2] || 20, P = +process.argv[3] || 1, query = process.argv[4] || "";
const b = await webkit.launch();

async function worker(id) {
  const p = await b.newPage({ viewport: { width: 1600, height: 720 } });
  await p.setContent(`<iframe src="http://127.0.0.1:${srv.address().port}/${query}" style="width:800px;height:500px"></iframe>`);
  const f = await (await p.waitForSelector('iframe')).contentFrame();
  await f.waitForSelector('[aria-label=Toolbar]');
  const config = f.locator('[aria-label=Config]'), menu = f.locator('[aria-label=Menu]');
  let stuck = [], menuStuck = 0;
  for (let i = 0; i < N; i++) {
    await f.evaluate(() => openConfig());
    await config.waitFor();
    await f.click('#cfg-input');
    await f.evaluate(() => openMenu());
    await menu.waitFor();
    await p.waitForTimeout(400);
    await p.keyboard.press('Escape');
    try { await menu.waitFor({ state: 'detached', timeout: 2000 }); } catch { menuStuck++; }
    await p.waitForTimeout(300 + Math.random() * 400);
    await p.keyboard.press('Escape');
    try { await config.waitFor({ state: 'detached', timeout: 2000 }); }
    catch {
      stuck.push(await config.evaluate(el => ({
        style: el.getAttribute('style'),
        animations: el.getAnimations({ subtree: true }).map(a => ({ playState: a.playState, startTime: a.startTime, currentTime: a.currentTime && Math.round(a.currentTime) })),
      })));
      break; // the page is now in an unknown state; one sample per page is enough
    }
  }
  return { query, id, stuck: stuck.length, menuStuck, samples: stuck };
}
const results = await Promise.all(Array.from({ length: P }, (_, i) => worker(i)));
for (const r of results) console.log(JSON.stringify(r));
await b.close(); srv.close();
