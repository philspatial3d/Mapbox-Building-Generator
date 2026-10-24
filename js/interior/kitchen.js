import * as THREE from "https://esm.sh/three@0.185.1";
/** Hollow cabinet carcass and real sink openings; all dimensions are metres. */
export function makeCabinetRun(w, d, m, box, cyl, features = []) {
  const group = new THREE.Group();
  box(0, 0.08, 0, w, 0.1, d - 0.04, m.wood, 0.008);
  box(0, 0.46, -d / 2 + 0.015, w, 0.76, 0.025, m.wood, 0.005);
  for (const x of [-w / 2 + 0.012, w / 2 - 0.012])
    box(x, 0.46, 0, 0.025, 0.76, d, m.wood, 0.005);
  const n = Math.max(1, Math.round(w / 0.6));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / n;
    box(x, 0.46, d / 2 - 0.01, w / n - 0.012, 0.7, 0.024, m.wood, 0.005);
    box(x, 0.7, d / 2 + 0.02, (w / n) * 0.48, 0.012, 0.018, m.metal, 0.004);
  }
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -d / 2);
  shape.lineTo(w / 2, -d / 2);
  shape.lineTo(w / 2, d / 2);
  shape.lineTo(-w / 2, d / 2);
  shape.closePath();
  for (const feature of features.filter((f) => f.kind === "sink")) {
    const hole = new THREE.Path();
    hole.absellipse(
      feature.x,
      -feature.z,
      feature.width * 0.49,
      feature.depth * 0.49,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
  }
  const top = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 32,
  });
  top.rotateX(-Math.PI / 2);
  top.translate(0, 0.85, 0);
  group.add(new THREE.Mesh(top, m.stone));
  const hobs = features.filter((f) => f.kind === "hob");
  if (hobs.length) {
    const minX = Math.min(...hobs.map((f) => f.x - f.width / 2)) - 0.025,
      maxX = Math.max(...hobs.map((f) => f.x + f.width / 2)) + 0.025;
    const minZ = Math.min(...hobs.map((f) => f.z - f.depth / 2)) - 0.025,
      maxZ = Math.max(...hobs.map((f) => f.z + f.depth / 2)) + 0.025;
    box(
      (minX + maxX) / 2,
      0.905,
      (minZ + maxZ) / 2,
      maxX - minX,
      0.02,
      maxZ - minZ,
      m.dark,
      0.006,
    );
    for (const hob of hobs) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
          Math.min(hob.width, hob.depth) * 0.4,
          0.004,
          6,
          32,
        ),
        m.metal,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(hob.x, 0.917, hob.z);
      group.add(ring);
    }
  }
  if (w > 1.2) {
    const x = hobs.length
      ? hobs.reduce((n, f) => n + f.x, 0) / hobs.length
      : Math.min(w * 0.2, w / 2 - 0.32);
    box(x, 0.45, d / 2 + 0.018, 0.55, 0.43, 0.027, m.dark, 0.012);
    box(x, 0.71, d / 2 + 0.019, 0.55, 0.09, 0.028, m.dark, 0.008);
    box(x, 0.64, d / 2 + 0.05, 0.43, 0.018, 0.025, m.metal, 0.004);
    for (const dx of [-0.17, 0, 0.17]) {
      const knob = cyl(
        x + dx,
        0.71,
        d / 2 + 0.045,
        0.018,
        0.018,
        0.018,
        m.metal,
        16,
      );
      knob.rotation.x = Math.PI / 2;
    }
  }
  return group;
}
