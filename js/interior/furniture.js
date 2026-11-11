import * as THREE from "https://esm.sh/three@0.185.1";
import { makeTaskChair } from "./seating.js";
import { makeCabinetRun } from "./kitchen.js";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.185.1/examples/jsm/geometries/RoundedBoxGeometry.js";
/** Designed fallback fixtures; dimensions are metres, +Y up, pivot on finished floor. */
export function createFixture(kind, w, d, m, lowDetail = false, features = []) {
  const root = new THREE.Group();
  const box = (x, y, z, a, b, c, mat, r = 0.025) => {
    const g = new RoundedBoxGeometry(
      a,
      b,
      c,
      lowDetail ? 1 : 2,
      Math.min(r, a / 3, b / 3, c / 3),
    );
    const mesh = new THREE.Mesh(g, mat);
    const uv = g.attributes.uv,
      position = g.attributes.position,
      normal = g.attributes.normal;
    for (let i = 0; i < position.count; i++) {
      const nx = Math.abs(normal.getX(i)),
        ny = Math.abs(normal.getY(i)),
        nz = Math.abs(normal.getZ(i));
      if (ny >= nx && ny >= nz) uv.setXY(i, position.getZ(i), position.getX(i));
      else if (nx > nz) uv.setXY(i, position.getZ(i), position.getY(i));
      else uv.setXY(i, position.getX(i), position.getY(i));
    }
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const cyl = (x, y, z, r1, r2, h, mat, n = lowDetail ? 12 : 24) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), mat);
    const uv = mesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * Math.PI * (r1 + r2), uv.getY(i) * h);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const legs = (h) => {
    for (const x of [-w * 0.38, w * 0.38])
      for (const z of [-d * 0.36, d * 0.36])
        cyl(x, h / 2, z, 0.022, 0.016, h, m.wood);
  };
  const tap = (x, y, z) => {
    cyl(x, y, z, 0.014, 0.014, 0.22, m.metal);
    const sp = cyl(x, y + 0.1, z + 0.06, 0.012, 0.012, 0.13, m.metal);
    sp.rotation.x = Math.PI / 2;
  };
  const vessel = (profile, width, depth, y, mat) => {
    const geometry = new THREE.LatheGeometry(
      profile.map(([r, h]) => new THREE.Vector2(r, h)),
      lowDetail ? 16 : 48,
    );
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.scale.set(width, 1, depth);
    mesh.position.y = y;
    root.add(mesh);
    return mesh;
  };
  if (kind === "cubicle_screen") {
    box(0, 1.02, -d * 0.45, w - 0.03, 0.5, 0.035, m.textile, 0.012);
    for (const x of [-w * 0.38, w * 0.38])
      box(x, 0.83, -d * 0.45, 0.025, 0.2, 0.035, m.metal, 0.005);
    box(-w * 0.47, 1.02, -d * 0.2, 0.035, 0.5, d * 0.5, m.textile, 0.012);
  } else if (kind === "counter") {
    root.add(makeCabinetRun(w, d, m, box, cyl, features));
  } else if (kind === "reception") {
    box(0, 0.43, 0, w, 0.82, d, m.wood);
    box(0, 0.875, 0, w + 0.015, 0.055, d + 0.02, m.stone, 0.012);
    box(0, 1.05, -d * 0.3, w, 0.35, 0.12, m.stone, 0.012);
  } else if (kind === "sink" || kind === "basin") {
    if (kind === "basin") {
      box(0, 0.35, 0, w, 0.65, d, m.wood);
      box(0, 0.72, 0, w + 0.02, 0.045, d + 0.02, m.stone);
    }
    const y = kind === "sink" ? 0.75 : 0.7425;
    vessel(
      [
        [0, 0],
        [0.24, 0],
        [0.37, 0.025],
        [0.45, 0.075],
        [0.49, 0.12],
        [0.5, 0.14],
        [0.5, 0.15],
        [0.44, 0.15],
        [0.43, 0.12],
        [0.39, 0.075],
        [0.27, 0.04],
        [0, 0.035],
      ],
      w,
      d,
      y,
      m.ceramic,
    );
    tap(w * 0.32, 1.02, -d * 0.32);
    if (kind === "basin")
      box(0, 1.45, -d / 2 + 0.02, w, 0.65, 0.025, m.mirror, 0.005);
  } else if (kind === "hob") {
    box(0, 0.916, 0, w, 0.025, d, m.dark, 0.006);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.min(w, d) * 0.32, 0.008, 8, 32),
      m.metal,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.932;
    root.add(ring);
  } else if (kind === "fridge" || /wardrobe|storage|cabinet/.test(kind)) {
    const h = kind === "fridge" ? 1.9 : 2.15;
    box(0, h / 2, 0, w, h, d, m.wood);
    for (let i = 0; i < 2; i++) {
      box(
        ((i - 0.5) * w) / 2,
        h / 2,
        d / 2 + 0.015,
        w / 2 - 0.008,
        h - 0.04,
        0.025,
        kind === "fridge" ? m.metal : m.wood,
        0.006,
      );
      box(
        (i - 0.5) * 0.07,
        h * 0.52,
        d / 2 + 0.05,
        0.016,
        0.3,
        0.022,
        m.metal,
        0.004,
      );
    }
    if (kind === "fridge")
      box(0, 0.53, d / 2 + 0.035, w - 0.03, 0.012, 0.02, m.dark, 0.003);
  } else if (/wc/.test(kind)) {
    if (kind === "wc_tank") box(0, 0.67, 0, w, 0.45, d, m.ceramic, 0.06);
    else {
      vessel(
        [
          [0, 0],
          [0.22, 0],
          [0.26, 0.04],
          [0.22, 0.17],
          [0.28, 0.26],
          [0.43, 0.32],
          [0.49, 0.4],
          [0.48, 0.43],
          [0.42, 0.43],
          [0.37, 0.38],
          [0.26, 0.29],
          [0.12, 0.25],
          [0, 0.25],
        ],
        w,
        d,
        0,
        m.ceramic,
      );
      box(0, 0.61, -d * 0.38, w * 0.88, 0.4, d * 0.23, m.ceramic, 0.035);
      cyl(0, 0.815, -d * 0.38, 0.022, 0.022, 0.006, m.metal, 24);
      const seat = new THREE.Mesh(
        new THREE.TorusGeometry(w * 0.43, 0.018, 12, 48),
        m.ceramic,
      );
      seat.rotation.x = Math.PI / 2;
      seat.scale.y = d / w;
      seat.position.y = 0.45;
      root.add(seat);
    }
  } else if (kind === "bath_tub" || kind === "shower") {
    box(0, 0.06, 0, w, 0.12, d, m.ceramic, 0.05);
    if (kind === "bath_tub") {
      vessel(
        [
          [0, 0.04],
          [0.3, 0.04],
          [0.4, 0.08],
          [0.44, 0.22],
          [0.49, 0.52],
          [0.5, 0.57],
          [0.49, 0.6],
          [0.45, 0.6],
          [0.43, 0.55],
          [0.39, 0.25],
          [0.34, 0.15],
          [0, 0.15],
        ],
        w,
        d,
        0,
        m.ceramic,
      );
      tap(w / 2 - 0.12, 0.68, -d * 0.32);
    } else {
      box(w / 2 - 0.025, 1, 0, 0.015, 1.9, d, m.glass, 0.002);
      cyl(-w * 0.4, 1.3, -d * 0.38, 0.015, 0.015, 1.2, m.metal);
      const head = cyl(-w * 0.3, 1.94, -d * 0.38, 0.09, 0.09, 0.018, m.metal);
      head.rotation.z = 0.2;
    }
  } else if (kind === "desk") {
    box(0, 0.74, 0, w, 0.045, d, m.wood, 0.012);
    for (const x of [-w * 0.43, w * 0.43]) {
      box(x, 0.36, 0, 0.04, 0.72, d * 0.8, m.metal, 0.008);
    }
    box(0, 0.96, -d * 0.23, w * 0.45, 0.3, 0.018, m.dark, 0.008);
    box(0, 0.79, -d * 0.23, 0.04, 0.16, 0.04, m.metal);
    box(0, 0.77, d * 0.18, w * 0.35, 0.015, d * 0.2, m.dark, 0.005);
  } else if (kind === "chair") {
    root.add(makeTaskChair(w, d, m, box, lowDetail));
  } else if (kind === "dining_chair") {
    legs(0.44);
    box(0, 0.46, 0, w * 0.94, 0.065, d * 0.9, m.textile, 0.035);
    for (const x of [-w * 0.38, w * 0.38])
      cyl(x, 0.68, -d * 0.35, 0.018, 0.022, 0.55, m.wood);
    box(0, 0.8, -d * 0.34, w * 0.88, 0.23, 0.055, m.textile, 0.025);
  } else if (kind === "shelving") {
    for (const x of [-w * 0.47, w * 0.47])
      box(x, 1, 0, 0.045, 2, d, m.wood, 0.006);
    for (const y of [0.12, 0.58, 1.04, 1.5, 1.96])
      box(0, y, 0, w, 0.035, d, m.wood, 0.008);
    for (
      let i = 0;
      i < (lowDetail ? 0 : Math.min(14, Math.floor(w / 0.12)));
      i++
    ) {
      const x = -w * 0.4 + i * 0.1;
      box(
        x,
        0.74,
        -d * 0.08,
        0.06,
        0.27 + (i % 3) * 0.025,
        d * 0.55,
        i % 2 ? m.textile : m.linen,
        0.004,
      );
    }
  } else if (kind === "bed") {
    legs(0.16);
    box(0, 0.22, 0, w, 0.2, d, m.wood, 0.05);
    box(0, 0.43, 0, w - 0.03, 0.25, d - 0.03, m.textile, 0.12);
    box(0, 0.8, -d * 0.48, w, 0.9, 0.08, m.wood, 0.035);
    for (const x of [-w * 0.24, w * 0.24])
      box(x, 0.61, -d * 0.32, w * 0.42, 0.15, 0.44, m.linen, 0.1);
    box(0, 0.58, d * 0.21, w + 0.01, 0.06, d * 0.45, m.textile, 0.03);
  } else if (/sofa|armchair/.test(kind)) {
    legs(0.12);
    box(0, 0.24, 0, w, 0.28, d, m.wood, 0.045);
    box(0, 0.48, 0, w * 0.8, 0.2, d * 0.82, m.textile, 0.09);
    box(0, 0.72, -d * 0.38, w, 0.65, 0.17, m.textile, 0.08);
    for (const x of [-w * 0.45, w * 0.45])
      box(x, 0.6, 0, w * 0.12, 0.4, d, m.textile, 0.06);
    const n = kind === "sofa" ? 2 : 1;
    for (let i = 0; i < n; i++)
      box(
        w * ((i + 0.5) / n - 0.5) * 0.72,
        0.75,
        -d * 0.23,
        (w * 0.65) / n,
        0.38,
        0.13,
        m.linen,
        0.065,
      );
  } else if (/table|nightstand/.test(kind)) {
    const h =
      kind === "coffee_table" ? 0.38 : kind === "nightstand" ? 0.52 : 0.74;
    if (kind === "table" && w > 1.6) {
      // Boardroom table: slab legs, a recessed shadow gap and a power module.
      for (const x of [-w * 0.32, w * 0.32])
        box(x, (h - 0.05) / 2, 0, 0.07, h - 0.05, d * 0.62, m.wood, 0.01);
      box(0, h - 0.045, 0, w - 0.14, 0.035, d - 0.14, m.dark, 0.006);
      box(0, h + 0.026, 0, Math.min(0.32, w * 0.15), 0.008, 0.11, m.metal, 0.003);
    } else legs(h - 0.06);
    box(0, h, 0, w, kind === "table" && w > 1.6 ? 0.05 : 0.045, d, m.wood, 0.018);
  } else if (kind === "pillow") {
    return root;
  } else if (kind === "rug") box(0, 0.012, 0, w, 0.02, d, m.textile, 0.008);
  else if (kind === "ceiling_light") {
    cyl(0, 0.035, 0, 0.19, 0.19, 0.07, m.metal, 48);
    cyl(0, 0.005, 0, 0.18, 0.18, 0.012, m.glow, 48);
  } else if (kind === "lamp") {
    cyl(0, 0.02, 0, 0.16, 0.16, 0.04, m.metal);
    cyl(0, 0.72, 0, 0.012, 0.012, 1.4, m.metal);
    cyl(0, 1.42, 0, 0.16, 0.22, 0.28, m.linen);
    cyl(0, 1.29, 0, 0.13, 0.13, 0.014, m.glow);
  } else box(0, 0.4, 0, w, 0.8, d, m.wood);
  root.traverse((x) => {
    if (x.isMesh) {
      x.receiveShadow = true;
      x.castShadow = false;
      x.userData.surface = Object.keys(m).find((key) => m[key] === x.material);
    }
  });
  return root;
}
