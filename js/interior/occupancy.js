import * as THREE from "https://esm.sh/three@0.185.1";
import { mergeGeometries } from "https://esm.sh/three@0.185.1/examples/jsm/utils/BufferGeometryUtils.js";
import { STYLES } from "./state.js";

/* Every floor reads as occupied from outside: one merged mesh per floor plan (room
   finishes, partitions and furniture as simple blocks), instanced at each floor that
   uses the plan. A 100-floor tower with three plans costs six draw calls. The detailed
   stream still owns the active floor and its neighbours; this layer fills the rest. */
const HEIGHT = {
  bed: 0.55, sofa: 0.8, armchair: 0.8, chair: 0.85, table: 0.75, round_table: 0.75,
  desk: 0.75, coffee_table: 0.42, nightstand: 0.55, wardrobe: 2, storage: 1.8,
  counter: 0.92, fridge: 1.85, wc: 0.42, bath: 0.55, bath_tub: 0.55, basin: 0.85,
  sink: 0.9, rug: 0.012, plant: 1.1, lamp: 1.5, reception: 1.05,
};
const SKIP = new Set(["pendant", "ceiling_light", "pillow", "wc_tank", "hob", "shower"]);
const SANITARY = "#f2f2ef";

function tone(kind, s) {
  if (["bed"].includes(kind)) return s.linen;
  if (["sofa", "armchair"].includes(kind)) return s.soft;
  if (["wardrobe", "storage"].includes(kind)) return s.wood;
  if (["counter", "reception"].includes(kind)) return s.stone;
  if (kind === "fridge") return "#d6d8d9";
  if (["wc", "bath", "bath_tub", "basin", "sink"].includes(kind)) return SANITARY;
  if (kind === "plant") return "#5d7b4c";
  if (kind === "rug") return s.textile;
  if (kind === "lamp") return s.brass;
  if (kind === "chair") return s.metal;
  return s.wood;
}

export function createOccupancy({ data, floorPlan, polygonToGeometry, project, root, style }) {
  const group = new THREE.Group();
  group.name = "Occupied floors";
  root.add(group);
  /* A faint warm self-light: rooms read as lit spaces through tinted glass by day. */
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, emissive: new THREE.Color("#4a3c2c"), emissiveIntensity: 0.32 });
  const plans = new Map();          // planId -> { floors, shell, furniture }
  let job = 0, lastKey = "";
  data.floors.forEach((floor, index) => {
    if (floor.roof || !floor.planId) return;
    if (!plans.has(floor.planId)) plans.set(floor.planId, { floors: [], shell: null, furniture: null });
    plans.get(floor.planId).floors.push({ floor, index });
  });

  const tinted = (geometry, hex) => {
    if (!geometry) return null;
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.deleteAttribute("uv");
    const c = new THREE.Color(hex);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  };
  const extrude = (feature, depth, base, hex, out) => {
    const geometry = feature?.geometry;
    const polys = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
    for (const p of polys) {
      const g = tinted(polygonToGeometry(p, project, depth, base), hex);
      if (g) out.push(g);
    }
  };

  function buildPlan(planId, entry) {
    const s = STYLES[style()] || STYLES.warm;
    const plan = floorPlan(entry.floors[0].floor);
    const height = Math.max(0.5, entry.floors[0].floor.height - (data.slabThickness || 0.2) - 0.05);
    const shell = [], furniture = [];
    for (const room of plan.rooms || []) {
      const type = room.properties?.roomType || "";
      const hex = /bath|wc|kitchen|ensuite/.test(type) ? s.stone : /workspace|meeting|focus/.test(type) ? s.carpet : s.floor;
      extrude(room, 0.02, 0.012, hex, shell);
    }
    for (const corridor of plan.corridors || []) extrude(corridor, 0.02, 0.012, s.stone, shell);
    for (const wall of plan.walls || []) {
      if (!/interior|core/.test(wall.properties?.wallClass || "")) continue;
      extrude(wall, height, 0.03, s.wall, shell);
    }
    for (const item of plan.furniture || []) {
      const kind = item.properties?.kind;
      if (!kind || SKIP.has(kind)) continue;
      const h = HEIGHT[kind] ?? 0.7;
      extrude(item, h, kind === "rug" ? 0.034 : 0.04, tone(kind, s), furniture);
    }
    const make = (list) => {
      if (!list.length) return null;
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (list.length > 1) list.forEach((g) => g.dispose());
      if (!merged) return null;
      const mesh = new THREE.InstancedMesh(merged, material, entry.floors.length);
      mesh.userData.interiorManaged = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      entry.floors.forEach(({ floor }, i) => mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(0, floor.base, 0)));
      group.add(mesh);
      return mesh;
    };
    entry.shell = make(shell);
    entry.furniture = make(furniture);
  }

  const clearPlans = () => {
    plans.forEach((entry) => {
      for (const key of ["shell", "furniture"]) {
        if (!entry[key]) continue;
        entry[key].removeFromParent();
        entry[key].geometry.dispose();
        entry[key].dispose();
        entry[key] = null;
      }
    });
  };
  const idle = () => new Promise((resolve) => (window.requestIdleCallback || setTimeout)(resolve));

  return {
    group,
    /* Builds plans one per idle slot, those nearest the active floor first. */
    async ensure(activeIndex = 0) {
      const id = ++job;
      const order = [...plans.entries()]
        .filter(([, entry]) => !entry.shell && !entry.furniture)
        .sort((a, b) => Math.min(...a[1].floors.map((f) => Math.abs(f.index - activeIndex))) - Math.min(...b[1].floors.map((f) => Math.abs(f.index - activeIndex))));
      for (const [planId, entry] of order) {
        await idle();
        if (id !== job) return;
        buildPlan(planId, entry);
        lastKey = "";
      }
    },
    restyle(activeIndex) {
      job++;
      clearPlans();
      lastKey = "";
      return this.ensure(activeIndex);
    },
    /* Instances hide where the detailed stream already draws: the active floor entirely,
       its neighbours' partitions, and every floor above the cut. */
    sync({ enabled, walk, activeIndex, streamed, cut }) {
      group.visible = enabled && !walk;
      if (!group.visible) return;
      const key = `${activeIndex}|${[...streamed].join(",")}|${cut}`;
      if (key === lastKey) return;
      lastKey = key;
      const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
      plans.forEach((entry) => {
        entry.floors.forEach(({ floor, index }, i) => {
          const above = cut && index > activeIndex;
          const show = new THREE.Matrix4().makeTranslation(0, floor.base, 0);
          entry.shell?.setMatrixAt(i, above || streamed.has(index) ? hidden : show);
          entry.furniture?.setMatrixAt(i, above || index === activeIndex ? hidden : show);
        });
        if (entry.shell) entry.shell.instanceMatrix.needsUpdate = true;
        if (entry.furniture) entry.furniture.instanceMatrix.needsUpdate = true;
      });
    },
    get ready() {
      return [...plans.values()].every((entry) => entry.shell || entry.furniture || !floorPlan(entry.floors[0].floor).rooms?.length);
    },
    dispose() {
      job++;
      clearPlans();
      material.dispose();
      group.removeFromParent();
    },
  };
}
