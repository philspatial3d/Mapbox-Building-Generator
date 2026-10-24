import * as THREE from "https://esm.sh/three@0.185.1";
import { mergeGeometries } from "https://esm.sh/three@0.185.1/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "https://esm.sh/three@0.185.1/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "https://esm.sh/three@0.185.1/examples/jsm/libs/meshopt_decoder.module.js";
import {
  createFloorState,
  createFloorStream,
  createElevator,
  migrateSettings,
  interiorStorageKey,
  STYLES,
  insidePolygon,
} from "./state.js";
import { mountFloorPicker } from "./floor-picker.js";
import { createInteriorEnvironment } from "./lighting.js";
import { palette, disposeFinishTextures } from "./materials.js";
import { makeElevator } from "./elevator.js";
import { createFixture } from "./furniture.js";
import { wallSurfaces, bakeGeometry, worldUnitUVs } from "./architecture.js";
import { createContactMaterial } from "./contact.js";
const ASSETS = {
  bed: "GothicBed_01",
  sofa: "sofa_02",
  armchair: "modern_arm_chair_01",
  chair: "dining_chair_02",
  table: "dining_table",
  coffee_table: "modern_coffee_table_01",
  plant: "potted_plant_01",
  pendant: "modern_ceiling_lamp_01",
};
const idle = () =>
  new Promise((resolve) => (window.requestIdleCallback || setTimeout)(resolve));
const polys = (f) =>
  f?.geometry?.type === "Polygon"
    ? [f.geometry.coordinates]
    : f?.geometry?.type === "MultiPolygon"
      ? f.geometry.coordinates
      : [];
const each = (list, fn) =>
  (list || []).forEach((f) =>
    polys(f).forEach((p) => fn(p, f.properties || {})),
  );
/** At most three floor groups. Shared model resources are owned by this library, not clones. */
const releasedBitmaps = new WeakSet();
function releaseTexture(texture) {
  // CPU image bitmaps belong to the finite model cache and close only at teardown.
  texture.dispose();
}

class Library {
  constructor(environment) {
    this.environment = environment;
    this.loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.cache = new Map();
    this.failures = new Set();
    this.sharedMaterials = new Map();
    this.images = new Set();
    this.disposed = false;
    this.workerCount = 0;
    this.workersReady = this.configureWorkers();
  }
  async configureWorkers() {
    if (typeof Worker === "undefined" || !MeshoptDecoder.useWorkers) return;
    let probe, url;
    try {
      url = URL.createObjectURL(
        new Blob(["self.postMessage(true)"], { type: "text/javascript" }),
      );
      const allowed = await new Promise((resolve) => {
        probe = new Worker(url);
        const timer = setTimeout(() => resolve(false), 1000);
        probe.onmessage = () => {
          clearTimeout(timer);
          resolve(true);
        };
        probe.onerror = (event) => {
          event.preventDefault();
          clearTimeout(timer);
          resolve(false);
        };
      });
      if (allowed && !this.disposed) {
        this.workerCount = Math.min(
          2,
          Math.max(1, Math.floor((navigator.hardwareConcurrency || 4) / 4)),
        );
        MeshoptDecoder.useWorkers(this.workerCount);
      }
    } catch {
      this.workerCount = 0;
    } finally {
      probe?.terminate();
      if (url) URL.revokeObjectURL(url);
    }
  }
  async get(id, level) {
    await this.workersReady;
    if (this.disposed) return null;
    const key = id + "/" + level;
    if (!this.cache.has(key))
      this.cache.set(
        key,
        this.loader
          .loadAsync(`./assets/interior/${key}.glb`)
          .then((g) => {
            g.scene.traverse((o) => {
              if (o.isMesh) {
                o.castShadow = false;
                o.receiveShadow = true;
                o.userData.sharedAsset = true;
                const materials = Array.isArray(o.material)
                  ? o.material
                  : [o.material];
                if (!this.sharedMaterials.has(id))
                  this.sharedMaterials.set(id, new Map());
                materials.forEach((m) =>
                  Object.values(m).forEach((t) => {
                    if (t?.isTexture && !t.userData.sharedInteriorEnvironment)
                      for (const image of Array.isArray(t.image)
                        ? t.image
                        : [t.image])
                        if (image && typeof image.close === "function")
                          this.images.add(image);
                  }),
                );
                const shared = this.sharedMaterials.get(id);
                materials.forEach((m) => {
                  m.envMap = this.environment;
                  m.envMapIntensity = 0.55;
                });
                o.material = materials.map((m, index) => {
                  const key = m.name || String(index);
                  if (!shared.has(key)) {
                    shared.set(key, m);
                    return m;
                  }
                  const previous = shared.get(key);
                  if (previous !== m) {
                    Object.values(m).forEach((t) => {
                      if (t?.isTexture && !t.userData.sharedInteriorEnvironment)
                        releaseTexture(t);
                    });
                    m.dispose();
                  }
                  return previous;
                });
                if (!Array.isArray(g.scene.material) && o.material.length === 1)
                  o.material = o.material[0];
              }
            });
            return g.scene;
          })
          .catch(() => {
            this.failures.add(id);
            return null;
          }),
      );
    return this.cache.get(key);
  }
  async trim(keepIds, signal) {
    for (const [key, promise] of [...this.cache]) {
      const id = key.split("/")[0];
      if (keepIds.has(id)) continue;
      const group = await promise;
      if (signal?.aborted) return;
      disposeGroup(group, true);
      // Keep the finite eight-model/two-LOD CPU cache. Only GPU resources are evicted.
      // ImageBitmaps can be shared across glTF material slots and must stay alive for re-upload.
    }
  }
  async dispose() {
    this.disposed = true;
    await this.workersReady;
    for (const promise of this.cache.values()) {
      const group = await promise;
      disposeGroup(group, true);
    }
    this.cache.clear();
    this.sharedMaterials.clear();
    for (const image of this.images)
      if (!releasedBitmaps.has(image)) {
        image.close();
        releasedBitmaps.add(image);
      }
    this.images.clear();
    MeshoptDecoder.useWorkers?.(0);
  }
}
function disposeGroup(group, shared = false) {
  shared = shared === true; // Array.forEach supplies an index as its second argument.
  if (!group) return;
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.sharedAsset && !shared) return;
    if (o.geometry) geometries.add(o.geometry);
    if (o.userData.ownedMaterial || shared)
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        materials.add(m),
      );
    if (o.isInstancedMesh) o.dispose();
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => {
    Object.values(m).forEach((t) => {
      if (t?.isTexture && !t.userData.sharedInteriorEnvironment)
        textures.add(t);
    });
    m.dispose();
  });
  textures.forEach((t) => releaseTexture(t));
  group.removeFromParent();
}
function batchRoom(group) {
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert(),
    buckets = new Map(),
    meshes = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.ceiling || Array.isArray(o.material)) return;
    const key =
      Boolean(o.userData.furniture) +
      "|" +
      (o.userData.surfaceOwner || "") +
      "|" +
      o.material.uuid +
      "|" +
      Object.entries(o.geometry.attributes)
        .map(
          ([k, a]) => k + a.array.constructor.name + a.itemSize + a.normalized,
        )
        .join(",") +
      "|" +
      Boolean(o.geometry.index);
    if (!buckets.has(key))
      buckets.set(key, { material: o.material, items: [] });
    buckets.get(key).items.push(o);
    meshes.push(o);
  });
  for (const bucket of buckets.values()) {
    const geometries = bucket.items.map((o) =>
      bakeGeometry(
        o.geometry,
        new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld),
      ),
    );
    const geometry =
      geometries.length === 1
        ? geometries[0]
        : mergeGeometries(geometries, false);
    if (!geometry) {
      geometries.forEach((g) => g.dispose());
      continue;
    }
    if (geometries.length > 1) geometries.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geometry, bucket.material);
    mesh.userData.interiorManaged = true;
    mesh.userData.surface = bucket.items[0].userData.surface;
    mesh.userData.surfaceOwner = bucket.items[0].userData.surfaceOwner;
    mesh.userData.furniture = Boolean(bucket.items[0].userData.furniture);
    mesh.receiveShadow = true;
    group.add(mesh);
    bucket.items.forEach((o) => {
      o.removeFromParent();
      if (!o.userData.sharedAsset) o.geometry.dispose();
    });
  }
}
function migratePayload(interior) {
  if (interior.schema === 2) return interior;
  const floors = (interior.floors || []).map((f, index) => ({
    id: `floor-${index}`,
    index,
    base: Number(f.base ?? f) || 0,
    height: interior.floorHeight || 3.2,
    planId:
      typeof f === "object" && Math.abs((Number(f.scale) || 1) - 1) > 0.001
        ? null
        : "legacy",
    plates: interior.rooms || [],
  }));
  return {
    schema: 2,
    legacy: true,
    settings: {},
    floors,
    plans: {
      legacy: {
        rooms: interior.rooms || [],
        walls: interior.walls || [],
        furniture: interior.furniture || [],
        openings: [],
        corridors: [],
      },
    },
  };
}
export function createInteriorScene({
  interior,
  site = null,
  revision = null,
  modelRoot,
  project,
  polygonToGeometry,
  renderer,
  physicallyTracked = () => false,
  onExplore = () => {},
  getQuality = () => "auto",
  onWalkStart = () => {},
}) {
  const environment = createInteriorEnvironment(renderer);
  const contactMaterial = createContactMaterial();
  const storedKey = interiorStorageKey(site);
  const data = migratePayload(interior);
  try {
    const saved = JSON.parse(localStorage.getItem(storedKey) || "null");
    if (saved?.revision === revision) data.settings = saved.settings;
  } catch {}
  const settings = migrateSettings(data.settings),
    store = createFloorState(data.floors, settings.activeFloor),
    library = new Library(environment.texture),
    palettes = new Map();
  const materialFor = (style) => {
    if (!palettes.has(style))
      palettes.set(style, palette(style, environment.texture));
    return palettes.get(style);
  };
  const root = new THREE.Group();
  root.name = "Streamed interiors";
  modelRoot.add(root);
  const host = document.createElement("div");
  host.id = "arInteriorControls";
  (document.getElementById("overlay") || document.body).append(host);
  for (const type of ["pointerdown", "pointermove", "pointerup", "wheel"])
    host.addEventListener(type, (event) => event.stopPropagation());
  const pickerHost = document.createElement("div");
  host.append(pickerHost);
  const tools = document.createElement("div");
  tools.className = "interior-tools";
  (document.getElementById("interiorToolsSlot") || host).append(tools);
  for (const type of ["pointerdown", "pointermove", "pointerup", "wheel"])
    tools.addEventListener(type, (event) => event.stopPropagation());
  tools.innerHTML =
    '<label>Style <select aria-label="Interior style"></select></label><label>Room <select aria-label="Room override"></select></label><label><input type="checkbox" aria-label="Section above active floor" checked> Cut away above</label><button type="button" data-walk>Virtual walkthrough</button><button type="button" data-exit hidden>Exit walkthrough</button><button type="button" data-forward hidden>Walk forward</button><button type="button" data-left hidden>Turn left</button><button type="button" data-right hidden>Turn right</button><label>Lift to <select aria-label="Elevator destination"></select></label><button type="button" data-lift>Floor preview</button><span role="status" data-lift-status>Floor preview never moves the tracked camera.</span><small>Furniture: Poly Haven · CC0. Camera feed stays on this device.</small>';
  const walkControls = document.createElement("div");
  walkControls.className = "interior-walk-controls";
  walkControls.setAttribute("role", "group");
  walkControls.setAttribute("aria-label", "Virtual walkthrough movement");
  walkControls.hidden = true;
  for (const key of ["left", "forward", "right", "exit"]) {
    const button = tools.querySelector(`[data-${key}]`);
    button.setAttribute("aria-label", button.textContent);
    if (key !== "exit")
      button.textContent = { left: "↶", forward: "↑", right: "↷" }[key];
    else button.textContent = "Exit walk";
    walkControls.append(button);
  }
  host.append(walkControls);
  const control = (selector) =>
    tools.querySelector(selector) || walkControls.querySelector(selector);
  const styleSelect = tools.querySelector('[aria-label="Interior style"]'),
    roomSelect = tools.querySelector('[aria-label="Room override"]'),
    cutaway = tools.querySelector("input"),
    destination = tools.querySelector('[aria-label="Elevator destination"]'),
    liftStatus = tools.querySelector("[data-lift-status]");
  Object.entries(STYLES).forEach(([id, p]) =>
    styleSelect.add(new Option(p.name, id)),
  );
  styleSelect.value = settings.style;
  data.floors
    .filter((f) => !f.roof)
    .forEach((f, i) =>
      destination.add(new Option(i === 0 ? "G" : String(i), String(i))),
    );
  let groups = [],
    active = null,
    walk = false,
    yaw = 0,
    pitch = -0.1,
    disposed = false,
    enabled = false,
    buildStarted = performance.now(),
    loadMs = 0,
    roomLoadMs = 0;
  const position = new THREE.Vector3();
  const camera = new THREE.PerspectiveCamera(
      65,
      innerWidth / innerHeight,
      0.03,
      2000,
    ),
    keys = new Set(),
    cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
    worldPlane = new THREE.Plane();
  const clippingPlanes = [worldPlane];
  renderer.localClippingEnabled = true;
  let roomJob = null;
  const picker = mountFloorPicker(pickerHost, store, (index) => {
    roomJob?.abort();
    if (!arrivingByLift) lift.cancel();
    if (store.current.roof && walk) setWalk(false);
    settings.activeFloor = index;
    persist();
    onExplore();
    enabled = true;
    buildStarted = performance.now();
    picker.busy(true);
    stream.select(index, data.floors.length);
  });
  const persist = () => {
    data.settings = migrateSettings(settings);
    if (!storedKey) return;
    try {
      localStorage.setItem(
        storedKey,
        JSON.stringify({ revision, settings: data.settings }),
      );
    } catch {}
  };

  // Only this payload's settings are persisted. It never writes mbg.session.v1 or calibration.
  const floorPlan = (f) =>
    data.plans[f.planId] || {
      rooms: [],
      walls: [],
      furniture: [],
      openings: [],
      corridors: [],
      elevators: [],
    };
  const localPolys = (list) => {
    const result = [];
    each(list, (p) =>
      result.push(
        p.map((r) =>
          r.map((c) => {
            const v = project(c[0], c[1]);
            return [v.x, -v.y];
          }),
        ),
      ),
    );
    return result;
  };
  const collisionCache = new Map();
  const placeable = (floor, x, z, r = 0.22) => {
    if (!collisionCache.has(floor.id))
      collisionCache.set(floor.id, {
        plate: localPolys(floorPlan(floor).finishPlates || floor.plates),
        walls: localPolys(
          (floorPlan(floor).walls || []).filter(
            (w) => w.properties?.wallClass !== "window-lintel",
          ),
        ),
        objects: localPolys(
          (floorPlan(floor).furniture || []).filter(
            (f) =>
              settings.furnishing[floor.id + "/" + f.properties?.roomId] !==
                "clear" &&
              ![
                "rug",
                "pillow",
                "hob",
                "sink",
                "pendant",
                "ceiling_light",
              ].includes(f.properties?.kind),
          ),
        ),
      });
    const { plate, walls, objects } = collisionCache.get(floor.id);
    return [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
    ].every(
      ([a, b]) =>
        (plate.some((p) => insidePolygon(x + a, z + b, p)) ||
          (car &&
            Math.abs(car.group.position.y - floor.base) < 0.1 &&
            (car.contains(x + a, z + b) ||
              (doorOpenness > 0.8 && car.containsLanding(x + a, z + b))))) &&
        !walls.some((p) => insidePolygon(x + a, z + b, p)) &&
        !objects.some((p) => insidePolygon(x + a, z + b, p)),
    );
  };
  const arch = (group, p, depth, base, material, tag) => {
    const geo = polygonToGeometry(p, project, depth, base);
    if (!geo) return;
    worldUnitUVs(geo);
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.userData.interiorManaged = true;
    mesh.userData.surface = tag;
    group.add(mesh);
    return mesh;
  };
  async function furnish(
    group,
    floor,
    plan,
    signal,
    onlyRoom = null,
    requestedLevel = null,
  ) {
    let count = 0;
    const counters = (plan.furniture || []).filter(
      (f) => f.properties.kind === "counter",
    );
    const parentByObject = new Map();
    for (const child of (plan.furniture || []).filter((f) =>
      ["sink", "hob"].includes(f.properties.kind),
    )) {
      const ring = localPolys([child])[0]?.[0];
      if (!ring) continue;
      const x = ring.reduce((s, p) => s + p[0], 0) / ring.length,
        z = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      const parent = counters.find(
        (counter) =>
          counter.properties.roomId === child.properties.roomId &&
          (child.properties.parentObjectId
            ? counter.properties.objectId === child.properties.parentObjectId
            : localPolys([counter]).some((p) => insidePolygon(x, z, p))),
      );
      if (parent) parentByObject.set(child, parent);
    }
    const featured =
      onlyRoom ||
      plan.rooms?.find((r) =>
        /living|workspace|bedroom|meeting/.test(r.properties.roomType),
      )?.properties.roomId;
    const items = [...(plan.furniture || [])].sort(
      (a, b) =>
        Number(b.properties.roomId === featured) -
          Number(a.properties.roomId === featured) ||
        Number(["pendant", "plant", "rug"].includes(b.properties.kind)) -
          Number(["pendant", "plant", "rug"].includes(a.properties.kind)),
    );
    for (const item of items) {
      if (onlyRoom && item.properties?.roomId !== onlyRoom) continue;
      if (signal.aborted) {
        return null;
      }
      const kind = item.properties?.kind;
      if (kind === "hob" && parentByObject.has(item)) continue;
      if (kind === "pillow" || kind === "wc_tank") continue;
      const p = polys(item)[0];
      if (!p) continue;
      const points = p[0].slice(0, -1).map((c) => {
        const v = project(c[0], c[1]);
        return new THREE.Vector2(v.x, -v.y);
      });
      if (points.length < 3) continue;
      const edge = points[1].clone().sub(points[0]),
        next = points[2].clone().sub(points[1]);
      const axis = edge.clone().normalize(),
        across = new THREE.Vector2(-axis.y, axis.x);
      const alongs = points.map((p) => p.dot(axis)),
        crosses = points.map((p) => p.dot(across));
      let w = Math.max(...alongs) - Math.min(...alongs),
        d = Math.max(...crosses) - Math.min(...crosses),
        angle = -Math.atan2(edge.y, edge.x);
      if (w < 0.1 || d < 0.1) continue;
      const center = points
        .reduce((v, p) => v.add(p), new THREE.Vector2())
        .divideScalar(points.length);
      const room =
        group.userData.rooms.find(
          (r) => r.userData.roomId === item.properties.roomId,
        ) || group;
      const rm = materialFor(room.userData.style || settings.style);
      if (kind === "rug") {
        const mesh = arch(room, p, 0.008, 0.042, rm.textile, "textile");
        if (mesh) {
          mesh.userData.furniture = true;
          mesh.userData.objectId = item.properties?.objectId;
          count++;
        }
        if (count >= (onlyRoom ? 48 : 24)) break;
        continue;
      }
      const lowDetail =
        requestedLevel === "low" ||
        getQuality() === "performance" ||
        (!onlyRoom &&
          Math.hypot(center.x - position.x, center.y - position.z) > 8);
      let object;
      const roomType = plan.rooms?.find(
        (r) => r.properties.roomId === item.properties.roomId,
      )?.properties.roomType;
      const id =
        /workspace|meeting|focus/.test(roomType) &&
        ["table", "chair"].includes(kind)
          ? null
          : ASSETS[kind];
      if (id) {
        const template = await library.get(id, lowDetail ? "low" : "high");
        if (signal.aborted) return null;
        if (template) {
          object = template.clone(true);
          const box = new THREE.Box3().setFromObject(object),
            size = box.getSize(new THREE.Vector3());
          if (w > d !== size.x > size.z) {
            [w, d] = [d, w];
            angle += Math.PI / 2;
          }
          const k = Math.min(
            1.15,
            w / Math.max(0.01, size.x),
            d / Math.max(0.01, size.z),
          );
          object.scale.setScalar(k);
          if (
            (kind === "table" && size.y * k < 0.7) ||
            (kind === "chair" && size.y * k < 0.8) ||
            (kind === "bed" && Math.max(size.x, size.z) * k < 1.85)
          )
            object = null;
        }
      }
      if (!object) {
        if (
          [
            "desk",
            "counter",
            "wardrobe",
            "storage",
            "table",
            "coffee_table",
            "reception",
          ].includes(kind) &&
          w < d
        ) {
          [w, d] = [d, w];
          angle += Math.PI / 2;
        }
        const features =
          kind === "counter"
            ? (plan.furniture || [])
                .filter((f) => parentByObject.get(f) === item)
                .map((f) => {
                  const points = localPolys([f])[0][0].map(([x, z]) => [
                    (x - center.x) * Math.cos(angle) -
                      (z - center.y) * Math.sin(angle),
                    (x - center.x) * Math.sin(angle) +
                      (z - center.y) * Math.cos(angle),
                  ]);
                  const xs = points.map((p) => p[0]),
                    zs = points.map((p) => p[1]),
                    minX = Math.min(...xs),
                    maxX = Math.max(...xs),
                    minZ = Math.min(...zs),
                    maxZ = Math.max(...zs);
                  return {
                    kind: f.properties.kind,
                    x: (minX + maxX) / 2,
                    z: (minZ + maxZ) / 2,
                    width: maxX - minX,
                    depth: maxZ - minZ,
                  };
                })
            : [];
        object = createFixture(
          kind === "chair" && !/workspace|meeting|focus/.test(roomType)
            ? "dining_chair"
            : kind,
          w,
          d,
          rm,
          lowDetail,
          features,
        );
      }
      if (kind === "desk" && settings.cubicles)
        object.add(createFixture("cubicle_screen", w, d, rm));
      const objectHeight = new THREE.Box3()
        .setFromObject(object)
        .getSize(new THREE.Vector3()).y;
      object.position.set(
        center.x,
        ["pendant", "ceiling_light"].includes(kind)
          ? Math.max(
              0.1,
              floor.height - (data.slabThickness || 0.2) - objectHeight - 0.02,
            )
          : 0.04,
        center.y,
      );
      object.rotation.y = Number.isFinite(item.properties?.facing)
        ? Math.PI - (item.properties.facing * Math.PI) / 180
        : angle + (item.properties?.reverse ? Math.PI : 0);
      object.userData.floorId = floor.id;
      object.userData.objectId = `${floor.id}/${item.properties?.objectId || "object-" + count}`;
      object.traverse((o) => {
        o.userData.furniture = true;
      });
      room.add(object);
      if (
        ![
          "pendant",
          "ceiling_light",
          "rug",
          "pillow",
          "sink",
          "hob",
          "wc_tank",
        ].includes(kind)
      ) {
        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 1.04, d * 1.04),
          contactMaterial,
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.rotation.z = object.rotation.y;
        shadow.position.set(center.x, 0.055, center.y);
        shadow.userData.furniture = true;
        room.add(shadow);
      }
      count++;
      if (count % 8 === 0) await idle();
      if (count >= (onlyRoom ? 48 : 24)) break;
    }
  }
  async function build(index, signal) {
    await idle();
    if (signal.aborted) return null;
    const floor = data.floors[index],
      plan = floorPlan(floor),
      group = new THREE.Group();
    group.name = floor.id;
    group.userData.floor = floor;
    group.userData.rooms = [];
    group.position.y = floor.base;
    const mats = materialFor(settings.style),
      height = Math.max(0.5, floor.height - (data.slabThickness || 0.2));
    if (floor.roof) return group;
    each(plan.finishPlates || floor.plates, (p) =>
      arch(group, p, 0.012, 0.005, mats.stone, "stone"),
    );
    each(plan.rooms, (p, props) => {
      const room = new THREE.Group();
      room.userData.roomId = props.roomId;
      room.userData.floorId = floor.id;
      room.userData.polygons = localPolys([
        { geometry: { type: "Polygon", coordinates: p } },
      ]);
      room.userData.style =
        settings.rooms[`${floor.id}/${props.roomId}`] || settings.style;
      const rm = materialFor(room.userData.style);
      const finish = /bath|wc|kitchen/.test(props.roomType)
        ? "tile"
        : /workspace|meeting|focus/.test(props.roomType)
          ? "carpet"
          : "floor";
      arch(room, p, 0.025, 0.015, rm[finish], finish);
      const ceiling = arch(room, p, 0.025, height - 0.04, rm.wall, "wall");
      ceiling.userData.ceiling = true;
      // Polygon vertices already use building-local metres. Do not derive this
      // from world bounds before the streamed group has joined modelRoot: its
      // parent matrices may still describe the detached build, hiding room 0.
      ceiling.geometry.computeBoundingBox();
      room.userData.center = ceiling.geometry.boundingBox.getCenter(
        new THREE.Vector3(),
      );
      room.userData.bounds = ceiling.geometry.boundingBox.clone();
      group.add(room);
      group.userData.rooms.push(room);
    });
    each(plan.corridors, (p) =>
      arch(group, p, 0.025, 0.015, mats.stone, "stone"),
    );
    const roomRegions = (plan.rooms || []).map((room) => ({
      id: room.properties.roomId,
      polygons: localPolys([room]),
    }));
    each(plan.walls, (p, props) => {
      const sill = Math.min(0.85, height * 0.3),
        head = Math.min(2.15, height - 0.25);
      const base = props.wallClass === "window-lintel" ? head : 0.04;
      const top = props.wallClass === "window-sill" ? sill : height;
      const wall = polygonToGeometry(p, project, top - base, base);
      if (wall) worldUnitUVs(wall);
      if (wall)
        for (const part of wallSurfaces(wall, roomRegions)) {
          const style =
            settings.rooms[`${floor.id}/${part.roomId}`] || settings.style;
          const mesh = new THREE.Mesh(part.geometry, materialFor(style).wall);
          mesh.userData.surface = "wall";
          mesh.userData.surfaceOwner = part.roomId;
          mesh.userData.interiorManaged = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        }
    });
    each(plan.skirtings, (p) => arch(group, p, 0.09, 0.04, mats.wood, "wood"));
    for (const opening of plan.openings || []) {
      if (opening.properties?.passage) continue;
      const [a, b] = opening.geometry.coordinates.map((c) => {
        const p = project(c[0], c[1]);
        return new THREE.Vector3(p.x, 0, -p.y);
      });
      const w = a.distanceTo(b),
        center = a.clone().add(b).multiplyScalar(0.5),
        h = Math.min(2.2, height - 0.15),
        frame = new THREE.Group();
      frame.position.copy(center);
      frame.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      for (const x of [-w / 2, w / 2]) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, h, 0.16),
          mats.wood,
        );
        mesh.position.set(x, h / 2, 0);
        frame.add(mesh);
      }
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.1, 0.06, 0.16),
        mats.wood,
      );
      top.position.y = h;
      frame.add(top);
      if (height > h + 0.1) {
        const header = new THREE.Mesh(
          new THREE.BoxGeometry(w, height - h, 0.12),
          mats.wall,
        );
        header.position.y = (height + h) / 2;
        frame.add(header);
      }
      const threshold = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.012, 0.15),
        mats.stone,
      );
      threshold.position.y = 0.035;
      frame.add(threshold);
      group.add(frame);
    }
    // Furniture is bounded to one floor; room visits refill only the affected room.
    if (index === store.index) await furnish(group, floor, plan, signal);
    if (signal.aborted) {
      disposeGroup(group);
      return null;
    }
    group.userData.rooms.forEach(batchRoom);
    // Batch remaining architectural surfaces without merging independently culled rooms.
    const roomGroups = group.userData.rooms;
    roomGroups.forEach((r) => group.remove(r));
    batchRoom(group);
    roomGroups.forEach((r) => group.add(r));
    group.traverse((o) => {
      o.userData.interiorManaged = true;
    });
    return group;
  }
  function syncRooms() {
    roomSelect.replaceChildren(new Option("Whole building", ""));
    const names = {
      living: "Living room",
      bedroom: "Bedroom",
      bath: "Bathroom",
      wc: "Washroom",
      ensuite: "Ensuite",
      hall: "Hall",
      kitchen: "Kitchen",
      studio: "Studio",
      workspace: "Open workspace",
      meeting: "Meeting room",
      focus: "Private office",
      collab: "Lounge",
      pantry: "Pantry",
      print: "Print room",
      reception: "Reception",
      dressing: "Dressing room",
      storage: "Storage",
      utility: "Utility",
    };
    (floorPlan(store.current).rooms || []).forEach((r, index) =>
      roomSelect.add(
        new Option(
          `${names[r.properties.roomType] || r.properties.roomType} · ${index + 1}`,
          r.properties.roomId,
        ),
      ),
    );
    destination.value = String(Math.min(store.index, data.floors.length - 2));
    styleSelect.value = settings.style;
  }
  roomSelect.onchange = () => {
    styleSelect.value =
      settings.rooms[`${store.current.id}/${roomSelect.value}`] ||
      settings.style;
  };
  const stream = createFloorStream(
    build,
    disposeGroup,
    (next, index, error) => {
      groups = next;
      next.forEach((g) => root.add(g));
      active = next.find((g) => g.userData.floor === data.floors[index]);
      loadMs = performance.now() - buildStarted;
      picker.busy(
        false,
        error
          ? "Floor unavailable: " + error.message
          : `${data.floors[index].roof ? "Roof" : "Floor " + index} ready · ${Math.round(loadMs)} ms`,
      );
      syncRooms();
      if (car) {
        disposeGroup(car.group);
        car = null;
      }
      const shaft = (floorPlan(store.current).elevators || [])[0];
      if (shaft) {
        const ring = localPolys([shaft])[0]?.[0];
        if (ring) {
          const xs = ring.map((p) => p[0]),
            zs = ring.map((p) => p[1]);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2,
            cz = (Math.min(...zs) + Math.max(...zs)) / 2,
            target = shaft.properties?.doorTarget,
            projected = target ? project(target[0], target[1]) : null,
            angle = projected
              ? Math.atan2(projected.x - cx, -projected.y - cz)
              : 0;
          const localX = ring.map(
            ([x, z]) => (x - cx) * Math.cos(angle) - (z - cz) * Math.sin(angle),
          );
          const localZ = ring.map(
            ([x, z]) => (x - cx) * Math.sin(angle) + (z - cz) * Math.cos(angle),
          );
          car = makeElevator(
            Math.max(1.2, Math.max(...localX) - Math.min(...localX) - 0.25),
            Math.max(1.2, Math.max(...localZ) - Math.min(...localZ) - 0.25),
            Math.min(2.4, store.current.height - 0.3),
            materialFor(settings.style),
          );
          car.group.position.set(cx, store.current.base, cz);
          car.group.rotation.y = angle;
          car.indicate(store.index === 0 ? "G" : store.index);
          root.add(car.group);
          carOrigin = car.group.position.clone();
        }
      }
      if (walk) {
        if (arrivingByLift && car) {
          position.set(
            car.group.position.x,
            store.current.base + 1.65,
            car.group.position.z,
          );
          yaw = car.group.rotation.y + Math.PI;
          arrivingByLift = false;
        } else enterRoom();
      }
    },
  );
  let car = null,
    carOrigin = null,
    doorOpenness = 0,
    arrivingByLift = false;
  const lift = createElevator((stage) => {
    liftStatus.textContent = `Lift · ${stage.replaceAll("_", " ")}${walk ? " · virtual walkthrough" : " · floor preview"}`;
    tools.querySelector("[data-lift]").textContent =
      stage === "boarding"
        ? "Board & travel"
        : walk
          ? "Call lift"
          : "Floor preview";
    if (stage === "arrived") {
      arrivingByLift = true;
      store.select(lift.destination);
    }
  });
  function enterRoom() {
    const floor = store.current;
    if (!floor || floor.roof) return;
    const plan = floorPlan(floor),
      chosen = roomSelect.value
        ? (plan.rooms || []).filter(
            (r) => r.properties.roomId === roomSelect.value,
          )
        : (plan.rooms || []).filter((r) =>
            /living|workspace|bedroom|meeting/.test(r.properties.roomType),
          );
    const candidates = [
      ...localPolys(chosen),
      ...localPolys(plan.corridors),
      ...localPolys(plan.rooms),
    ];
    const heroes = (plan.furniture || [])
      .filter(
        (f) =>
          ["sofa", "bed", "desk", "table"].includes(f.properties?.kind) &&
          (!roomSelect.value || f.properties.roomId === roomSelect.value),
      )
      .map((f) => {
        const ring = localPolys([f])[0]?.[0]?.slice(0, -1);
        return ring?.length
          ? {
              x: ring.reduce((s, p) => s + p[0], 0) / ring.length,
              z: ring.reduce((s, p) => s + p[1], 0) / ring.length,
            }
          : null;
      })
      .filter(Boolean);
    for (const p of candidates) {
      const ring = p[0],
        xs = ring.map((v) => v[0]),
        zs = ring.map((v) => v[1]),
        cx = (Math.min(...xs) + Math.max(...xs)) / 2,
        cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      const samples = [];
      for (let x = Math.min(...xs) + 0.6; x < Math.max(...xs); x += 0.45)
        for (let z = Math.min(...zs) + 0.6; z < Math.max(...zs); z += 0.45)
          if (insidePolygon(x, z, p) && placeable(floor, x, z))
            samples.push([x, z]);
      const visibleHeroes = heroes.filter((h) => insidePolygon(h.x, h.z, p));
      const viewScore = ([x, z]) => {
        const distances = visibleHeroes
          .filter((h) =>
            Array.from({ length: 9 }, (_, i) => (i + 1) / 10).every((t) =>
              insidePolygon(x + (h.x - x) * t, z + (h.z - z) * t, p),
            ),
          )
          .map((h) => Math.abs(Math.hypot(h.x - x, h.z - z) - 3.2));
        return (
          (distances.length ? Math.min(...distances) : 10) +
          Math.hypot(x - cx, z - cz) * 0.08
        );
      };
      samples.sort((a, b) => viewScore(a) - viewScore(b));
      if (!samples.length) continue;
      const [x, z] = samples[0];
      position.set(x, floor.base + 1.65, z);
      const views = Array.from({ length: 16 }, (_, i) => {
        const angle = (i * Math.PI) / 8;
        let distance = 0.2;
        while (
          distance < 8 &&
          placeable(
            floor,
            x - Math.sin(angle) * distance,
            z - Math.cos(angle) * distance,
            0.05,
          )
        )
          distance += 0.2;
        return { angle, distance };
      }).sort((a, b) => b.distance - a.distance);
      const subjects = visibleHeroes
        .map((h) => ({ ...h, d: Math.hypot(h.x - x, h.z - z) }))
        .filter((h) => h.d > 1.2 && h.d < 9)
        .sort((a, b) => Math.abs(a.d - 3.2) - Math.abs(b.d - 3.2));
      yaw = subjects.length
        ? Math.atan2(-(subjects[0].x - x), -(subjects[0].z - z))
        : views[0].angle;
      pitch = -0.1;
      return;
    }
    liftStatus.textContent =
      "No clear standing position on this floor. Use the section preview.";
    walk = false;
  }

  function setWalk(value) {
    if (value && data.legacy) {
      liftStatus.textContent =
        "Regenerate this building in the map for a navigable interior.";
      return;
    }
    walk = value && !physicallyTracked() && !store.current.roof;
    control("[data-exit]").hidden = !walk;
    walkControls.hidden = !walk;
    walkControls
      .querySelectorAll("[data-forward],[data-left],[data-right]")
      .forEach((b) => (b.hidden = !walk));
    tools.querySelector("[data-lift]").textContent = walk
      ? "Call / board lift"
      : "Floor preview";
    if (walk) {
      document.body.classList.add("interior-walk");
      onWalkStart();
      enabled = true;
      root.visible = true;
      if (!groups.length) {
        onExplore();
        buildStarted = performance.now();
        picker.busy(true);
        stream.select(store.index, data.floors.length);
      } else enterRoom();
    } else {
      document.body.classList.remove("interior-walk");
      lift.cancel();
    }
  }
  tools.querySelector("[data-walk]").onclick = () => {
    if (physicallyTracked()) {
      liftStatus.textContent =
        "Exit physical AR before using the virtual walkthrough.";
      return;
    }
    setWalk(true);
  };
  control("[data-exit]").onclick = () => setWalk(false);
  const move = (step) => {
    const f = store.current;
    if (!walk || !f || !["idle", "boarding", "arrived"].includes(lift.state))
      return;
    const x = position.x - Math.sin(yaw) * step,
      z = position.z - Math.cos(yaw) * step;
    if (
      car &&
      doorOpenness < 0.8 &&
      Math.hypot(x - car.group.position.x, z - car.group.position.z) < 1.25
    )
      return;
    if (placeable(f, x, z)) {
      position.x = x;
      position.z = z;
      if (
        car &&
        lift.state === "arrived" &&
        Math.hypot(x - car.group.position.x, z - car.group.position.z) > 1.7
      )
        lift.exit();
    }
  };
  const furnishing = document.createElement("button");
  furnishing.textContent = "Clear / restore room furniture";
  furnishing.onclick = () => {
    if (!roomSelect.value) {
      liftStatus.textContent = "Choose a room first.";
      return;
    }
    const key = store.current.id + "/" + roomSelect.value;
    if (settings.furnishing[key]) delete settings.furnishing[key];
    else settings.furnishing[key] = "clear";
    persist();
    collisionCache.delete(store.current.id);
  };
  tools.append(furnishing);
  const clearFurniture = (room) => {
    room.children
      .filter((child) => child.userData.furniture)
      .forEach(disposeGroup);
    room.userData.furnished = false;
  };
  let hydrationBusy = 0;
  async function hydrateRoom(
    room,
    force = false,
    level = getQuality() === "performance" ? "low" : "high",
  ) {
    if (
      !room ||
      (room.userData.furnished && !force) ||
      (room.userData.loading && !force)
    )
      return false;
    const roomStarted = performance.now();
    roomJob?.abort();
    roomJob = new AbortController();
    const signal = roomJob.signal,
      floor = store.current,
      owner = active;
    const temporary = new THREE.Group();
    temporary.userData.roomId = room.userData.roomId;
    temporary.userData.style = room.userData.style;
    room.userData.loading = signal;
    hydrationBusy++;
    picker.busy(true, "Loading room…");
    try {
      await idle();
      await furnish(
        { userData: { rooms: [temporary] } },
        floor,
        floorPlan(floor),
        signal,
        room.userData.roomId,
        level,
      );
      if (signal.aborted || owner !== active) {
        disposeGroup(temporary);
        return false;
      }
      batchRoom(temporary);
      const currentMaterials = materialFor(
        room.userData.style || settings.style,
      );
      temporary.traverse((o) => {
        if (o.userData.surface)
          o.material = currentMaterials[o.userData.surface] || o.material;
      });
      clearFurniture(room);
      for (const child of [...temporary.children]) room.add(child);
      room.userData.furnished = true;
      if (level !== "low" || !room.userData.lastUse)
        room.userData.lastUse = performance.now();
      room.userData.lod = level;
      // A short room LRU retains the previous connected spaces without furnishing a tower.
      const resident = owner.userData.rooms
        .filter((r) => r.children.some((c) => c.userData.furniture))
        .sort((a, b) => (b.userData.lastUse || 0) - (a.userData.lastUse || 0));
      resident.slice(3).forEach(clearFurniture);
      const roomIds = new Set(
        resident.slice(0, 3).map((r) => r.userData.roomId),
      );
      const needed = new Set(
        (floorPlan(floor).furniture || [])
          .filter((f) => roomIds.has(f.properties.roomId))
          .map((f) => ASSETS[f.properties.kind])
          .filter(Boolean),
      );
      await library.trim(needed, signal);
      if (signal.aborted) return false;
      room.traverse((o) => {
        o.userData.interiorManaged = true;
      });
      roomLoadMs = performance.now() - roomStarted;
      return true;
    } catch (error) {
      disposeGroup(temporary);
      if (!signal.aborted)
        liftStatus.textContent =
          "Room unavailable. Choose another room or retry.";
      return false;
    } finally {
      hydrationBusy--;
      if (room.userData.loading === signal) room.userData.loading = null;
      if (!signal.aborted) picker.busy(false, "Room ready");
    }
  }
  let candidateRoom = null,
    candidateSince = 0;
  const visit = document.createElement("button");
  visit.textContent = "Visit room";
  visit.onclick = async () => {
    if (physicallyTracked()) return;
    const room = active?.userData.rooms.find(
      (r) => r.userData.roomId === roomSelect.value,
    );
    if (room) await hydrateRoom(room);
    setWalk(true);
    enterRoom();
  };
  tools.append(visit);
  const landing = document.createElement("button");
  landing.textContent = "Visit lift landing";
  landing.onclick = () => {
    if (physicallyTracked()) {
      liftStatus.textContent = "Use Floor preview while physical AR is active.";
      return;
    }
    if (!car) {
      liftStatus.textContent = "Choose an interior floor with a lift first.";
      return;
    }
    const angle = car.group.rotation.y;
    let point = null;
    for (const distance of [
      car.depth / 2 + 0.7,
      car.depth / 2 + 1.1,
      car.depth / 2 + 1.5,
    ]) {
      const x = car.group.position.x + Math.sin(angle) * distance;
      const z = car.group.position.z + Math.cos(angle) * distance;
      if (placeable(store.current, x, z)) {
        point = [x, z];
        break;
      }
    }
    if (!point) {
      liftStatus.textContent =
        "No clear lift landing on this plate. Use Floor preview.";
      return;
    }
    setWalk(true);
    position.set(point[0], store.current.base + 1.65, point[1]);
    yaw = angle;
    liftStatus.textContent =
      "Choose a destination, then call and board the lift.";
  };
  tools.append(landing);
  const cubicleLabel = document.createElement("label");
  cubicleLabel.innerHTML =
    '<input type="checkbox" aria-label="Workspace desk screens"> Workspace desk screens';
  const cubicleInput = cubicleLabel.querySelector("input");
  cubicleInput.checked = settings.cubicles;
  cubicleInput.onchange = () => {
    settings.cubicles = cubicleInput.checked;
    persist();
    const workspaceIds = new Set(
      (floorPlan(store.current).rooms || [])
        .filter((r) => r.properties.roomType === "workspace")
        .map((r) => r.properties.roomId),
    );
    const room =
      active?.userData.rooms.find(
        (r) =>
          workspaceIds.has(r.userData.roomId) &&
          (r.userData.roomId === roomSelect.value || r === candidateRoom),
      ) ||
      active?.userData.rooms.find((r) => workspaceIds.has(r.userData.roomId));
    if (room) void hydrateRoom(room, true);
    else liftStatus.textContent = "Desk screens apply to office workspaces.";
  };
  tools.append(cubicleLabel);
  control("[data-forward]").onclick = () => move(0.25);
  control("[data-left]").onclick = () => {
    yaw += Math.PI / 8;
  };
  control("[data-right]").onclick = () => {
    yaw -= Math.PI / 8;
  };
  tools.querySelector("[data-lift]").onclick = () => {
    if (!walk) {
      store.select(destination.value);
      return;
    }
    if (lift.state === "boarding") {
      if (car)
        position.set(
          car.group.position.x,
          store.current.base + 1.65,
          car.group.position.z,
        );
      lift.board();
      return;
    }
    if (
      car &&
      Math.hypot(
        position.x - car.group.position.x,
        position.z - car.group.position.z,
      ) > 3
    ) {
      liftStatus.textContent =
        "Walk to the lift landing before calling the car.";
      return;
    }
    if (!(floorPlan(store.current).elevators || []).length) {
      liftStatus.textContent =
        "This floor has no lift. Choose a floor preview instead.";
      return;
    }
    const targetPlan = floorPlan(data.floors[Number(destination.value)]),
      targetShaft = (targetPlan.elevators || [])[0];
    const targetRing = targetShaft ? localPolys([targetShaft])[0]?.[0] : null;
    if (!targetRing) {
      liftStatus.textContent =
        "No lift landing at this floor. Use floor preview.";
      return;
    }
    const tx =
        (Math.min(...targetRing.map((p) => p[0])) +
          Math.max(...targetRing.map((p) => p[0]))) /
        2,
      tz =
        (Math.min(...targetRing.map((p) => p[1])) +
          Math.max(...targetRing.map((p) => p[1]))) /
        2;
    if (
      car &&
      Math.hypot(tx - car.group.position.x, tz - car.group.position.z) > 0.25
    ) {
      liftStatus.textContent =
        "These floor plates do not share an aligned shaft. Use floor preview.";
      return;
    }
    lift.call(store.index, Number(destination.value));
  };
  styleSelect.onchange = () => {
    const style = styleSelect.value;
    if (roomSelect.value)
      settings.rooms[`${store.current.id}/${roomSelect.value}`] = style;
    else settings.style = style;
    persist();
    groups.forEach((group) => {
      if (!roomSelect.value) {
        const rm = materialFor(style);
        group.traverse((o) => {
          if (o.userData.surface)
            o.material = rm[o.userData.surface] || rm.wall;
        });
      }
      for (const room of group.userData.rooms || []) {
        if (roomSelect.value && room.userData.roomId !== roomSelect.value)
          continue;
        room.userData.style =
          settings.rooms[
            group.userData.floor.id + "/" + room.userData.roomId
          ] || settings.style;
        const rm = materialFor(room.userData.style);
        room.traverse((o) => {
          if (o.isMesh && !o.userData.sharedAsset && o.userData.surface)
            o.material = rm[o.userData.surface] || rm.wall;
        });
      }
      group.traverse((o) => {
        if (!o.userData.surfaceOwner) return;
        const ownerStyle =
          settings.rooms[
            `${group.userData.floor.id}/${o.userData.surfaceOwner}`
          ] || settings.style;
        o.material = materialFor(ownerStyle).wall;
      });
    });
  };
  const keyDown = (e) => {
      if (/INPUT|SELECT|BUTTON/.test(e.target.tagName)) return;
      if (
        walk &&
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "s",
          "a",
          "d",
        ].includes(e.key)
      ) {
        e.preventDefault();
        keys.add(e.key);
      }
    },
    keyUp = (e) => keys.delete(e.key);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  let drag = null;
  const lookStart = (event) => {
    if (!walk || physicallyTracked()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const lookMove = (event) => {
    if (!walk || !drag || event.pointerId !== drag.id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    yaw -= (event.clientX - drag.x) * 0.004;
    pitch = THREE.MathUtils.clamp(
      pitch - (event.clientY - drag.y) * 0.004,
      -0.8,
      0.65,
    );
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const lookEnd = () => {
    drag = null;
  };
  renderer.domElement.addEventListener("pointerdown", lookStart, true);
  renderer.domElement.addEventListener("pointermove", lookMove, true);
  renderer.domElement.addEventListener("pointerup", lookEnd, true);
  renderer.domElement.addEventListener("pointercancel", lookEnd, true);
  const light = new THREE.HemisphereLight("#fff2de", "#80776b", 0.65);
  root.add(light);
  const frameTimes = [];
  let lastTime = 0,
    frameCounter = 0;
  return {
    root,
    store,
    camera,
    get walking() {
      return walk;
    },
    settings,
    refreshQuality() {
      if (!enabled && !walk) return;
      roomJob?.abort();
      buildStarted = performance.now();
      picker.busy(true);
      stream.select(store.index, data.floors.length);
    },
    enable(value) {
      enabled = value;
      host.hidden = false;
      root.visible = value;
      if (value && !groups.length) {
        buildStarted = performance.now();
        picker.busy(true);
        stream.select(store.index, data.floors.length);
      }
    },
    update(now) {
      if (disposed) return;
      const frameInterval = lastTime ? now - lastTime : 0;
      const dt = Math.min(0.05, frameInterval / 1000 || 0.016);
      lastTime = now;
      if (physicallyTracked() && walk) setWalk(false);
      if (walk) {
        if (keys.has("ArrowLeft") || keys.has("a")) yaw += dt;
        if (keys.has("ArrowRight") || keys.has("d")) yaw -= dt;
        if (keys.has("ArrowUp") || keys.has("w")) move(dt * 1.4);
        if (keys.has("ArrowDown") || keys.has("s")) move(-dt * 1.4);
        if (active?.userData.floor === store.current) {
          const room = active.userData.rooms.find((r) =>
            r.userData.polygons.some((p) =>
              insidePolygon(position.x, position.z, p),
            ),
          );
          if (room !== candidateRoom) {
            candidateRoom = room;
            candidateSince = now;
          }
          const wanted = getQuality() === "performance" ? "low" : "high";
          if (room) room.userData.lastUse = now;
          if (
            room &&
            now - candidateSince > 300 &&
            !hydrationBusy &&
            (!room.userData.furnished || room.userData.lod !== wanted)
          )
            void hydrateRoom(room, true, wanted);
          else if (
            !hydrationBusy &&
            room?.userData.furnished &&
            now - candidateSince > 600
          ) {
            const distant = active.userData.rooms.find(
              (r) =>
                r.userData.furnished &&
                r.userData.lod !== "low" &&
                Math.hypot(
                  Math.max(
                    0,
                    r.userData.bounds.min.x - position.x,
                    position.x - r.userData.bounds.max.x,
                  ),
                  Math.max(
                    0,
                    r.userData.bounds.min.z - position.z,
                    position.z - r.userData.bounds.max.z,
                  ),
                ) > 10,
            );
            if (distant) void hydrateRoom(distant, true, "low");
          }
        }
        modelRoot.updateWorldMatrix(true, false);
        camera.position.copy(modelRoot.localToWorld(position.clone()));
        const q = new THREE.Quaternion();
        modelRoot.getWorldQuaternion(q);
        camera.quaternion
          .copy(q)
          .multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              yaw,
            ),
          );
        camera.quaternion.multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            pitch,
          ),
        );
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        lift.tick(dt);
        if (car) {
          const doorTarget = ["opening", "boarding", "arrived"].includes(
            lift.state,
          )
            ? 1
            : 0;
          doorOpenness += (doorTarget - doorOpenness) * Math.min(1, dt * 7);
          car.open(doorOpenness);
          if (lift.state === "travelling") {
            const from = data.floors[lift.origin],
              to = data.floors[lift.destination],
              y = from.base + (to.base - from.base) * lift.progress();
            car.group.position.y = y;
            position.y = y + 1.65;
            const current = Math.round(
              lift.origin + (lift.destination - lift.origin) * lift.progress(),
            );
            car.indicate(current === 0 ? "G" : current);
          } else car.group.position.y = store.current.base;
        }
      }
      root.visible = enabled || walk;
      const floor = store.current;
      if (!floor) return;
      if (car) car.group.visible = enabled || walk;
      const cut = enabled && cutaway.checked && !walk && !floor.roof;
      cutPlane.constant = floor.base + floor.height - 0.03;
      modelRoot.updateWorldMatrix(true, false);
      worldPlane.copy(cutPlane).applyMatrix4(modelRoot.matrixWorld);
      modelRoot.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.userData.interiorManaged) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.clippingPlanes = cut ? clippingPlanes : null;
          });
          if (enabled && o.userData.internal) o.visible = false;
          if (
            walk &&
            ["core", "roof", "podium", "podiumLobby"].includes(o.userData.layer)
          )
            o.visible = false;
        }
      });
      groups.forEach((g) => {
        for (const room of g.userData.rooms || []) {
          room.traverse((o) => {
            if (o.userData.furniture)
              o.visible =
                settings.furnishing[
                  g.userData.floor.id + "/" + room.userData.roomId
                ] !== "clear";
          });
          room.visible =
            !walk ||
            Math.hypot(
              Math.max(
                0,
                room.userData.bounds.min.x - position.x,
                position.x - room.userData.bounds.max.x,
              ),
              Math.max(
                0,
                room.userData.bounds.min.z - position.z,
                position.z - room.userData.bounds.max.z,
              ),
            ) < 16;
        }
        if (walk)
          g.traverse((o) => {
            if (o.userData.surfaceOwner)
              o.visible =
                g.userData.rooms.find(
                  (r) => r.userData.roomId === o.userData.surfaceOwner,
                )?.visible ?? true;
          });
        else
          g.traverse((o) => {
            if (o.userData.surfaceOwner) o.visible = true;
          });
        g.traverse((o) => {
          if (o.userData.ceiling) o.visible = walk;
        });
        g.visible = !cut || g.userData.floor.index <= store.index;
      });
      if (frameInterval > 0 && document.visibilityState === "visible")
        frameTimes[frameCounter++ % 600] = frameInterval;
    },
    telemetry() {
      const textureSet = new Set();
      modelRoot.traverse((o) => {
        if (o.isMesh)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            Object.values(m).forEach((t) => {
              if (t?.isTexture) textureSet.add(t);
            }),
          );
      });
      const textureBytes = [...textureSet].reduce((n, t) => {
        const images = Array.isArray(t.image) ? t.image : [t.image];
        return (
          n +
          images.reduce(
            (s, i) => s + ((i?.width || 0) * (i?.height || 0) * 4 * 4) / 3,
            0,
          )
        );
      }, 0);
      const sorted = frameTimes.slice().sort((a, b) => a - b);
      return {
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        loadMs,
        roomLoadMs,
        estimatedMaterialTextureMiB: textureBytes / 1048576,
        floors: groups.length,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        assetFailures: [...library.failures],
        decoderWorkers: library.workerCount,
        residentRooms:
          active?.userData.rooms
            .filter((r) => r.userData.furnished)
            .map((r) => ({ id: r.userData.roomId, detail: r.userData.lod })) ||
          [],
      };
    },
    dispose() {
      disposed = true;
      roomJob?.abort();
      setWalk(false);
      stream.dispose();
      picker.dispose();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      renderer.domElement.removeEventListener("pointerdown", lookStart, true);
      renderer.domElement.removeEventListener("pointermove", lookMove, true);
      renderer.domElement.removeEventListener("pointerup", lookEnd, true);
      renderer.domElement.removeEventListener("pointercancel", lookEnd, true);
      host.remove();
      tools.remove();
      disposeGroup(car?.group);
      root.removeFromParent();
      palettes.forEach((p) =>
        Object.values(p).forEach((m) => {
          m.normalMap?.dispose();
          m.dispose();
        }),
      );
      void library.dispose();
      disposeFinishTextures();
      contactMaterial.map.dispose();
      contactMaterial.dispose();
      environment.dispose();
    },
  };
}
