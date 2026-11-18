// Cross-origin iframe never interacted with; animate with default rate; optionally click into the frame mid-animation.
import http from 'node:http';
import { webkit } from 'playwright';
const inner = `<!doctype html><body><input id=i><div id=el style="width:100px;height:60px;background:#ccc">popup</div><script>
window.trial = (dur) => new Promise(res => {
  const a = el.animate([{opacity:1},{opacity:0}], {duration:dur, fill:'both'});
  a.onfinish = () => res(null);
  window.__a = a;
  setTimeout(() => res({playState:a.playState, currentTime:Math.round(a.currentTime)}), dur+1200);
});
</script>`;
const srv = http.createServer((q, r) => { r.setHeader('content-type','text/html'); r.end(inner); }).listen(0);
const port = srv.address().port;
const b = await webkit.launch(); const p = await b.newPage();
await p.setContent(`<iframe src="http://127.0.0.1:${port}/" style="width:600px;height:400px"></iframe>`);
const frame = await (await p.waitForSelector('iframe')).contentFrame();
await frame.waitForSelector('#i');
const N = +process.argv[2] || 20;
for (const [name, dur, clickAt] of [['noclick',300,null],['click@100',300,100],['click@250',300,250],['click@50',80,50],['click@0',80,0]]) {
  let stuck = 0, sample;
  for (let i = 0; i < N; i++) {
    const tr = frame.evaluate(d => trial(d), dur);
    if (clickAt !== null) { await p.waitForTimeout(clickAt); await frame.click('#i').catch(()=>{}); }
    const r = await tr; if (r) { stuck++; sample ??= r; }
  }
  console.log(name.padEnd(11), `stuck ${stuck}/${N}`, sample ? JSON.stringify(sample) : '');
}
await b.close(); srv.close();
