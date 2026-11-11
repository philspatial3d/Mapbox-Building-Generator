/* When, where and whether. The figure changes only while nobody is looking at it; most
   looks reveal nothing; nothing escalates on a schedule. Times are seconds of active
   camera use. Local frame: metres, x east, z south; bearings in degrees from north. */
import { bearingOf, angleDelta } from './place.js';
import * as sound from './sound.js';

const rad = d => (d * Math.PI) / 180;
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const span = (t, a, b) => ease((t - a) / (b - a));

export class Director {
  constructor({ figure, rand, memory, saveMemory, speed = 1 }) {
    this.figure = figure;
    this.rand = rand;
    this.memory = memory;
    this.saveMemory = saveMemory;
    this.speed = speed;
    this.t = 0;
    this.mode = 'quiet';
    this.surroundings = null;
    this.looked = new Float32Array(36);
    this.lastChange = -999;
    this.changes = 0;
    this.appearance = Math.floor(rand() * 3);
    /* Most sessions never get the rarer encounters at all. */
    this.session = { glimpse: rand() > 0.5, near: rand() > 0.4, breath: false };
    const returning = (memory.visits || 0) > 1;
    this.quietUntil = returning ? 60 + rand() * 90 : 80 + rand() * 90;
    this.nextAir = this.quietUntil + 120 + rand() * 200;
    this.nextCheck = 0;
    this.anim = null;
  }

  r(a, b) { return a + this.rand() * (b - a); }

  /* ---------- placement ---------- */
  spot(minD, maxD, bearingOk) {
    const s = this.surroundings;
    const found = s && s.verified ? s.pick(this.rand, minD, maxD, bearingOk) : null;
    if (found) return found;
    if (s && s.verified && s.spots.length > 20) return null;
    /* No map: stand in a direction the viewer has actually been looking at, at eye level. */
    const options = [];
    this.looked.forEach((secs, i) => { if (secs > 1.5 && bearingOk(i * 10 + 5)) options.push(i * 10 + 5); });
    if (!options.length) return null;
    const bearing = options[Math.floor(this.rand() * options.length)] + this.r(-4, 4);
    const d = this.r(minD, maxD);
    const x = Math.sin(rad(bearing)) * d;
    const z = -Math.cos(rad(bearing)) * d;
    if (s && !s.clear(x, z)) return null;
    return { x, z, d, bearing, tangent: null, kind: 'open' };
  }

  /* Body three-quarters turned away from the viewer, aligned with the wall or kerb. */
  bodyBearingFor(spot) {
    const toViewer = (spot.bearing + 180) % 360;
    const choices = [];
    if (spot.tangent !== null) {
      const t = ((spot.tangent * 180) / Math.PI + 360) % 360;
      choices.push(t, (t + 180) % 360);
    }
    choices.push((toViewer + 180 + this.r(-35, 35)) % 360);
    let best = choices[choices.length - 1];
    let bestScore = Infinity;
    choices.forEach(c => {
      const score = Math.abs(angleDelta(c, toViewer) - 125);
      if (score < bestScore) { bestScore = score; best = c; }
    });
    return best;
  }

  show(spot, opts = {}) {
    const f = this.figure;
    f.setAppearance(this.appearance);
    const body = opts.facingViewer ? (spot.bearing + 180) % 360 : (opts.bodyBearing ?? this.bodyBearingFor(spot));
    f.place(spot.x, spot.z, body);
    f.set({
      headYaw: 0, headPitch: 0.07, headRoll: 0, jaw: 0, lip: 0, muzzle: 0, suspended: 0,
      breath: 0, transform: 0, count: [0, 0, 0], eyeTarget: null, ...(opts.pose || {})
    });
    f.root.visible = true;
  }

  hide() {
    this.figure.root.visible = false;
    this.anim = null;
  }

  shiftOrigin(dx, dz) {
    if (this.presence) {
      this.presence.x -= dx; this.presence.z -= dz;
      if (this.presence.home) { this.presence.home.x -= dx; this.presence.home.z -= dz; }
    }
    const root = this.figure.root;
    root.position.x -= dx; root.position.z -= dz;
    root.updateMatrixWorld(true);
  }

  /* ---------- the standing man ---------- */
  beginPresence(view) {
    const fov = view.hfov / 2 + 12;
    const s = this.spot(20, 38, b => angleDelta(b, view.heading) > fov + 25 && angleDelta(b, view.heading) < 165);
    if (!s) return false;
    const body = this.bodyBearingFor(s);
    this.presence = { x: s.x, z: s.z, body, home: { x: s.x, z: s.z }, turned: false, obsRun: 0, obsSinceChange: 0, unobs: 0, noticed: false, rolled: false, born: this.t, count: false };
    this.show(s, { bodyBearing: body });
    this.mode = 'present';
    return true;
  }

  movePresence(minD, maxD, aroundBearing, spreadDeg) {
    const p = this.presence;
    const s = this.spot(minD, maxD, b => angleDelta(b, aroundBearing) <= spreadDeg);
    if (!s) return false;
    p.x = s.x; p.z = s.z;
    this.figure.place(s.x, s.z, p.body);
    if (p.turned) this.figure.set({ headYaw: this.figure.yawToward(0, 0) });
    return true;
  }

  change() {
    const p = this.presence;
    const d = Math.hypot(p.x, p.z);
    const bearing = bearingOf(p.x, p.z);
    const options = this.changes === 0
      ? [['turn', 0.8], ['closer', 0.2]]
      : [
          ['turn', p.turned ? 0 : 0.4], ['closer', d > 13 ? 0.3 : 0], ['farther', d < 40 ? 0.12 : 0],
          ['home', Math.hypot(p.x - p.home.x, p.z - p.home.z) > 3 ? 0.12 : 0],
          ['vanish', 0.14 + 0.06 * this.changes], ['away', p.turned ? 0.08 : 0]
        ];
    const total = options.reduce((s, o) => s + o[1], 0);
    let roll = this.rand() * total;
    const pick = (options.find(o => (roll -= o[1]) < 0) || options[0])[0];
    let done = true;
    if (pick === 'turn') {
      p.turned = true;
      this.figure.set({ headYaw: this.figure.yawToward(0, 0) });
    } else if (pick === 'closer') {
      const target = Math.max(11, d - this.r(6, 11));
      done = this.movePresence(target - 2.5, target + 2.5, bearing, 16);
    } else if (pick === 'farther') {
      const target = d + this.r(5, 10);
      done = this.movePresence(target - 3, target + 3, bearing, 14);
    } else if (pick === 'home') {
      p.x = p.home.x; p.z = p.home.z;
      this.figure.place(p.x, p.z, p.body);
      if (p.turned) this.figure.set({ headYaw: this.figure.yawToward(0, 0) });
    } else if (pick === 'away') {
      p.turned = false;
      this.figure.set({ headYaw: 0 });
    } else if (pick === 'vanish') {
      this.vanish();
    }
    if (done) {
      this.changes += 1;
      this.lastChange = this.t;
      if (this.presence) this.presence.obsSinceChange = 0;
    }
  }

  vanish(returnChance = 0.55) {
    this.hide();
    this.presence = null;
    this.mode = 'absent';
    this.absentSince = this.t;
    this.returnAt = this.rand() < returnChance ? this.t + this.r(70, 240) : Infinity;
    this.appearance += 1;
  }

  /* ---------- per frame ---------- */
  update(dt, view) {
    if (!this.figure.ready || !view.oriented) return;
    const t = (this.t += dt * this.speed);
    if (Math.abs(view.pitch) < 25) this.looked[Math.floor(((view.heading % 360) + 360) % 360 / 10)] += dt;

    this.updateSound(view);
    if (this.anim) this.anim(dt * this.speed, view);

    if (this.mode === 'quiet' && t >= this.quietUntil) {
      if (!this.beginPresence(view)) this.quietUntil = t + this.r(10, 30);
    } else if (this.mode === 'present') {
      this.updatePresence(dt * this.speed, view);
    } else if (this.mode === 'absent') {
      if (t >= this.returnAt && this.beginPresence(view)) {
        this.presence.turned = false;
      }
      this.maybeFinal(view);
    }
    if (['quiet', 'absent'].includes(this.mode) && t > this.quietUntil + 60) this.maybeGlimpse(view);
  }

  updatePresence(dt, view) {
    const p = this.presence;
    const seen = view.sees(this.figure.root);
    const d = Math.hypot(p.x, p.z);
    if (seen) {
      p.obsRun += dt; p.obsSinceChange += dt; p.unobs = 0; p.rolled = false;
      if (p.obsRun > 0.5) p.noticed = true;
      this.maybeMicro(p, d, view);
    } else {
      p.unobs += dt; p.obsRun = 0;
    }
    if (!seen && p.noticed && p.unobs >= 2.2 && p.obsSinceChange >= 2.5 && !p.rolled && this.t - this.lastChange >= 18 && !this.anim) {
      p.rolled = true;
      if (this.rand() < (this.changes === 0 ? 0.6 : 0.3)) this.change();
      return;
    }
    /* Never found: after a long while, stand somewhere the viewer actually looks. */
    if (!p.noticed && this.t - p.born > 150 && !seen) {
      p.born = this.t;
      const fov = view.hfov / 2 + 12;
      const s = this.spot(20, 36, b => angleDelta(b, view.heading) > fov + 20 && this.looked[Math.floor(b / 10) % 36] > 4);
      if (s) { p.x = s.x; p.z = s.z; p.home = { x: s.x, z: s.z }; p.body = this.bodyBearingFor(s); this.figure.place(s.x, s.z, p.body); }
    }
    if (!seen && p.unobs > 3 && this.t >= this.nextCheck) {
      this.nextCheck = this.t + 6;
      this.maybeNear(view);
    }
  }

  /* Counting fingers; once, a breath. Only close enough to see, only while watched. */
  maybeMicro(p, d, view) {
    if (this.anim) return;
    if (!p.count && d < 16 && p.obsRun > 2.5) {
      p.count = true;
      if (this.rand() < 0.5) {
        let k = 0;
        this.anim = step => {
          k += step;
          const beat = (k % 3.2);
          const c = [0, 1, 2].map(i => Math.max(0, 1 - Math.abs(beat - 0.45 - i * 0.55) / 0.3));
          this.figure.set({ count: c });
          if (k > 6.4) { this.figure.set({ count: [0, 0, 0] }); this.anim = null; }
        };
      }
      return;
    }
    if (!this.session.breath && d < 25 && p.obsRun > 4) {
      this.session.breath = true;
      if (this.rand() < 0.4) {
        let k = 0;
        let exhaled = false;
        this.anim = step => {
          k += step;
          const v = k < 5 ? span(k, 0, 5) : k < 15 ? 1 : 1 - span(k, 15, 19);
          this.figure.set({ breath: v });
          if (k > 15 && !exhaled) { exhaled = true; if (d < 14) sound.exhale(this.figure.headWorld(), 4); }
          if (k > 19) { this.figure.set({ breath: 0 }); this.anim = null; }
        };
      }
    }
  }

  /* Half a second at the edge of a fast pan. Once a session at most. */
  maybeGlimpse(view) {
    if (this.session.glimpse || view.angularSpeed < 70 || Math.abs(view.pitch) > 25) return;
    if (this.t < (this.nextGlimpseCheck || 0)) return;
    this.nextGlimpseCheck = this.t + 6;
    if (this.rand() > 0.12) return;
    const lead = view.heading + Math.sign(view.yawRate || 1) * (view.hfov / 2 + 7);
    const s = this.spot(9, 14, b => angleDelta(b, lead) < 9);
    if (!s) return;
    this.session.glimpse = true;
    this.memory.glimpses = (this.memory.glimpses || 0) + 1;
    this.saveMemory();
    const previous = this.mode;
    this.show(s, { facingViewer: true, pose: { headRoll: 0.28, headPitch: 0.1, jaw: 0.1 } });
    this.mode = 'glimpse';
    let seenFor = 0;
    let life = 0;
    this.anim = (step, v) => {
      life += step;
      if (v.sees(this.figure.root)) seenFor += step;
      if (seenFor > 0.35 || life > 1.6) {
        this.hide();
        this.mode = previous === 'quiet' ? 'quiet' : 'absent';
      }
    };
  }

  /* Much closer, by a garden wall, head at an angle. Gone on the next look. */
  maybeNear(view) {
    if (this.session.near || this.t < 420 || this.changes < 2 || this.anim) return;
    if (this.rand() > 0.1) return;
    const side = this.rand() < 0.5 ? -1 : 1;
    const centre = view.heading + side * (view.hfov / 2 + this.r(15, 40));
    const s = this.spot(6, 8.5, b => angleDelta(b, centre) < 14);
    if (!s) return;
    this.session.near = true;
    this.presence = null;
    this.show(s, { facingViewer: true, pose: { headRoll: 0.32, headPitch: 0.12, lip: 0.3, jaw: 0.14 } });
    this.mode = 'near';
    const transforms = this.rand() < 0.18;
    let seenFor = 0;
    let unseen = 0;
    let life = 0;
    let clicked = false;
    this.anim = (step, v) => {
      life += step;
      if (v.sees(this.figure.root)) {
        seenFor += step; unseen = 0;
        if (transforms) this.figure.set({ transform: seenFor > 0.55 && seenFor < 0.81 ? 1 : 0 });
        if (!clicked && seenFor > 1.8) { clicked = true; if (this.rand() < 0.4) sound.teeth(this.figure.headWorld()); }
      } else unseen += step;
      if ((seenFor > 0.5 && unseen > 0.25) || (seenFor === 0 && life > 30)) {
        this.anim = null;
        this.vanish(0.4);
      }
    };
  }

  /* The last encounter. Five and a half metres. Never on a first visit; once on this
     device, ever. */
  maybeFinal(view) {
    if (this.memory.final || (this.memory.visits || 0) < 2 || this.t < 720 || this.changes < 4 || this.anim) return;
    if (this.t - this.absentSince < 60 || this.t < (this.nextFinalCheck || 0)) return;
    this.nextFinalCheck = this.t + 15;
    if (this.rand() > 0.04) return;
    const side = this.rand() < 0.5 ? -1 : 1;
    const centre = view.heading + side * (view.hfov / 2 + this.r(10, 25));
    const s = this.spot(5, 6.5, b => angleDelta(b, centre) < 12);
    if (!s) return;
    this.show(s, { facingViewer: true, pose: { suspended: 1 } });
    this.mode = 'final';
    let seen = 0;
    let unseen = 0;
    let life = 0;
    let clicked = false;
    this.anim = (step, v) => {
      life += step;
      if (v.sees(this.figure.root)) {
        seen += step; unseen = 0;
        const close = span(seen, 9.4, 10.4);
        this.figure.set({
          headPitch: 0.07 + 0.24 * span(seen, 3.5, 9.5),
          headRoll: 0.14 * span(seen, 3.5, 9.5),
          lip: 0.5 * span(seen, 6.5, 7.5) * (1 - close),
          jaw: (0.22 * span(seen, 7.5, 9) + (seen > 8.6 && seen < 8.9 ? 0.05 : 0)) * (1 - close),
          eyeTarget: seen > 10.6 ? v.personPoint : null
        });
        if (!clicked && seen > 10.2) { clicked = true; sound.teeth(this.figure.headWorld()); }
      } else unseen += step;
      if ((seen > 11 && unseen > 0.2) || (seen > 24) || (seen === 0 && life > 30)) {
        const witnessed = seen > 11;
        this.anim = null;
        this.hide();
        if (witnessed) {
          this.memory.final = true;
          this.saveMemory();
          this.mode = 'done';
        } else {
          this.vanish(0.5);
        }
      }
    };
  }

  /* A thin movement of air, close by, unrelated to anything the camera shows. */
  updateSound(view) {
    if (this.t < this.nextAir || !sound.audioReady()) return;
    if (this.t - this.lastChange < 12 || ['near', 'final', 'glimpse'].includes(this.mode)) {
      this.nextAir = this.t + 20;
      return;
    }
    this.nextAir = this.t + this.r(240, 480);
    const b = this.presence ? bearingOf(this.presence.x, this.presence.z) : this.r(0, 360);
    sound.airPass({ x: Math.sin(rad(b)) * 3, y: 1.5, z: -Math.cos(rad(b)) * 3 });
  }

  /* Debug only: put the figure in front of the camera for compositing checks. */
  debugPlace(view, { dist = 25, offset = 0, pose = {}, facingViewer = false, turned = false } = {}) {
    const bearing = view.heading + offset;
    const x = Math.sin(rad(bearing)) * dist;
    const z = -Math.cos(rad(bearing)) * dist;
    const spot = { x, z, d: dist, bearing, tangent: rad(view.heading + 90), kind: 'debug' };
    this.show(spot, { facingViewer, pose });
    if (turned) this.figure.set({ headYaw: this.figure.yawToward(0, 0) });
    this.mode = 'debug';
  }
}
