import * as THREE from "https://esm.sh/three@0.185.1";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.185.1/examples/jsm/geometries/RoundedBoxGeometry.js";
import { artUV } from "./canvas-textures.js";
/** Contemporary furniture, styling props and wall pieces. Metres, +Y up, pivot
 * on the finished floor, front faces +Z. Every mesh keeps a palette surface
 * key so style changes re-skin it and room batching merges it by material. */

export function kit(root, m, low = false) {
  const tag = (mesh) => {
    mesh.userData.surface = Object.keys(m).find((key) => m[key] === mesh.material);
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const box = (x, y, z, a, b, c, mat, r = 0.02) => {
    const g = new RoundedBoxGeometry(a, b, c, low ? 1 : 2, Math.max(0.001, Math.min(r, a / 3, b / 3, c / 3)));
    const uv = g.attributes.uv,
      p = g.attributes.position,
      n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(n.getX(i)),
        ny = Math.abs(n.getY(i)),
        nz = Math.abs(n.getZ(i));
      if (ny >= nx && ny >= nz) uv.setXY(i, p.getZ(i), p.getX(i));
      else if (nx > nz) uv.setXY(i, p.getZ(i), p.getY(i));
      else uv.setXY(i, p.getX(i), p.getY(i));
    }
    const mesh = tag(new THREE.Mesh(g, mat));
    mesh.position.set(x, y, z);
    return mesh;
  };
  const cyl = (x, y, z, r1, r2, h, mat, n = low ? 10 : 24) => {
    const mesh = tag(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), mat));
    mesh.position.set(x, y, z);
    return mesh;
  };
  const lathe = (profile, mat, x = 0, y = 0, z = 0, n = low ? 12 : 32) => {
    const mesh = tag(
      new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), n), mat),
    );
    mesh.position.set(x, y, z);
    return mesh;
  };
  const sphere = (x, y, z, r, mat, sx = 1, sy = 1, sz = 1) => {
    const mesh = tag(new THREE.Mesh(new THREE.SphereGeometry(r, low ? 8 : 16, low ? 6 : 12), mat));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  };
  return { box, cyl, lathe, sphere, tag };
}
function seeded(seed) {
  let s = Math.floor(Math.abs(seed) * 9973) % 2147483647 || 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Plump cushion: a softly rounded slab, tilted back against what is behind it. */
function cushion(k, x, y, z, w, h, mat, tilt = -0.22, yaw = 0) {
  const c = k.box(x, y, z, w, h, 0.13, mat, 0.06);
  c.rotation.set(tilt, yaw, 0);
  return c;
}

export function makeBed(w, d, m, low = false) {
  const root = new THREE.Group(),
    k = kit(root, m, low);
  k.box(0, 0.13, 0.02, w - 0.06, 0.2, d - 0.08, m.dark, 0.01);
  k.box(0, 0.27, 0.02, w, 0.1, d - 0.04, m.textile, 0.03);
  k.box(0, 0.43, 0.03, w - 0.05, 0.22, d - 0.1, m.linen, 0.07);
  // Duvet covers the lower two thirds and folds back at the top.
  k.box(0, 0.555, d * 0.1, w + 0.02, 0.05, d * 0.74, m.linen, 0.025);
  k.box(0, 0.585, -d * 0.24, w + 0.01, 0.035, 0.22, m.linen, 0.017);
  for (const side of [-1, 1]) k.box(side * (w / 2 + 0.005), 0.43, d * 0.1, 0.03, 0.22, d * 0.74, m.linen, 0.012);
  k.box(0, 0.6, d * 0.33, w + 0.05, 0.03, 0.42, m.throw, 0.014);
  for (const side of [-1, 1]) k.box(side * (w / 2 + 0.02), 0.47, d * 0.33, 0.025, 0.25, 0.42, m.throw, 0.01);
  // Upholstered, channel-stitched headboard.
  const hw = w + 0.12,
    channels = low ? 1 : Math.max(4, Math.round(hw / 0.24));
  k.box(0, 0.62, -d / 2 + 0.03, hw, 1.12, 0.07, m.textile, 0.02);
  if (!low)
    for (let i = 0; i < channels; i++)
      k.box(-hw / 2 + (hw * (i + 0.5)) / channels, 0.68, -d / 2 + 0.075, hw / channels - 0.018, 0.94, 0.04, m.textile, 0.018);
  const pillows = w > 1.3 ? [-w * 0.24, w * 0.24] : [0];
  for (const x of pillows) cushion(k, x, 0.68, -d / 2 + 0.24, Math.min(0.66, w * 0.42), 0.3, m.linen, -0.35);
  if (w > 1.3) {
    cushion(k, -w * 0.15, 0.66, -d / 2 + 0.38, 0.42, 0.34, m.soft, -0.28, 0.05);
    cushion(k, w * 0.15, 0.66, -d / 2 + 0.38, 0.42, 0.34, m.soft2, -0.28, -0.05);
  } else cushion(k, 0, 0.66, -d / 2 + 0.38, 0.4, 0.32, m.soft, -0.28);
  return root;
}

export function makeSofa(w, d, m, low = false, seats = null) {
  const root = new THREE.Group(),
    k = kit(root, m, low);
  const arm = Math.min(0.2, w * 0.1),
    inner = w - arm * 2,
    n = seats || (w > 2.1 ? 3 : w > 1.2 ? 2 : 1);
  k.box(0, 0.05, 0, w - 0.1, 0.06, d - 0.1, m.dark, 0.008);
  k.box(0, 0.22, 0, w, 0.26, d, m.textile, 0.04);
  for (let i = 0; i < n; i++) {
    const x = -inner / 2 + (inner * (i + 0.5)) / n;
    k.box(x, 0.42, d * 0.06, inner / n - 0.015, 0.15, d * 0.78, m.textile, 0.06);
    const back = k.box(x, 0.66, -d / 2 + 0.17, inner / n - 0.02, 0.42, 0.2, m.textile, 0.08);
    back.rotation.x = -0.12;
  }
  k.box(0, 0.5, -d / 2 + 0.06, w, 0.6, 0.12, m.textile, 0.04);
  for (const side of [-1, 1]) k.box(side * (w / 2 - arm / 2), 0.43, 0, arm, 0.36, d, m.textile, 0.05);
  if (n > 1) {
    cushion(k, -inner / 2 + 0.28, 0.66, -d / 2 + 0.33, 0.44, 0.42, m.soft, -0.3, 0.25);
    cushion(k, inner / 2 - 0.28, 0.66, -d / 2 + 0.33, 0.44, 0.42, m.soft2, -0.3, -0.25);
    if (n > 2) cushion(k, inner / 2 - 0.62, 0.64, -d / 2 + 0.34, 0.38, 0.36, m.throw, -0.3, -0.1);
  } else cushion(k, 0, 0.64, -d / 2 + 0.33, 0.4, 0.38, m.soft, -0.3);
  if (n > 1 && !low) {
    // A throw folded over one arm.
    k.box(w / 2 - arm / 2, 0.62, 0.02, arm + 0.04, 0.025, d * 0.55, m.throw, 0.01);
    k.box(w / 2 + 0.015, 0.47, 0.02, 0.02, 0.3, d * 0.55, m.throw, 0.008);
  }
  return root;
}

/** Oval stone top on a recessed timber plinth, styled with books, a bowl and a vase. */
export function makeCoffeeTable(w, d, m, low = false, seed = 1) {
  const root = new THREE.Group(),
    k = kit(root, m, low);
  const top = k.cyl(0, 0.37, 0, 0.5, 0.5, 0.035, m.stone, low ? 16 : 48);
  top.scale.set(w, 1, d);
  const base = k.cyl(0, 0.18, 0, 0.36, 0.36, 0.34, m.wood, low ? 12 : 32);
  base.scale.set(w, 1, d);
  if (!low) {
    root.add(books(m, 0.38, -w * 0.18, -d * 0.08, 0.26, 2, seed));
    root.add(bowl(m, w * 0.2, 0.39, d * 0.05, 0.14));
    root.add(vase(m, -w * 0.05, 0.39, d * 0.18, 0.18, true, seed));
  }
  return root;
}

export function books(m, y, x, z, width = 0.24, count = 3, seed = 1, standing = false) {
  const root = new THREE.Group(),
    k = kit(root, m),
    r = seeded(seed + count);
  let offset = 0;
  for (let i = 0; i < count; i++) {
    const t = standing ? 0.025 + r() * 0.02 : 0.03 + r() * 0.025,
      h = standing ? 0.2 + r() * 0.08 : width * (0.8 + r() * 0.25),
      dep = standing ? 0.15 + r() * 0.05 : width * (0.62 + r() * 0.15);
    const b = standing
      ? k.box(offset + t / 2, y + h / 2, 0, t, h, dep, m.books, 0.003)
      : k.box(0, y + offset + t / 2, 0, h, t, dep, m.books, 0.003);
    if (!standing) b.rotation.y = (r() - 0.5) * 0.4;
    const col = Math.floor(r() * 24),
      uv = b.geometry.attributes.uv,
      p = b.geometry.attributes.position;
    for (let j = 0; j < uv.count; j++)
      uv.setXY(j, (col + 0.15 + 0.7 * (p.getY(j) / h + 0.5)) / 24, standing ? p.getY(j) / h + 0.5 : 0.5);
    offset += t + (standing ? 0.004 : 0.002);
  }
  if (standing) root.children.forEach((b) => (b.position.x -= offset / 2));
  root.position.set(x, 0, z);
  return root;
}
export function bowl(m, x, y, z, r = 0.14) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.lathe([[0, 0], [r * 0.45, 0], [r * 0.8, r * 0.18], [r, r * 0.42], [r * 0.94, r * 0.44], [r * 0.74, r * 0.2], [0, r * 0.08]], m.ceramic, x, y, z);
  return root;
}
export function vase(m, x, y, z, h = 0.22, stems = true, seed = 1) {
  const root = new THREE.Group(),
    k = kit(root, m),
    r = seeded(seed);
  k.lathe([[0, 0], [h * 0.22, 0], [h * 0.3, h * 0.25], [h * 0.26, h * 0.65], [h * 0.12, h * 0.9], [h * 0.14, h], [h * 0.1, h], [0, h * 0.2]], r() > 0.5 ? m.ceramic : m.stone, x, y, z);
  if (stems)
    for (let i = 0; i < 3; i++) {
      const lean = (i - 1) * 0.22 + (r() - 0.5) * 0.1,
        len = h * (1.3 + r() * 0.6);
      const stem = k.cyl(x + Math.sin(lean) * len * 0.5, y + h + Math.cos(lean) * len * 0.45, z, 0.004, 0.004, len, m.dark, 5);
      stem.rotation.z = -lean;
      for (let j = 0; j < 3; j++)
        k.sphere(x + Math.sin(lean) * len * (0.55 + j * 0.2), y + h + Math.cos(lean) * len * (0.5 + j * 0.18), z, 0.03, m.leaf, 1, 0.45, 0.7);
    }
  return root;
}
export function tableLamp(m, x, y, z, s = 1) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.lathe([[0, 0], [0.07, 0], [0.09, 0.08], [0.085, 0.2], [0.03, 0.27], [0.012, 0.3], [0, 0.3]], m.ceramic, 0, 0, 0);
  k.cyl(0, 0.38, 0, 0.12, 0.15, 0.18, m.linen, 32).material = m.linen;
  k.cyl(0, 0.3, 0, 0.11, 0.11, 0.01, m.glow, 24);
  root.position.set(x, y, z);
  root.scale.setScalar(s);
  return root;
}
export function floorLamp(m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.cyl(0, 0.015, 0, 0.15, 0.16, 0.03, m.stone, 32);
  k.cyl(0, 0.75, 0, 0.011, 0.011, 1.45, m.brass, 12);
  k.cyl(0, 1.5, 0, 0.17, 0.21, 0.3, m.linen, 40);
  k.cyl(0, 1.36, 0, 0.17, 0.17, 0.01, m.glow, 32);
  return root;
}

/** Framed print. `tile` picks one of the eight atlas prints. */
export function artFrame(w, h, m, tile = 0, frame = "dark") {
  const root = new THREE.Group(),
    k = kit(root, m);
  const f = m[frame] || m.dark,
    t = 0.024;
  k.box(0, h / 2 - t / 2, 0, w, t, 0.035, f, 0.004);
  k.box(0, -h / 2 + t / 2, 0, w, t, 0.035, f, 0.004);
  k.box(-w / 2 + t / 2, 0, 0, t, h, 0.035, f, 0.004);
  k.box(w / 2 - t / 2, 0, 0, t, h, 0.035, f, 0.004);
  const g = new THREE.BoxGeometry(w - t * 2, h - t * 2, 0.012);
  k.tag(new THREE.Mesh(artUV(g, tile), m.art)).position.z = 0.002;
  return root;
}
export function roundMirror(r, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const glass = k.cyl(0, 0, 0, r, r, 0.012, m.mirror, 48);
  glass.rotation.x = Math.PI / 2;
  const rim = k.tag(new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 8, 64), m.brass));
  rim.position.z = 0.004;
  return root;
}
export function floatingShelf(w, m, seed = 1) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.box(0, 0, 0.12, w, 0.035, 0.24, m.wood, 0.006);
  root.add(books(m, 0.018, -w * 0.25, 0.12, 0, 5, seed, true));
  root.add(vase(m, w * 0.12, 0.018, 0.12, 0.17, false, seed));
  root.add(bowl(m, w * 0.33, 0.018, 0.12, 0.08));
  return root;
}
/** Low media console with fluted doors; the screen hangs on the wall above. */
export function mediaWall(w, m, tv = true, seed = 1) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const d = 0.42;
  k.box(0, 0.06, d / 2, w - 0.08, 0.1, d - 0.06, m.dark, 0.005);
  k.box(0, 0.3, d / 2, w, 0.4, d, m.wood, 0.012);
  const doors = Math.max(2, Math.round(w / 0.55));
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / doors;
    for (let j = 0; j < 6; j++)
      k.box(x - w / doors / 2 + ((w / doors) * (j + 0.5)) / 6, 0.3, d + 0.004, w / doors / 6 - 0.01, 0.36, 0.012, m.wood, 0.004);
  }
  k.box(0, 0.505, d / 2, w + 0.01, 0.02, d + 0.01, m.stone, 0.004);
  if (tv) {
    const tw = Math.min(1.45, w * 0.7),
      th = tw * 0.5625;
    k.box(0, 1.3, 0.035, tw + 0.02, th + 0.02, 0.03, m.dark, 0.006);
    k.box(0, 1.3, 0.051, tw, th, 0.002, m.screen, 0.0005);
  }
  root.add(books(m, 0.515, -w * 0.32, d / 2, 0.24, 3, seed));
  root.add(vase(m, w * 0.3, 0.515, d / 2, 0.26, true, seed + 2));
  return root;
}
export function console_(w, m, seed = 1) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const d = 0.36;
  k.box(0, 0.78, d / 2, w, 0.035, d, m.wood, 0.008);
  for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) k.box(x, 0.39, d / 2, 0.035, 0.78, d - 0.04, m.wood, 0.006);
  k.box(0, 0.16, d / 2, w - 0.08, 0.02, d - 0.06, m.wood, 0.004);
  root.add(tableLamp(m, -w * 0.3, 0.8, d / 2, 0.85));
  root.add(books(m, 0.8, w * 0.18, d / 2, 0.24, 2, seed));
  root.add(bowl(m, w * 0.33, 0.8, d / 2 + 0.02, 0.12));
  return root;
}
export function dresser(w, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const d = 0.46;
  k.box(0, 0.42, d / 2, w, 0.76, d, m.wood, 0.012);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 2; c++) {
      k.box(-w / 4 + (c * w) / 2, 0.17 + r * 0.24, d + 0.005, w / 2 - 0.025, 0.22, 0.016, m.wood, 0.006);
      k.box(-w / 4 + (c * w) / 2, 0.24 + r * 0.24, d + 0.018, 0.12, 0.012, 0.012, m.brass, 0.003);
    }
  k.box(0, 0.035, d / 2, w - 0.1, 0.07, d - 0.08, m.dark, 0.004);
  root.add(vase(m, w * 0.3, 0.8, d / 2, 0.22, true, 3));
  root.add(books(m, 0.8, -w * 0.25, d / 2, 0.22, 2, 5));
  return root;
}
/** Window dressing: two gathered linen drapes on a ceiling track. */
export function curtains(w, h, m, low = false) {
  const root = new THREE.Group(),
    k = kit(root, m, low);
  k.box(0, h - 0.02, 0, w + 0.5, 0.025, 0.05, m.frame, 0.005);
  for (const side of [-1, 1]) {
    const pw = 0.42,
      g = new THREE.PlaneGeometry(pw, h - 0.06, low ? 8 : 28, 1),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / pw) * Math.PI * 6) * 0.035);
    g.computeVertexNormals();
    const panel = k.tag(new THREE.Mesh(g, m.drape));
    panel.position.set(side * (w / 2 + 0.06), (h - 0.06) / 2, 0.05);
  }
  return root;
}
export function blind(w, drop, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.box(0, 0, 0, w, 0.07, 0.07, m.frame, 0.01);
  k.box(0, -drop / 2, 0.02, w - 0.04, drop, 0.004, m.drape, 0.001);
  k.box(0, -drop, 0.02, w - 0.04, 0.025, 0.02, m.frame, 0.004);
  return root;
}
/** Fluted felt acoustic panel. */
export function feltPanel(w, h, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const n = Math.max(3, Math.round(w / 0.09));
  k.box(0, 0, 0.012, w, h, 0.024, m.felt, 0.004);
  for (let i = 0; i < n; i++) k.box(-w / 2 + (w * (i + 0.5)) / n, 0, 0.03, w / n - 0.022, h - 0.02, 0.018, m.felt, 0.008);
  return root;
}
export function slatWall(w, h, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const n = Math.max(4, Math.round(w / 0.075));
  k.box(0, h / 2, 0.006, w, h, 0.012, m.dark, 0.002);
  for (let i = 0; i < n; i++) k.box(-w / 2 + (w * (i + 0.5)) / n, h / 2, 0.025, 0.032, h, 0.03, m.wood, 0.004);
  return root;
}
export function wallScreen(w, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const h = w * 0.5625;
  k.box(0, 0, 0.025, w + 0.03, h + 0.03, 0.04, m.dark, 0.006);
  k.box(0, 0, 0.046, w, h, 0.002, m.screen, 0.0005);
  return root;
}
export function whiteboard(w, h, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.box(0, 0, 0.012, w, h, 0.02, m.ceramic, 0.004);
  k.box(0, -h / 2 - 0.03, 0.04, w * 0.6, 0.02, 0.06, m.metal, 0.004);
  return root;
}
export function towelRail(m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const bar = k.cyl(0, 0, 0.07, 0.012, 0.012, 0.62, m.metal, 12);
  bar.rotation.z = Math.PI / 2;
  for (const x of [-0.3, 0.3]) k.box(x, 0, 0.035, 0.02, 0.02, 0.07, m.metal, 0.004);
  k.box(0, -0.2, 0.07, 0.5, 0.4, 0.02, m.linen, 0.008);
  k.box(0, -0.16, 0.085, 0.42, 0.3, 0.015, m.throw, 0.006);
  return root;
}
export function stool(m, h = 0.65) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.cyl(0, h, 0, 0.18, 0.17, 0.05, m.textile, 28);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4,
      leg = k.cyl(Math.cos(a) * 0.13, h / 2, Math.sin(a) * 0.13, 0.012, 0.012, h, m.metal, 8);
    leg.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08);
  }
  const ring = k.tag(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 6, 32), m.metal));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = h * 0.32;
  return root;
}
export function upperCabinets(w, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const d = 0.34,
    h = 0.72,
    n = Math.max(1, Math.round(w / 0.6));
  k.box(0, h / 2, d / 2, w, h, d, m.wood, 0.008);
  for (let i = 0; i < n; i++) k.box(-w / 2 + (w * (i + 0.5)) / n, h / 2, d + 0.005, w / n - 0.008, h - 0.012, 0.018, m.wood, 0.005);
  k.box(0, -0.008, d * 0.6, w - 0.04, 0.012, 0.04, m.glow, 0.003);
  return root;
}
/** Espresso machine, grinder and cups for a pantry or kitchen counter. */
export function coffeeStation(m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.box(0, 0.19, 0.2, 0.34, 0.38, 0.36, m.metal, 0.03);
  k.box(0, 0.08, 0.36, 0.22, 0.012, 0.1, m.dark, 0.004);
  k.box(0, 0.3, 0.385, 0.2, 0.06, 0.03, m.dark, 0.01);
  k.cyl(0.3, 0.17, 0.2, 0.06, 0.07, 0.34, m.dark, 20);
  k.cyl(0.3, 0.36, 0.2, 0.07, 0.05, 0.05, m.glass, 20);
  for (const x of [-0.3, -0.22]) root.add(mug(m).translateX(x).translateZ(0.3));
  return root;
}
export function laptop(m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.box(0, 0.007, 0, 0.32, 0.014, 0.22, m.metal, 0.004);
  const lid = k.box(0, 0.11, -0.11, 0.32, 0.21, 0.008, m.metal, 0.003);
  lid.rotation.x = -0.25;
  const screen = k.box(0, 0.11, -0.104, 0.3, 0.19, 0.002, m.screen, 0.0005);
  screen.rotation.x = -0.25;
  return root;
}
export function mug(m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.lathe([[0, 0], [0.04, 0], [0.042, 0.095], [0.037, 0.095], [0.035, 0.008], [0, 0.008]], m.ceramic);
  return root;
}
export function smallPlant(m, h = 0.3) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.lathe([[0, 0], [0.06, 0], [0.075, h * 0.4], [0.07, h * 0.42], [0, h * 0.38]], m.ceramic);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    k.sphere(Math.cos(a) * 0.06, h * 0.5 + (i % 3) * 0.06, Math.sin(a) * 0.06, 0.06, m.leaf, 1, 0.7, 1);
  }
  return root;
}
/** Sculptural floor planter for offices and corners where the GLB plant is not loaded. */
export function planter(m, h = 1.4) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.cyl(0, 0.22, 0, 0.22, 0.18, 0.44, m.dark, 28);
  k.cyl(0, 0.45, 0, 0.2, 0.2, 0.02, m.wood, 20);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996,
      t = i / 14,
      r = 0.12 + t * 0.12;
    k.sphere(Math.cos(a) * r, 0.6 + t * (h - 0.75), Math.sin(a) * r, 0.14 - t * 0.04, m.leaf, 1.1, 0.55, 0.9);
  }
  k.cyl(0, 0.5 + (h - 0.5) / 2, 0, 0.015, 0.02, h - 0.55, m.wood, 6);
  return root;
}
export function downlight(m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.cyl(0, -0.004, 0, 0.055, 0.055, 0.01, m.glow, 20);
  const ring = k.tag(new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.006, 4, 24), m.metal));
  ring.rotation.x = Math.PI / 2;
  return root;
}
export function linearLight(len, m, drop = 0.6) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.box(0, -drop, 0, len, 0.045, 0.06, m.dark, 0.006);
  k.box(0, -drop - 0.024, 0, len - 0.04, 0.004, 0.045, m.glow, 0.001);
  for (const x of [-len * 0.4, len * 0.4]) k.cyl(x, -drop / 2, 0, 0.0015, 0.0015, drop, m.dark, 4);
  return root;
}
export function raft(w, d, m) {
  const root = new THREE.Group(),
    k = kit(root, m);
  k.box(0, -0.25, 0, w, 0.04, d, m.felt, 0.012);
  for (const x of [-w * 0.4, w * 0.4]) for (const z of [-d * 0.4, d * 0.4]) k.cyl(x, -0.12, z, 0.0015, 0.0015, 0.24, m.dark, 4);
  return root;
}
export function doorLeaf(w, h, m, glazed = false) {
  const root = new THREE.Group(),
    k = kit(root, m);
  if (glazed) {
    k.box(w / 2, h / 2, 0, w, h, 0.04, m.glass, 0.002);
    k.box(w / 2, h / 2, 0, w, 0.05, 0.045, m.metal, 0.004).position.y = 0.03;
    k.box(w / 2, h - 0.03, 0, w, 0.05, 0.045, m.metal, 0.004);
  } else k.box(w / 2, h / 2, 0, w, h, 0.04, m.door, 0.004);
  for (const z of [-0.04, 0.04]) {
    k.box(w - 0.08, 1.02, z, 0.14, 0.018, 0.018, m.metal, 0.006);
    k.cyl(w - 0.02, 1.02, z * 0.6, 0.02, 0.02, 0.014, m.metal, 12).rotation.x = Math.PI / 2;
  }
  return root;
}
/** Woven rug; UVs span the rug so the border frames it. */
export function rug(w, d, m) {
  const g = new THREE.BoxGeometry(w, 0.012, d),
    p = g.attributes.position,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getZ(i) / d + 0.5);
  const mesh = new THREE.Mesh(g, m.rug);
  mesh.position.y = 0.006;
  mesh.userData.surface = "rug";
  const root = new THREE.Group();
  root.add(mesh);
  return root;
}
export function windowFrame(w, sill, head, m, mullionEvery = 1.4) {
  const root = new THREE.Group(),
    k = kit(root, m);
  const h = head - sill,
    t = 0.045;
  k.box(0, sill + t / 2, 0, w, t, 0.07, m.frame, 0.004);
  k.box(0, head - t / 2, 0, w, t, 0.07, m.frame, 0.004);
  for (const x of [-w / 2 + t / 2, w / 2 - t / 2]) k.box(x, sill + h / 2, 0, t, h, 0.07, m.frame, 0.004);
  const n = Math.max(1, Math.round(w / mullionEvery));
  for (let i = 1; i < n; i++) k.box(-w / 2 + (w * i) / n, sill + h / 2, 0, 0.035, h, 0.06, m.frame, 0.003);
  k.box(0, sill + h / 2, 0, w - t, h - t, 0.008, m.pane, 0.001);
  return root;
}
