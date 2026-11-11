import * as THREE from "https://esm.sh/three@0.185.1";
import { insidePolygon } from "./state.js";
import { createFixture } from "./furniture.js";
import {
  artFrame, roundMirror, floatingShelf, mediaWall, console_, dresser, feltPanel, slatWall,
  wallScreen, whiteboard, towelRail, stool, upperCabinets, planter, tableLamp, books, bowl, rug,
  makeSofa, floorLamp, coffeeStation,
  vase, laptop, mug, smallPlant, kit, downlight, linearLight, raft,
} from "./decor.js";
/** Room styling: reads a room's real wall faces, windows, doors and furniture,
 * then composes it the way an interior designer would stage a show suite.
 * Everything is in building-local metres (x, z); nothing is random per frame:
 * a room id always produces the same composition. */

const TALL = new Set(["wardrobe", "shelving", "fridge", "storage", "counter", "reception"]);
const RESIDENTIAL = /living|bedroom|studio|kitchen|hall|bath|wc|ensuite|dressing|storage|utility/;
const OFFICE = /workspace|meeting|focus|collab|pantry|print|reception/;

function hash(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}
const bboxOf = (ring) => {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of ring) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return { minX, minZ, maxX, maxZ };
};
/** Point-in-wall test with a bounding-box prefilter (walls are a few large polygons). */
export function wallIndex(polygons) {
  const list = polygons.map((p) => ({ p, b: bboxOf(p[0]) }));
  return (x, z) => list.some(({ p, b }) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && insidePolygon(x, z, p));
}

/** Local window records from plan.windows rings: interior face line, inward normal, width. */
export function windowRecords(rings) {
  return rings
    .map((ring) => {
      const [a, b, c] = ring;
      if (!c) return null;
      const t = [b[0] - a[0], b[1] - a[1]],
        width = Math.hypot(...t),
        inward = [c[0] - b[0], c[1] - b[1]],
        th = Math.hypot(...inward);
      if (width < 0.5 || th < 0.01) return null;
      const n = [inward[0] / th, inward[1] / th];
      return {
        a: [a[0] + n[0] * th, a[1] + n[1] * th],
        b: [b[0] + n[0] * th, b[1] + n[1] * th],
        t: [t[0] / width, t[1] / width],
        n, width, th,
        center: [(a[0] + b[0]) / 2 + n[0] * th, (a[1] + b[1]) / 2 + n[1] * th],
      };
    })
    .filter(Boolean);
}

/** Wall runs along a room's outline, split into wall / window / open intervals,
 * with the measured offset of the real wall face from the room edge. */
function wallRuns(polygons, inWall, windows) {
  const runs = [];
  for (const rings of polygons) {
    const ring = rings[0];
    for (let i = 0; i < ring.length - 1; i++) {
      const p = ring[i], q = ring[i + 1],
        len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len < 0.7) continue;
      const t = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
      let n = [-t[1], t[0]];
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (!insidePolygon(mid[0] + n[0] * 0.15, mid[1] + n[1] * 0.15, rings)) n = [-n[0], -n[1]];
      // Face offset: walk from inside the room outward until the wall begins.
      const faceAt = (s) => {
        const x = p[0] + t[0] * s, z = p[1] + t[1] * s;
        for (let o = 0.3; o > -0.4; o -= 0.02)
          if (inWall(x + n[0] * o, z + n[1] * o)) {
            // Refine to 3 mm so wall-hung pieces sit on the plaster, not in it.
            let f = o + 0.02;
            while (f > o && !inWall(x + n[0] * f, z + n[1] * f)) f -= 0.003;
            return f + 0.004;
          }
        return null;
      };
      const faces = [0.3, 0.5, 0.7].map((f) => faceAt(len * f)).filter((v) => v !== null);
      const face = faces.length ? faces.sort((a, b) => a - b)[Math.floor(faces.length / 2)] : 0;
      const samples = [];
      for (let s = 0.05; s < len; s += 0.1) {
        const x = p[0] + t[0] * s, z = p[1] + t[1] * s;
        const win = windows.find((w) => {
          if (Math.abs(w.t[0] * t[0] + w.t[1] * t[1]) < 0.9) return false;
          const dx = x - w.center[0], dz = z - w.center[1];
          return Math.abs(dx * w.n[0] + dz * w.n[1]) < 0.6 && Math.abs(dx * w.t[0] + dz * w.t[1]) < w.width / 2;
        });
        samples.push(win ? "window" : inWall(x + n[0] * (face - 0.06), z + n[1] * (face - 0.06)) ? "wall" : "open");
      }
      const intervals = [];
      samples.forEach((state, j) => {
        const s0 = j * 0.1, last = intervals[intervals.length - 1];
        if (last && last.state === state) last.s1 = s0 + 0.1;
        else intervals.push({ state, s0, s1: Math.min(len, s0 + 0.1) });
      });
      runs.push({ p, t, n, len, face, intervals, occupied: [] });
    }
  }
  return runs;
}
const point = (run, s, out = 0) => [
  run.p[0] + run.t[0] * s + run.n[0] * (run.face + out),
  run.p[1] + run.t[1] * s + run.n[1] * (run.face + out),
];
const project = (run, x, z) => (x - run.p[0]) * run.t[0] + (z - run.p[1]) * run.t[1];
const distance = (run, x, z) => (x - run.p[0]) * run.n[0] + (z - run.p[1]) * run.n[1] - run.face;

/** Longest stretch of solid wall of at least `need` metres free of the given occupancy. */
function freeSpan(run, need, { tall = true, low = false, margin = 0.15, near = null } = {}) {
  let best = null;
  for (const iv of run.intervals) {
    if (iv.state !== "wall") continue;
    const blocks = run.occupied
      .filter((o) => (tall && o.tall) || (low && !o.tall))
      .map((o) => [o.s0, o.s1])
      .sort((a, b) => a[0] - b[0]);
    let cursor = iv.s0 + margin;
    const gaps = [];
    for (const [a, b] of blocks) {
      if (b <= cursor || a >= iv.s1 - margin) continue;
      gaps.push([cursor, Math.min(a, iv.s1 - margin)]);
      cursor = Math.max(cursor, b);
    }
    gaps.push([cursor, iv.s1 - margin]);
    for (const [a, b] of gaps) {
      if (b - a < need) continue;
      const centre = near === null ? (a + b) / 2 : THREE.MathUtils.clamp(near, a + need / 2, b - need / 2);
      const score = near === null ? b - a : -Math.abs(centre - near);
      if (!best || score > best.score) best = { s: centre, room: b - a, score };
    }
  }
  return best;
}

export function dressRoom({ id, type, polygons, height, inWall, windows, furniture, doors, m, low = false, style }) {
  const group = new THREE.Group(),
    assets = [],
    obstacles = [],
    seed = hash(id),
    r = (() => { let s = Math.floor(seed * 1e6) || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const runs = wallRuns(polygons, inWall, windows);
  const items = furniture.map((f) => ({ ...f, tall: TALL.has(f.kind) }));
  for (const run of runs)
    for (const f of items) {
      const ds = f.ring.map(([x, z]) => distance(run, x, z));
      if (Math.min(...ds) > 0.9 || Math.max(...ds) < -0.2) continue;
      const ss = f.ring.map(([x, z]) => project(run, x, z));
      const s0 = Math.min(...ss), s1 = Math.max(...ss);
      if (s1 < 0 || s0 > run.len) continue;
      run.occupied.push({ s0, s1, tall: f.tall, kind: f.kind });
    }
  const inRoom = (x, z) => polygons.some((p) => insidePolygon(x, z, p));
  const clearFloor = (ring) => {
    // A 4x4 sample grid catches cross-shaped overlaps that corner tests miss.
    const pts = [];
    for (let i = 0; i <= 3; i++)
      for (let j = 0; j <= 3; j++) {
        const u = i / 3, v = j / 3;
        pts.push([
          ring[0][0] * (1 - u) * (1 - v) + ring[1][0] * u * (1 - v) + ring[2][0] * u * v + ring[3][0] * (1 - u) * v,
          ring[0][1] * (1 - u) * (1 - v) + ring[1][1] * u * (1 - v) + ring[2][1] * u * v + ring[3][1] * (1 - u) * v,
        ]);
      }
    if (!pts.every(([x, z]) => inRoom(x, z) && !inWall(x, z))) return false;
    if (doors.some((d) => pts.some(([x, z]) => Math.hypot(x - d.x, z - d.z) < d.r))) return false;
    const box = bboxOf(ring);
    return !items.concat(obstacles.map((o) => ({ ring: o }))).some((f) => {
      const b = bboxOf(f.ring);
      if (b.maxX < box.minX || b.minX > box.maxX || b.maxZ < box.minZ || b.minZ > box.maxZ) return false;
      return pts.some(([x, z]) => insidePolygon(x, z, [f.ring])) || f.ring.some(([x, z]) => insidePolygon(x, z, [ring]));
    });
  };
  const footprint = (run, s, w, d, out = 0) => {
    const [x0, z0] = point(run, s - w / 2, out), [x1, z1] = point(run, s + w / 2, out);
    return [[x0, z0], [x1, z1], [x1 + run.n[0] * d, z1 + run.n[1] * d], [x0 + run.n[0] * d, z0 + run.n[1] * d], [x0, z0]];
  };
  const mount = (object, run, s, y = 0, out = 0.004, occupy = null) => {
    const [x, z] = point(run, s, out);
    object.position.set(x, y, z);
    object.rotation.y = Math.atan2(run.n[0], run.n[1]);
    group.add(object);
    if (occupy) run.occupied.push({ s0: s - occupy.w / 2, s1: s + occupy.w / 2, tall: occupy.tall });
    return object;
  };
  /** Free-standing piece against a wall; returns false if the floor is not clear. */
  const floorPiece = (make, run, s, w, d, tall = false) => {
    const ring = footprint(run, s, w, d, 0.02);
    if (!clearFloor(ring)) return false;
    mount(make(), run, s, 0, 0.01, { w, tall });
    obstacles.push(ring);
    return true;
  };
  const art = (run, s, w, h, y, frame = "dark", out = 0.006) => mount(artFrame(w, h, m, Math.floor(r() * 8), frame), run, s, y, out, { w, tall: true });
  const longAxis = (f) => (f.w >= f.d ? [Math.cos(f.angle), -Math.sin(f.angle)] : [Math.sin(f.angle), Math.cos(f.angle)]);
  /** The wall a piece backs onto: parallel to `axis`'s normal and nearest its centre. */
  const backRun = (f, axisIsNormal = true) => {
    const axis = longAxis(f);
    return runs
      .filter((run) => {
        const dot = Math.abs(run.n[0] * axis[0] + run.n[1] * axis[1]);
        const s = project(run, f.cx, f.cz);
        return (axisIsNormal ? dot > 0.85 : dot < 0.4) && s > 0 && s < run.len;
      })
      .sort((a, b) => Math.abs(distance(a, f.cx, f.cz)) - Math.abs(distance(b, f.cx, f.cz)))[0];
  };
  const solid = (run) => run.intervals.filter((iv) => iv.state === "wall").reduce((n, iv) => n + iv.s1 - iv.s0, 0);
  const byLength = [...runs].sort((a, b) => solid(b) - solid(a));
  const top = Math.min(height - 0.05, 2.75);
  const artY = (h) => Math.min(top - 0.25 - h / 2, 1.55);
  const corners = (count, make, kind = "plant") => {
    let placed = 0;
    for (const run of byLength) {
      for (const s of [0.45, run.len - 0.45]) {
        if (placed >= count) return;
        const iv = run.intervals.find((v) => v.state !== "open" && s >= v.s0 && s <= v.s1);
        if (!iv) continue;
        const ring = footprint(run, s, 0.55, 0.55, 0.05);
        if (!clearFloor(ring)) continue;
        const [x, z] = point(run, s, 0.33);
        if (make) {
          const obj = make();
          obj.position.set(x, 0, z);
          obj.rotation.y = r() * Math.PI * 2;
          group.add(obj);
        } else assets.push({ kind, x, z, rotation: r() * Math.PI * 2, scale: 1.25 });
        obstacles.push(ring);
        placed++;
      }
    }
  };
  const of = (kind) => items.filter((f) => f.kind === kind);

  if (/bedroom/.test(type)) {
    const bed = of("bed")[0];
    const head = bed && backRun(bed);
    if (head) {
      const s = project(head, bed.cx, bed.cz),
        bw = Math.min(bed.w, bed.d);
      const span = freeSpan(head, Math.min(bw * 0.8, 1.4), { tall: true, near: s, margin: 0.05 });
      if (span) {
        const w = Math.min(span.room, bw + 1.5);
        const panel = new THREE.Group();
        kit(panel, m, low).box(0, (top + 0.1) / 2, 0.006, w, top - 0.1, 0.012, m.accent, 0.002);
        mount(panel, head, span.s, 0, 0.002);
        if (bw > 1.3 && r() > 0.45) art(head, span.s, Math.min(1.25, bw * 0.75), 0.62, Math.max(1.62, artY(0.62)), "dark", 0.02);
        else for (const o of [-0.34, 0.34]) art(head, span.s + o, 0.5, 0.66, Math.max(1.66, artY(0.66)), "wood", 0.02);
      }
    }
    for (const n of of("nightstand")) {
      group.add(tableLamp(m, n.cx, 0.545, n.cz, 0.85));
      group.add(books(m, 0.545, n.cx + 0.08, n.cz + 0.06, 0.2, 2, seed * 7 + n.cx));
    }
    for (const run of byLength) {
      if (run === head) continue;
      const span = freeSpan(run, 1.3, { tall: true, low: true });
      if (span && floorPiece(() => dresser(1.15, m), run, span.s, 1.15, 0.46)) {
        if (r() > 0.5) mount(roundMirror(0.38, m), run, span.s, 1.5, 0.004, { w: 0.8, tall: true });
        else art(run, span.s, 0.7, 0.5, 1.45, "brass");
        break;
      }
    }
    corners(1);
  } else if (/living|studio|collab/.test(type)) {
    const sofa = of("sofa")[0];
    const back = sofa && backRun(sofa, false);
    if (back) {
      const s = project(back, sofa.cx, sofa.cz),
        sw = Math.max(sofa.w, sofa.d);
      const span = freeSpan(back, Math.min(sw * 0.8, 1.8), { tall: true, near: s });
      if (span) {
        if (r() > 0.5) art(back, span.s, Math.min(1.5, sw * 0.65), 0.8, artY(0.8));
        else for (const o of [-0.62, 0, 0.62]) art(back, span.s + o, 0.5, 0.62, artY(0.62), o ? "wood" : "dark");
      }
    }
    const facing = back && runs.filter((run) => run.n[0] * back.n[0] + run.n[1] * back.n[1] < -0.85).sort((a, b) => solid(b) - solid(a))[0];
    let media = false;
    if (facing) {
      const span = freeSpan(facing, 1.7, { tall: true, low: true });
      if (span) {
        const w = Math.min(2.2, span.room - 0.1);
        media = floorPiece(() => mediaWall(w, m, RESIDENTIAL.test(type), seed * 11), facing, span.s, w, 0.44);
        if (media && !RESIDENTIAL.test(type)) art(facing, span.s, Math.min(1.2, w * 0.6), 0.75, artY(0.75));
      }
    }
    let shelves = 0;
    for (const run of byLength) {
      if (run === back || shelves) continue;
      const span = freeSpan(run, 1.4, { tall: true });
      if (!span) continue;
      mount(floatingShelf(1.1, m, seed * 5), run, span.s, 1.25, 0.004, { w: 1.2, tall: true });
      mount(floatingShelf(1.1, m, seed * 9), run, span.s, 1.68);
      shelves++;
    }
    corners(media ? 2 : 1);
  } else if (/kitchen/.test(type) && !of("counter").length) {
    const run = byLength.find((x) => freeSpan(x, 1.4, { tall: true, low: true, margin: 0.05 }));
    if (run) {
      const span = freeSpan(run, 1.4, { tall: true, low: true, margin: 0.05 });
      const L = Math.min(3.6, span.room - 0.05),
        fridge = L > 2.8;
      const counterW = fridge ? L - 0.72 : L,
        cs = fridge ? span.s + 0.36 : span.s;
      if (floorPiece(() => {
        const g = new THREE.Group();
        const counter = createFixture("counter", counterW, 0.62, m, low, [
          { kind: "sink", x: -counterW * 0.22, z: 0.02, width: Math.min(0.55, counterW * 0.3), depth: 0.42 },
          { kind: "hob", x: counterW * 0.24, z: 0.02, width: Math.min(0.6, counterW * 0.32), depth: 0.5 },
        ]);
        counter.position.z = 0.31;
        const sink = createFixture("sink", 0.55, 0.42, m, low);
        sink.position.set(-counterW * 0.22, 0, 0.33);
        g.add(counter, sink);
        g.add(bowl(m, counterW * 0.42, 0.895, 0.36, 0.13));
        g.add(smallPlant(m, 0.32).translateX(-counterW * 0.45).translateY(0.895).translateZ(0.2));
        const board = new THREE.Group();
        kit(board, m, low).box(0, 0.905, 0.15, 0.42, 0.02, 0.28, m.wood, 0.006);
        board.position.x = -counterW * 0.02;
        g.add(board);
        return g;
      }, run, cs, counterW, 0.64)) {
        const splash = new THREE.Group();
        kit(splash, m, low).box(0, 1.17, 0.005, counterW, 0.55, 0.01, m.walltile, 0.002);
        mount(splash, run, cs, 0, 0.002);
        if (!run.intervals.some((iv) => iv.state === "window" && iv.s1 > cs - counterW / 2 && iv.s0 < cs + counterW / 2))
          mount(upperCabinets(counterW, m), run, cs, 1.45);
        if (fridge) {
          const fs = span.s - L / 2 + 0.36;
          if (floorPiece(() => { const f = createFixture("fridge", 0.7, 0.66, m, low); f.position.z = 0.33; return f; }, run, fs, 0.7, 0.66, true)) {}
        }
        // Island with stools when the room is deep enough to keep 1 m walkways.
        const mid = point(run, cs, 0);
        let depth = 0;
        while (depth < 8 && inRoom(mid[0] + run.n[0] * (depth + 0.1), mid[1] + run.n[1] * (depth + 0.1))) depth += 0.1;
        if (depth > 3.5) {
          const iw = Math.min(2.0, counterW * 0.75);
          const ring = footprint(run, cs, iw, 0.95, 1.7);
          if (clearFloor(ring)) {
            const [x, z] = point(run, cs, 1.7 + 0.475);
            const island = createFixture("counter", iw, 0.95, m, low, []);
            island.position.set(x, 0, z);
            island.rotation.y = Math.atan2(run.n[0], run.n[1]);
            group.add(island);
            obstacles.push(ring);
            const n = Math.max(2, Math.floor(iw / 0.62));
            for (let i = 0; i < n; i++) {
              const [sx, sz] = point(run, cs - iw / 2 + (iw * (i + 0.5)) / n, 1.7 + 0.95 + 0.3);
              const st = stool(m, 0.65);
              st.position.set(sx, 0, sz);
              group.add(st);
            }
            group.add(bowl(m, x, 0.895, z, 0.16));
            for (const o of [-iw * 0.25, iw * 0.25]) {
              const [px, pz] = point(run, cs + o, 1.7 + 0.475);
              assets.push({ kind: "pendant", x: px, z: pz, rotation: 0, scale: 1 });
            }
          }
        }
      }
    }
    corners(1);
  } else if (/bath|ensuite|wc/.test(type)) {
    if (!of("basin").length && !of("wc").length) {
      // The planner left this wet room empty: vanity, WC and a shower or bath.
      const fit = (kind, w, d, need = w + 0.1) => {
        for (const run of byLength) {
          const span = freeSpan(run, need, { tall: true, low: true, margin: 0.05 });
          if (!span) continue;
          if (floorPiece(() => {
            const g = createFixture(kind, w, d, m, low);
            g.position.z = d / 2;
            return g;
          }, run, span.s, w, d, kind !== "wc")) {
            if (kind === "basin") items.push({ kind: "basin", ring: [[0, 0]], cx: point(run, span.s, d / 2)[0], cz: point(run, span.s, d / 2)[1], w, d, angle: 0 });
            return true;
          }
        }
        return false;
      };
      fit("basin", 0.75, 0.48);
      fit("wc", 0.4, 0.68, 0.8);
      if (!fit("bath_tub", 1.7, 0.75)) fit("shower", 0.95, 0.95);
    }
    for (const run of byLength) {
      const span = freeSpan(run, 0.75, { tall: true, low: true });
      if (span) {
        mount(towelRail(m), run, span.s, 1.15);
        break;
      }
    }
    for (const b of of("basin")) group.add(vase(m, b.cx, 0.745, b.cz, 0.12, true, seed));
  } else if (/hall/.test(type)) {
    for (const run of byLength) {
      const span = freeSpan(run, 1.1, { tall: true, low: true });
      if (!span) continue;
      const w = Math.min(1.3, span.room - 0.1);
      if (floorPiece(() => console_(w, m, seed * 3), run, span.s, w, 0.36, true)) {
        mount(roundMirror(0.4, m), run, span.s, 1.5, 0.004, { w: 0.9, tall: true });
        break;
      }
    }
    const other = byLength.find((run) => freeSpan(run, 0.9, { tall: true }));
    if (other) {
      const span = freeSpan(other, 0.9, { tall: true });
      art(other, span.s, 0.6, 0.8, artY(0.8), "wood");
    }
  } else if (/workspace/.test(type)) {
    let placed = 0;
    for (const run of byLength) {
      if (placed >= 4) break;
      const span = freeSpan(run, 2.6, { tall: true });
      if (!span) continue;
      const kind = placed % 3;
      if (kind === 0) mount(feltPanel(Math.min(3.2, span.room - 0.4), 1.2, m), run, span.s, 1.45, 0.004, { w: 3.2, tall: true });
      else if (kind === 1) mount(whiteboard(1.8, 1.0, m), run, span.s, 1.4, 0.004, { w: 1.8, tall: true });
      else art(run, span.s, 1.2, 0.85, artY(0.85));
      placed++;
    }
    corners(4, () => planter(m, 1.3 + r() * 0.5));
  } else if (/meeting/.test(type)) {
    const table = of("table")[0];
    let end = null;
    if (table) {
      // Either end of the table can take the screen; prefer the one with wall.
      const axis = longAxis(table);
      const ends = runs
        .filter((run) => Math.abs(run.n[0] * axis[0] + run.n[1] * axis[1]) > 0.85)
        .sort((a, b) => Math.abs(distance(a, table.cx, table.cz)) - Math.abs(distance(b, table.cx, table.cz)));
      for (const run of ends) {
        // The screen hangs above the table, so only tall pieces block it.
        const span = freeSpan(run, 1.3, { tall: true, near: project(run, table.cx, table.cz) });
        if (!span) continue;
        end = run;
        const w = Math.min(1.65, span.room * 0.8);
        mount(wallScreen(w, m), run, span.s, 1.45, 0.004, { w, tall: true });
        floorPiece(() => mediaWall(Math.min(1.6, span.room - 0.1), m, false, seed), run, span.s, Math.min(1.6, span.room - 0.1), 0.44);
        break;
      }
    }
    const side = byLength.find((run) => run !== end && freeSpan(run, 1.6, { tall: true }));
    if (side) {
      const span = freeSpan(side, 1.6, { tall: true });
      mount(feltPanel(Math.min(2.8, span.room - 0.3), 1.1, m), side, span.s, 1.45);
    }
    if (table) {
      group.add(books(m, 0.765, table.cx - 0.3, table.cz, 0.22, 2, seed));
      group.add(vase(m, table.cx + 0.2, 0.765, table.cz, 0.2, true, seed));
    }
    corners(1, () => planter(m, 1.4));
  } else if (/focus/.test(type)) {
    const desk = of("desk")[0];
    const chair = of("chair")[0];
    if (desk) {
      const r0 = rug(Math.min(2.6, Math.max(desk.w, desk.d) + 1.4), 2.0, m);
      r0.position.set(desk.cx, 0, desk.cz);
      r0.rotation.y = desk.w >= desk.d ? desk.angle : desk.angle + Math.PI / 2;
      group.add(r0);
      if (chair) {
        // Two visitor chairs across the desk from the owner's chair.
        let dx = desk.cx - chair.cx, dz = desk.cz - chair.cz;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        const reach = Math.min(desk.w, desk.d) / 2 + 0.55;
        for (const side of [-1, 1]) {
          const x = desk.cx + dx * reach - dz * side * 0.38, z = desk.cz + dz * reach + dx * side * 0.38;
          if (!inRoom(x, z) || inWall(x, z)) continue;
          const v = createFixture("dining_chair", 0.48, 0.5, m, low);
          v.position.set(x, 0, z);
          v.rotation.y = Math.atan2(-dx, -dz);
          group.add(v);
          obstacles.push([[x - 0.25, z - 0.25], [x + 0.25, z - 0.25], [x + 0.25, z + 0.25], [x - 0.25, z + 0.25], [x - 0.25, z - 0.25]]);
        }
      }
    }
    // Reading corner: a lounge chair and lamp in the best free corner.
    const centre = polygons[0][0].reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]).map((v) => v / polygons[0][0].length);
    corner: for (const run of byLength)
      for (const s of [0.6, run.len - 0.6]) {
        const ring = footprint(run, s, 1.2, 0.95, 0.05);
        if (!clearFloor(ring)) continue;
        const [x, z] = point(run, s, 0.5);
        const chair = makeSofa(0.86, 0.82, m, low, 1);
        chair.position.set(x, 0, z);
        chair.rotation.y = Math.atan2(centre[0] - x, centre[1] - z);
        group.add(chair);
        const [lx, lz] = point(run, s + (s < run.len / 2 ? -0.5 : 0.5), 0.3);
        const lamp = floorLamp(m);
        lamp.position.set(lx, 0, lz);
        group.add(lamp);
        obstacles.push(ring);
        break corner;
      }
    const back = desk && backRun(desk, false);
    const run = back || byLength[0];
    if (run) {
      const span = freeSpan(run, 1.4, { tall: true, low: true });
      if (span && floorPiece(() => mediaWall(Math.min(1.8, span.room - 0.1), m, false, seed), run, span.s, Math.min(1.8, span.room - 0.1), 0.44))
        art(run, span.s, 0.9, 0.65, artY(0.65));
    }
    corners(1, () => planter(m, 1.5));
  } else if (/reception/.test(type)) {
    const desk = of("reception")[0];
    const back = desk && backRun(desk, false);
    if (back) {
      const span = freeSpan(back, 2.0, { tall: false, near: project(back, desk.cx, desk.cz) });
      if (span) {
        const w = Math.min(4.5, span.room);
        mount(slatWall(w, top - 0.02, m), back, span.s, 0, 0.004);
        const halo = new THREE.Group(),
          hk = kit(halo, m, low);
        const ring = hk.tag(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 12, 64), m.glow));
        ring.position.z = 0.08;
        hk.box(0, 0, 0.06, 0.06, 0.6, 0.02, m.brass, 0.004);
        mount(halo, back, span.s, Math.min(1.85, top - 0.6));
      }
    }
    corners(3, () => planter(m, 1.5 + r() * 0.4));
  } else if (/pantry/.test(type)) {
    const counter = of("counter")[0];
    const run = counter && backRun(counter, false);
    if (run) {
      const s = project(run, counter.cx, counter.cz);
      mount(upperCabinets(Math.min(Math.max(counter.w, counter.d), 3), m), run, s, 1.45);
      const splash = new THREE.Group();
      kit(splash, m, low).box(0, 1.17, 0.005, Math.max(counter.w, counter.d), 0.55, 0.01, m.walltile, 0.002);
      mount(splash, run, s, 0, 0.002);
      const L = Math.max(counter.w, counter.d);
      mount(coffeeStation(m), run, s + L * 0.3, 0.895, 0.06);
      mount(bowl(m, 0, 0.895, 0.32, 0.15), run, s - L * 0.32, 0, 0);
    }
    for (const t of of("round_table")) {
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 + seed;
        const chair = createFixture("dining_chair", 0.46, 0.5, m, low);
        chair.position.set(t.cx + Math.sin(a) * 0.72, 0, t.cz + Math.cos(a) * 0.72);
        chair.rotation.y = a + Math.PI;
        group.add(chair);
      }
      group.add(vase(m, t.cx, 0.765, t.cz, 0.2, true, seed));
    }
    corners(1, () => planter(m, 1.2));
  }
  group.traverse((o) => {
    if (o.isMesh) o.userData.furniture = true;
  });
  return { group, assets, obstacles };
}

/** Desk styling: the planner's desk already carries a monitor; add a varied,
 * believable working set so a workspace reads as occupied. */
export function deskProps(m, w, d, seed) {
  const g = new THREE.Group(),
    y = 0.7625,
    k = Math.floor(seed * 6);
  if (k % 3 === 0) g.add(laptop(m).translateX(w * 0.22).translateY(y).translateZ(d * 0.12));
  if (k % 2 === 0) g.add(mug(m).translateX(-w * 0.32).translateY(y).translateZ(d * 0.2));
  if (k === 1 || k === 4) g.add(smallPlant(m, 0.26).translateX(-w * 0.38).translateY(y).translateZ(-d * 0.28));
  if (k === 2 || k === 5) g.add(books(m, y, w * 0.36, -d * 0.24, 0.22, 3, seed));
  if (k === 3) g.add(tableLamp(m, -w * 0.38, y, -d * 0.25, 0.7));
  return g;
}

/** Ceiling fittings per room: downlight grids at home, felt rafts with linear
 * lights over workspaces. Returns a group in building-local metres; the caller
 * merges the floor's fittings and flags them as ceiling. */
export function ceilingFittings({ type, polygons, height, avoid, m }) {
  const group = new THREE.Group(),
    y = height - 0.045,
    ring = polygons[0]?.[0];
  if (!ring) return group;
  const b = bboxOf(ring),
    inside = (x, z, margin) => [[0, 0], [margin, 0], [-margin, 0], [0, margin], [0, -margin]].every(([a, c]) => polygons.some((p) => insidePolygon(x + a, z + c, p)));
  const clear = (x, z, r) => !avoid.some(([ax, az]) => Math.hypot(ax - x, az - z) < r);
  const grid = (step, margin, make, cap, r = 0.6) => {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
    const nx = Math.max(1, Math.floor((w - margin * 2) / step) + 1), nz = Math.max(1, Math.floor((d - margin * 2) / step) + 1);
    const ox = b.minX + (w - (nx - 1) * step) / 2, oz = b.minZ + (d - (nz - 1) * step) / 2;
    let n = 0;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = ox + i * step, z = oz + j * step;
        if (n >= cap || !inside(x, z, margin * 0.8) || !clear(x, z, r)) continue;
        const o = make(w >= d);
        o.position.set(x, y, z);
        group.add(o);
        n++;
      }
  };
  if (/workspace|collab/.test(type)) {
    grid(3.4, 1.3, (alongX) => {
      const g = new THREE.Group();
      g.add(raft(2.4, 1.2, m));
      g.add(linearLight(2.2, m, 0.32).translateZ(0.95));
      if (!alongX) g.rotation.y = Math.PI / 2;
      return g;
    }, 14, 0.2);
  } else if (/meeting|focus|reception/.test(type)) {
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
    if (w > 2.6 && d > 2.6) grid(10, Math.min(w, d) / 2 - 0.01, (alongX) => { const g = raft(Math.min(3, Math.max(w, d) - 1.4), Math.min(1.4, Math.min(w, d) - 1.2), m); if (!alongX) g.rotation.y = Math.PI / 2; return g; }, 1, 0);
    grid(1.6, 0.6, () => downlight(m), 8, 0.9);
  } else if (RESIDENTIAL.test(type) || /pantry|print/.test(type)) grid(1.5, 0.55, () => downlight(m), 9);
  return group;
}
export const isOffice = (type) => OFFICE.test(type);
