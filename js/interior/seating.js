import * as THREE from "https://esm.sh/three@0.185.1";

/** Upholstered task chair: metre dimensions, floor pivot, curved seat/back,
 * bent arm supports, five-star base and paired caster wheels. */
export function makeTaskChair(w, d, m, box, low = false) {
  const root = new THREE.Group();
  const mesh = (geometry, material, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    root.add(object);
    return object;
  };
  const tube = (points, radius, material) =>
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        low ? 6 : 16,
        radius,
        low ? 6 : 8,
        false,
      ),
      material,
    );
  const seat = new THREE.Shape();
  const x = w * 0.46,
    z = d * 0.44,
    r = Math.min(0.09, w * 0.18);
  seat.moveTo(-x + r, -z);
  seat.lineTo(x - r, -z);
  seat.quadraticCurveTo(x, -z, x, -z + r);
  seat.lineTo(x, z - r);
  seat.quadraticCurveTo(x, z, x - r, z);
  seat.lineTo(-x + r, z);
  seat.quadraticCurveTo(-x, z, -x, z - r);
  seat.lineTo(-x, -z + r);
  seat.quadraticCurveTo(-x, -z, -x + r, -z);
  const seatGeometry = new THREE.ExtrudeGeometry(seat, {
    depth: 0.065,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: low ? 1 : 3,
    curveSegments: low ? 4 : 12,
  });
  seatGeometry.rotateX(-Math.PI / 2);
  seatGeometry.translate(0, 0.44, 0);
  seatGeometry.computeVertexNormals();
  mesh(seatGeometry, m.textile);
  // Smooth two-sided ergonomic shell, with a closed thickness around its edge.
  const cols = low ? 8 : 20,
    rows = low ? 8 : 18,
    positions = [],
    uvs = [],
    indices = [];
  for (let side = 0; side < 2; side++)
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const u = (i / cols) * 2 - 1,
          v = j / rows;
        uvs.push((i / cols) * w, (j / rows) * 0.49);
        positions.push(
          u * w * (0.46 - 0.065 * v),
          0.51 + v * 0.49,
          -d * 0.35 +
            0.055 * u * u -
            0.06 * Math.sin(v * Math.PI) +
            0.07 * v +
            (side ? 0.018 : 0),
        );
      }
  const layer = (cols + 1) * (rows + 1);
  for (let side = 0; side < 2; side++)
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const a = side * layer + j * (cols + 1) + i,
          b = a + 1,
          c = a + cols + 1,
          e = c + 1;
        indices.push(...(side ? [a, c, b, b, c, e] : [a, b, c, b, e, c]));
      }
  const edge = [];
  for (let i = 0; i <= cols; i++) edge.push(i);
  for (let j = 1; j <= rows; j++) edge.push(j * (cols + 1) + cols);
  for (let i = cols - 1; i >= 0; i--) edge.push(rows * (cols + 1) + i);
  for (let j = rows - 1; j > 0; j--) edge.push(j * (cols + 1));
  edge.forEach((a, i) => {
    const b = edge[(i + 1) % edge.length];
    indices.push(a, a + layer, b, b, a + layer, b + layer);
  });
  const back = new THREE.BufferGeometry();
  back.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  back.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  back.setIndex(indices);
  back.computeVertexNormals();
  mesh(back, m.textile);
  tube(
    [
      [0, 0.25, 0],
      [0, 0.42, -d * 0.25],
      [0, 0.65, -d * 0.6],
      [0, 0.85, -d * 0.57],
    ],
    0.018,
    m.metal,
  );
  mesh(
    new THREE.CylinderGeometry(0.026, 0.035, 0.32, low ? 8 : 24),
    m.metal,
    0,
    0.25,
    0,
  );
  for (const side of [-1, 1]) {
    tube(
      [
        [side * w * 0.25, 0.42, 0],
        [side * w * 0.46, 0.49, -d * 0.15],
        [side * w * 0.47, 0.68, 0],
      ],
      0.012,
      m.metal,
    );
    root.add(
      box(side * w * 0.47, 0.7, 0.015, 0.06, 0.035, d * 0.55, m.dark, 0.015),
    );
  }
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5,
      dx = Math.cos(angle),
      dz = Math.sin(angle),
      reach = Math.max(w, d) * 0.54;
    tube(
      [
        [0, 0.14, 0],
        [dx * reach * 0.5, 0.12, dz * reach * 0.5],
        [dx * reach, 0.075, dz * reach],
      ],
      0.014,
      m.metal,
    );
    mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.05, low ? 6 : 12),
      m.metal,
      dx * reach,
      0.055,
      dz * reach,
    );
    for (const side of [-1, 1]) {
      const wheel = mesh(
        new THREE.CylinderGeometry(0.027, 0.027, 0.018, low ? 8 : 20),
        m.dark,
        dx * reach + side * 0.014,
        0.028,
        dz * reach,
      );
      wheel.rotation.z = Math.PI / 2;
    }
  }
  return root;
}
