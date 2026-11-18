// Cross-origin iframe, trusted click and Escape from Playwright, exit started from the keydown handler with the
// same animation shape as exit.html. Usage: node h6.mjs <trials per variant>
import http from 'node:http';
import { webkit } from 'playwright';
const inner = `<!doctype html><body><input id=i><div id=host></div><script>
let cfg = {};
window.setCfg = c => cfg = c;
function fade(el, from, to) {
  const a = el.animate({ opacity: [from, to] }, { duration: 80, easing: 'ease-out', fill: 'both' });
  if (cfg.off !== 'none') a.startTime = document.timeline.currentTime + cfg.off;
  return a;
}
function transformLoop(el) {
  const t0 = performance.now();
  const step = t => { const p = Math.min(1, (t - t0) / 80); el.style.transform = 'translateY(' + 10 * p + 'px) scale(' + (1 - 0.5 * p) + ')'; if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
window.open_ = () => new Promise(res => {
  const el = document.createElement('div'); el.id = 'p'; el.tabIndex = 0; el.style.cssText = 'width:200px;height:80px;background:#ccc';
  host.append(el); fade(el, 0, 1); setTimeout(res, 300);
});
window.armExit = () => { window.result = new Promise(res => {
  const el = document.getElementById('p');
  el.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    queueMicrotask(() => {
      const a = fade(el, 1, 0); transformLoop(el);
      if (cfg.block) { const end = performance.now() + cfg.block; while (performance.now() < end); }
      a.onfinish = () => { a.cancel(); el.remove(); res(null); };
      setTimeout(() => { const r = { playState: a.playState, currentTime: Math.round(a.currentTime) }; el.remove(); res(r); }, 1500);
    });
  });
}); };
</script>`;
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(inner); }).listen(0, '127.0.0.1');
await new Promise(r => srv.once('listening', r));
const b = await webkit.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 720 } });
await p.setContent(`<iframe src="http://127.0.0.1:${srv.address().port}/" style="width:800px;height:400px"></iframe>`);
const frame = await (await p.waitForSelector('iframe')).contentFrame();
await frame.waitForSelector('#i');
await frame.click('#i');
const N = +process.argv[2] || 20;
for (const cfg of [{ off: -9 }, { off: 'none' }, { off: -9, block: 90 }]) {
  await frame.evaluate(c => setCfg(c), cfg);
  let stuck = 0, sample;
  for (let i = 0; i < N; i++) {
    await frame.evaluate(() => open_());
    await frame.click('#p');
    await frame.evaluate(() => armExit());
    await p.keyboard.press('Escape');
    const r = await frame.evaluate(() => window.result);
    if (r) { stuck++; sample ??= r; await frame.evaluate(() => document.getElementById('p')?.remove()); }
  }
  console.log(JSON.stringify(cfg), `stuck ${stuck}/${N}`, sample ? JSON.stringify(sample) : '');
}
await b.close(); srv.close();
