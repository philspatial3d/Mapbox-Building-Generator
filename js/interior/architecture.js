import * as THREE from "https://esm.sh/three@0.185.1";
import { insidePolygon } from "./state.js";

/** Metre UVs anchored to the building, including each piece's real elevation.
 * ExtrudeGeometry's default side UVs restart at every sill and lintel. */
export function worldUnitUVs(geometry) {
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const vertical = Math.abs(n.getY(i)) < 0.5;
    uv[i * 2] = vertical && Math.abs(n.getX(i)) > Math.abs(n.getZ(i))
      ? p.getZ(i) : p.getX(i);
    uv[i * 2 + 1] = vertical ? p.getY(i) : p.getZ(i);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Meshopt GLBs may retain normalized 16-bit vertex attributes. Expanding them
 * before baking is essential: translated metre coordinates overflow that
 * normalized storage and would put all imported furniture near the origin.
 */
export function bakeGeometry(geometry, matrix) {
  const copy = geometry.clone();
  for (const key of ["position", "normal", "tangent"]) {
    const source = copy.getAttribute(key);
    if (
      !source ||
      (!source.normalized &&
        source.array instanceof Float32Array &&
        !source.isInterleavedBufferAttribute)
    )
      continue;
    const values = new Float32Array(source.count * source.itemSize);
    for (let i = 0; i < source.count; i++) {
      values[i * source.itemSize] = source.getX(i);
      values[i * source.itemSize + 1] = source.getY(i);
      if (source.itemSize > 2) values[i * source.itemSize + 2] = source.getZ(i);
      if (source.itemSize > 3) values[i * source.itemSize + 3] = source.getW(i);
    }
    copy.setAttribute(key, new THREE.BufferAttribute(values, source.itemSize));
  }
  copy.boundingBox = copy.boundingSphere = null;
  return copy.applyMatrix4(matrix);
}

/** Split wall faces by the room on their outward-normal side, without duplicates.
 * Coordinates and the small room-side probe are in building-local metres.
 * Keeping the opposite faces independent lets a room change its finish without
 * rebuilding the wall or changing its neighbour's finish.
 */
export function wallSurfaces(geometry, rooms) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.attributes.position;
  const normal = source.attributes.normal;
  const buckets = new Map();
  for (let i = 0; i < position.count; i += 3) {
    const nx = normal.getX(i),
      nz = normal.getZ(i);
    const x =
      (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
    const z =
      (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
    const owner =
      Math.hypot(nx, nz) > 0.5
        ? rooms.find((r) =>
            r.polygons.some((p) =>
              insidePolygon(x + nx * 0.1, z + nz * 0.1, p),
            ),
          )?.id || ""
        : "";
    if (!buckets.has(owner)) buckets.set(owner, []);
    buckets.get(owner).push(i, i + 1, i + 2);
  }
  const parts = [];
  for (const [roomId, vertices] of buckets) {
    const part = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) {
      const values = new attribute.array.constructor(
        vertices.length * attribute.itemSize,
      );
      vertices.forEach((index, n) => {
        for (let k = 0; k < attribute.itemSize; k++)
          values[n * attribute.itemSize + k] =
            attribute.array[index * attribute.itemSize + k];
      });
      part.setAttribute(
        name,
        new THREE.BufferAttribute(
          values,
          attribute.itemSize,
          attribute.normalized,
        ),
      );
    }
    parts.push({ roomId, geometry: part });
  }
  if (source !== geometry) source.dispose();
  geometry.dispose();
  return parts;
}
