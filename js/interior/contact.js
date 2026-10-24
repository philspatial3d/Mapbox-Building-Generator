import * as THREE from "https://esm.sh/three@0.185.1";
/** Shared floor-contact shading: one texture and one room-bounded batch, no lights. */
export function createContactMaterial() {
  const size = 64,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        r = Math.hypot(((x + 0.5) / size) * 2 - 1, ((y + 0.5) / size) * 2 - 1);
      data[i] = data[i + 1] = data[i + 2] = 28;
      data[i + 3] = Math.round(Math.pow(Math.max(0, 1 - r), 1.3) * 80);
    }
  const map = new THREE.DataTexture(data, size, size);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
