import * as THREE from "https://esm.sh/three@0.185.1";
/** One moving car; front is +Z. Shaft geometry remains owned by the floorplan. */
export function makeElevator(width, depth, height, materials) {
  const group = new THREE.Group(),
    doors = [];
  const box = (x, y, z, w, h, d, m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.userData.interiorManaged = true;
    group.add(mesh);
    return mesh;
  };
  box(0, 0.035, 0, width, 0.07, depth, materials.stone);
  box(0, height, 0, width, 0.06, depth, materials.linen);
  box(0, height / 2, -depth / 2, width, height, 0.055, materials.metal);
  for (const x of [-width / 2, width / 2])
    box(x, height / 2, 0, 0.055, height, depth, materials.metal);
  box(0, 1.35, -depth / 2 + 0.035, width * 0.62, 0.8, 0.01, materials.mirror);
  const opening = Math.min(1.15, width - 0.2);
  // Bridge the car-to-shaft clearance at the doorway. The moving car owns
  // this threshold; no stationary slab is left inside the shaft.
  box(0, 0.035, depth / 2 + 0.18, opening, 0.07, 0.4, materials.stone);
  for (const side of [-1, 1]) {
    const door = box(
      (side * opening) / 4,
      height / 2,
      depth / 2,
      opening / 2 - 0.01,
      height,
      0.035,
      materials.metal,
    );
    door.userData.side = side;
    doors.push(door);
  }
  box(width / 2 - 0.055, 1.25, depth * 0.2, 0.04, 0.4, 0.18, materials.dark);
  for (let i = 0; i < 6; i++)
    box(
      width / 2 - 0.08,
      1.1 + i * 0.05,
      depth * 0.2,
      0.02,
      0.025,
      0.025,
      materials.linen,
    );
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const display = new THREE.CanvasTexture(canvas);
  display.colorSpace = THREE.SRGBColorSpace;
  const displayMaterial = new THREE.MeshBasicMaterial({ map: display });
  const indicator = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.14),
    displayMaterial,
  );
  indicator.position.set(0, height - 0.22, -depth / 2 + 0.031);
  indicator.userData.ownedMaterial = true;
  indicator.userData.interiorManaged = true;
  group.add(indicator);
  let previous = null;
  return {
    group,
    width,
    depth,
    indicate(label) {
      if (label === previous) return;
      previous = label;
      const context = canvas.getContext("2d");
      context.fillStyle = "#17221f";
      context.fillRect(0, 0, 128, 64);
      context.fillStyle = "#dbe9cb";
      context.font = "bold 40px system-ui";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(label), 64, 32);
      display.needsUpdate = true;
    },
    contains(x, z, margin = 0) {
      const dx = x - group.position.x,
        dz = z - group.position.z;
      const angle = group.rotation.y;
      return (
        Math.abs(dx * Math.cos(angle) - dz * Math.sin(angle)) <
          width / 2 - margin &&
        Math.abs(dx * Math.sin(angle) + dz * Math.cos(angle)) <
          depth / 2 - margin
      );
    },
    containsLanding(x, z) {
      const dx = x - group.position.x, dz = z - group.position.z;
      const angle = group.rotation.y;
      const across = dx * Math.cos(angle) - dz * Math.sin(angle);
      const forward = dx * Math.sin(angle) + dz * Math.cos(angle);
      return Math.abs(across) < opening / 2 &&
        forward >= depth / 2 - 0.1 && forward <= depth / 2 + 0.4;
    },
    open(amount) {
      doors.forEach((d) => {
        d.position.x =
          d.userData.side *
          (opening / 4 + (Math.max(0, Math.min(1, amount)) * opening) / 2);
      });
    },
  };
}
