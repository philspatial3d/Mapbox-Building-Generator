/* Simulate sessions against director.js with a fake figure and a wandering viewer. */
import { Director } from '/Users/mercator/Documents/Spatial/Mapbox Building Generator/haunted_ar/director.js';
import { bearingOf, angleDelta } from '/Users/mercator/Documents/Spatial/Mapbox Building Generator/haunted_ar/place.js';

function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function run(seed, minutes, memory = { visits: 1 }, verbose = false) {
  const R = mulberry32(seed);
  const log = [];
  const fig = {
    ready: true,
    root: { visible: false, position: { x: 0, z: 0 }, rotation: { y: 0 }, updateMatrixWorld() {} },
    params: {},
    place(x, z, b) { this.root.position.x = x; this.root.position.z = z; this.body = b; },
    set(c) { Object.assign(this.params, c); },
    setAppearance(i) { this.appearance = i; },
    yawToward() { return 1.9; },
    headWorld() { return { x: this.root.position.x, y: 1.8, z: this.root.position.z }; }
  };
  const d = new Director({ figure: fig, rand: mulberry32(seed * 7 + 1), memory, saveMemory() {} });
  const view = { oriented: true, heading: 0, pitch: 0, yawRate: 0, angularSpeed: 0, hfov: 50, personPoint: {},
    sees(o) { return o.visible && angleDelta(bearingOf(o.position.x, o.position.z), view.heading) < view.hfov / 2 && Math.abs(view.pitch) < 30; } };
  /* Viewer: dwell 2-12 s, then turn to a new heading at 20-120 deg/s; sometimes lowers the phone. */
  let target = 0, dwell = 0, speed = 40;
  let prevMode = d.mode, prevVisible = false, prevPos = '', inViewChanges = 0, prevParams = '';
  const dt = 1 / 30;
  for (let t = 0; t < minutes * 60; t += dt) {
    if (dwell > 0) dwell -= dt;
    else {
      const diff = ((target - view.heading + 540) % 360) - 180;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
      view.heading = (view.heading + step + 360) % 360;
      view.yawRate = step / dt; view.angularSpeed = Math.abs(view.yawRate);
      if (Math.abs(diff) < 0.5) {
        dwell = 2 + R() * 10; target = (view.heading + (R() - 0.5) * 300 + 360) % 360; speed = 20 + R() * 100;
        view.pitch = R() < 0.1 ? -60 : 0; view.yawRate = 0; view.angularSpeed = 0;
      }
    }
    /* If the figure is visible somewhere, the viewer sometimes looks at it (they noticed). */
    if (fig.root.visible && dwell > 0 && R() < 0.002) { target = bearingOf(fig.root.position.x, fig.root.position.z); dwell = 0; }
    const seenBefore = view.sees(fig.root);
    d.update(dt, view);
    const pos = `${fig.root.position.x.toFixed(1)},${fig.root.position.z.toFixed(1)}`;
    const pp = JSON.stringify([fig.params.headYaw, fig.params.jaw, fig.params.suspended]);
    const seenNow = view.sees(fig.root);
    if (seenBefore && seenNow && (pos !== prevPos || (pp !== prevParams && !d.anim))) inViewChanges++;
    if (d.mode !== prevMode || fig.root.visible !== prevVisible || pos !== prevPos || pp !== prevParams) {
      const dist = Math.hypot(fig.root.position.x, fig.root.position.z).toFixed(1);
      log.push(`${(t / 60).toFixed(1)}m mode=${d.mode} visible=${fig.root.visible} dist=${dist} headYaw=${(fig.params.headYaw ?? 0).toFixed(2)} changes=${d.changes}`);
      prevMode = d.mode; prevVisible = fig.root.visible; prevPos = pos; prevParams = pp;
    }
  }
  return { log, d, inViewChanges, memory };
}

const r = run(42, 20, { visits: 1 }, true);
console.log(r.log.slice(0, 40).join('\n'));
console.log('in-view static changes', r.inViewChanges);
let stats = { finals: 0, near: 0, glimpse: 0, firstPresence: [], changes: [], inView: 0 };
for (let s = 1; s <= 200; s++) {
  const x = run(s, 15, { visits: s % 3 === 0 ? 1 : 2 });
  if (x.memory.final) stats.finalAt = (stats.finalAt || []).concat(parseFloat(x.log.find(l => l.includes('mode=final'))));
  stats.finals += x.memory.final ? 1 : 0;
  stats.near += x.log.some(l => l.includes('mode=near')) ? 1 : 0;
  stats.glimpse += x.log.some(l => l.includes('mode=glimpse')) ? 1 : 0;
  stats.changes.push(x.d.changes);
  stats.inView += x.inViewChanges;
  const first = x.log.find(l => l.includes('mode=present'));
  stats.firstPresence.push(first ? parseFloat(first) : null);
}
const fp = stats.firstPresence.filter(v => v !== null);
console.log(`200 x 15-min sessions: final ${stats.finals}, near ${stats.near}, glimpse ${stats.glimpse}, avg changes ${(stats.changes.reduce((a, b) => a + b, 0) / 200).toFixed(1)}, first presence min ${Math.min(...fp).toFixed(1)}m median ${fp.sort((a, b) => a - b)[fp.length >> 1].toFixed(1)}m, sessions without presence ${200 - fp.length}, in-view pose/position changes ${stats.inView}, final at ${(stats.finalAt||[]).map(v=>v.toFixed(1)).join(',')}`);
