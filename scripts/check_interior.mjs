import assert from "node:assert/strict";
import fs from "node:fs";
const {
  migrateSettings,
  interiorStorageKey,
  createFloorState,
  createFloorStream,
  createElevator,
  insidePolygon,
} = await import(
  "data:text/javascript;base64," +
    Buffer.from(fs.readFileSync("js/interior/state.js", "utf8")).toString(
      "base64",
    )
);
assert.notEqual(
  interiorStorageKey({ lng: -79.4, lat: 43.6 }),
  interiorStorageKey({ lng: -79.5, lat: 43.6 }),
);
assert.equal(interiorStorageKey(null), null);
const floors = Array.from({ length: 121 }, (_, index) => ({
  index,
  id: `floor-${index}`,
  roof: index === 120,
}));
assert.equal(migrateSettings().style, "warm");
assert.equal(
  migrateSettings({ style: "invalid", rooms: { a: "classic", b: "bad" } }).rooms
    .a,
  "classic",
);
assert.equal(migrateSettings({ activeFloor: -12 }).activeFloor, 0);
const calibration = { heading: 123, offset: [1, 2, 3] },
  snapshot = JSON.stringify(calibration),
  state = createFloorState(floors);
let changes = 0;
state.subscribe(() => changes++);
state.select(200);
assert.equal(state.index, 120);
state.select(-5);
state.select(0);
assert.equal(changes, 2);
assert.equal(JSON.stringify(calibration), snapshot);
const courtyard = [
  [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ],
  [
    [3, 3],
    [7, 3],
    [7, 7],
    [3, 7],
  ],
];
assert(insidePolygon(1, 1, courtyard));
assert(!insidePolygon(5, 5, courtyard));
assert(!insidePolygon(-1, 5, courtyard));
const transitions = [];
const elevator = createElevator((s) => transitions.push(s));
assert(!elevator.call(0, 0));
assert(elevator.call(0, 2));
assert(!elevator.call(0, 3));
for (let i = 0; i < 250; i++) {
  elevator.tick(0.1);
  if (elevator.state === "boarding") elevator.board();
  if (elevator.state === "arrived") elevator.exit();
}
assert.deepEqual(transitions, [
  "called",
  "arriving",
  "opening",
  "boarding",
  "closing",
  "travelling",
  "arrived",
  "idle",
]);
assert.equal(elevator.state, "idle");
// Test the renderer's rotated doorway bridge, where shaft clearance previously
// left a collision gap between the moving car floor and the landing.
const liftSource = fs.readFileSync("js/interior/elevator.js", "utf8");
const landingMethod = liftSource.slice(liftSource.indexOf("    containsLanding("), liftSource.indexOf("    open(amount)"));
const landing = new Function("group", "opening", "depth", "return {" + landingMethod + "};")(
  { position: { x: 10, z: 20 }, rotation: { y: Math.PI / 2 } }, 1.15, 2,
);
assert(landing.containsLanding(11.2, 20));
assert(!landing.containsLanding(8.8, 20));
assert(!landing.containsLanding(11.2, 20.8));
elevator.call(0, 100);
elevator.cancel();
assert.equal(elevator.state, "idle");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = new Set();
let maximum = 0,
  ready = [];
const stream = createFloorStream(
  async (index, signal) => {
    await sleep(2);
    const g = { index };
    alive.add(g);
    maximum = Math.max(maximum, alive.size);
    return g;
  },
  (g) => alive.delete(g),
  (groups, index) => {
    ready.push(index);
    assert(groups.length <= 3);
  },
  0,
);
stream.select(0, 120);
stream.select(119, 120);
await sleep(30);
assert.deepEqual(ready, [119]);
for (let i = 1; i < 8; i++) {
  stream.select(i, 120);
  await sleep(25);
}
stream.dispose();
assert.equal(alive.size, 0);
assert(
  maximum <= 6,
  "Only old and replacement windows may overlap during a transaction",
);
const manifest = JSON.parse(
  fs.readFileSync("assets/interior/manifest.json", "utf8"),
);
assert(manifest.models.length >= 8);
let exceptions = [];
for (const model of manifest.models) {
  assert.equal(model.licence, "CC0-1.0");
  assert(model.redistribution);
  assert(model.source.startsWith("https://polyhaven.com/a/"));
  assert(model.author);
  assert.equal(model.units, "metres");
  assert.equal(model.up, "+Y");
  assert(model.materialSlots.length);
  assert(model.footprint.every((n) => n > 0));
  assert(model.textureSize <= 1024);
  assert(model.levels.high.triangles <= 15000);
  if (model.levels.low.triangles >= 1500) exceptions.push(model.id);
  for (const level of Object.values(model.levels)) {
    const file = fs.readFileSync(level.url.replace("./", ""));
    assert.equal(file.toString("ascii", 0, 4), "glTF");
    assert.equal(file.readUInt32LE(8), file.length);
    assert.equal(file.length, level.bytes);
    const json = JSON.parse(
      file.toString("utf8", 20, 20 + file.readUInt32LE(12)),
    );
    assert(json.extensionsRequired.includes("EXT_meshopt_compression"));
    const triangles = json.meshes.reduce(
      (n, mesh) =>
        n +
        mesh.primitives.reduce(
          (m, primitive) => m + json.accessors[primitive.indices].count / 3,
          0,
        ),
      0,
    );
    assert.equal(triangles, level.triangles);
    assert(
      level.textures.every(
        (t) => t.mime === "image/webp" && t.size.every((n) => n <= 1024),
      ),
    );
  }
}
const scene = fs.readFileSync("js/interior/scene.js", "utf8");
assert(
  !/saveCalibration|setManualOffset|updatePlacement|headingDeg/.test(scene),
);
assert(/physicallyTracked\(\)\s*&&\s*walk/.test(scene));

assert(scene.includes("disposeGroup"));
assert(scene.includes("createFloorStream"));
console.log(
  `Interior checks passed: migration, 120-floor state, courtyard collision, elevator transitions, cancellable bounded resource lifecycle, ${manifest.models.length} licensed GLBs. Low-LOD budget exceptions: ${exceptions.join(", ") || "none"}.`,
);

// Exercise the renderer's actual resource-owner functions with GPU test doubles.
const cleanupSource = scene.slice(
  scene.indexOf("function disposeGroup("),
  scene.indexOf("function batchRoom("),
);
const disposeRuntime = new Function(
  "releaseTexture",
  cleanupSource + "; return disposeGroup;",
)((t) => t.dispose());
let geometryDisposals = 0,
  materialDisposals = 0;
const resourceGroup = () => ({
  traverse(fn) {
    fn({
      isMesh: true,
      userData: { sharedAsset: true },
      geometry: {
        dispose() {
          geometryDisposals++;
        },
      },
      material: {
        dispose() {
          materialDisposals++;
        },
      },
    });
  },
  removeFromParent() {},
});
const sharedGroups = [resourceGroup(), resourceGroup()];
sharedGroups.forEach(disposeRuntime);
assert.equal(
  geometryDisposals,
  0,
  "Array indexes must never grant shared-resource ownership",
);
disposeRuntime(sharedGroups[0], true);
assert.equal(geometryDisposals, 1);
assert.equal(materialDisposals, 1);
let decoded = 0,
  closed = 0;
class FakeLoader {
  setMeshoptDecoder() {
    return this;
  }
  async loadAsync() {
    decoded++;
    const image = {
        width: 1024,
        height: 1024,
        close() {
          closed++;
        },
      },
      material = {
        name: "surface",
        map: { isTexture: true, userData: {}, image, dispose() {} },
        dispose() {},
      };
    const mesh = { isMesh: true, userData: {}, material };
    return {
      scene: {
        traverse(fn) {
          fn(mesh);
        },
      },
    };
  }
}
const librarySource = scene.slice(
  scene.indexOf("class Library {"),
  scene.indexOf("function disposeGroup("),
);
const TestLibrary = new Function(
  "GLTFLoader",
  "MeshoptDecoder",
  "disposeGroup",
  "releasedBitmaps",
  "releaseTexture",
  librarySource + ";return Library;",
)(
  FakeLoader,
  {},
  () => {},
  new WeakSet(),
  (t) => t.dispose(),
);
const cache = new TestLibrary({
  isTexture: true,
  userData: { sharedInteriorEnvironment: true },
});
await cache.get("sofa", "high");
await cache.get("sofa", "low");
await cache.trim(new Set());
assert.equal(
  closed,
  0,
  "Trimming must retain shared ImageBitmaps for safe GPU re-upload",
);
await cache.get("sofa", "high");
assert.equal(decoded, 2, "Returning to a room must reuse its decoded model");
await cache.dispose();
assert.equal(closed, 2);
assert.equal(cache.cache.size, 0);
console.log(
  "Renderer ownership and shared ImageBitmap lifecycle regressions passed.",
);
const migrationSource = scene.slice(
  scene.indexOf("function migratePayload("),
  scene.indexOf("export function createInteriorScene("),
);
const migratePayload = new Function(
  migrationSource + ";return migratePayload;",
)();
const legacy = migratePayload({
  floorHeight: 3.4,
  floors: [
    { base: 0, scale: 1 },
    { base: 3.4, scale: 0.8 },
  ],
  rooms: [],
  walls: [],
  furniture: [],
});
assert.equal(legacy.schema, 2);
assert(legacy.legacy);
assert.equal(
  legacy.floors[1].planId,
  null,
  "Legacy tapered floors require regeneration rather than stretched furniture",
);
assert(!("scale" in legacy.floors[0]));
console.log(
  "Legacy interior payload migration passed without furniture scale transforms.",
);

// Exercise the actual wall-face partitioner. Opposite sides of one solid wall
// must follow separate rooms without dropping or duplicating triangles.
class Attribute {
  constructor(array, itemSize, normalized = false) {
    Object.assign(this, {
      array,
      itemSize,
      normalized,
      count: array.length / itemSize,
    });
  }
  getX(i) {
    return this.array[i * this.itemSize];
  }
  getY(i) {
    return this.array[i * this.itemSize + 1];
  }
  getZ(i) {
    return this.array[i * this.itemSize + 2];
  }
}
class Geometry {
  attributes = {};
  setAttribute(key, value) {
    this.attributes[key] = value;
    return this;
  }
  dispose() {
    this.disposed = true;
  }
}
const partitionSource = fs
  .readFileSync("js/interior/architecture.js", "utf8")
  .replace(/^import .*;\n/gm, "")
  .replace(/export function/g, "function");
const wallSurfaces = new Function(
  "THREE",
  "insidePolygon",
  partitionSource + ";return wallSurfaces;",
)({ BufferGeometry: Geometry, BufferAttribute: Attribute }, insidePolygon);
const positions = new Float32Array([
  -0.1, 0, 0, -0.1, 2, 0, -0.1, 0, 2, 0.1, 0, 0, 0.1, 0, 2, 0.1, 2, 0,
]);
const normals = new Float32Array([
  -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
]);
const solidWall = new Geometry()
  .setAttribute("position", new Attribute(positions, 3))
  .setAttribute("normal", new Attribute(normals, 3));
const worldUnitUVs = new Function("THREE", partitionSource + ";return worldUnitUVs;")({ BufferAttribute: Attribute });
worldUnitUVs(solidWall);
assert.deepEqual([...solidWall.attributes.uv.array], [0, 0, 0, 2, 2, 0, 0, 0, 2, 0, 0, 2]);
const faces = wallSurfaces(solidWall, [
  {
    id: "left",
    polygons: [
      [
        [
          [-3, -1],
          [-0.1, -1],
          [-0.1, 3],
          [-3, 3],
        ],
      ],
    ],
  },
  {
    id: "right",
    polygons: [
      [
        [
          [0.1, -1],
          [3, -1],
          [3, 3],
          [0.1, 3],
        ],
      ],
    ],
  },
]);
assert.deepEqual(faces.map((f) => f.roomId).sort(), ["left", "right"]);
assert.equal(
  faces.reduce((n, f) => n + f.geometry.attributes.position.count, 0),
  6,
);
assert(solidWall.disposed);
assert.notEqual(faces[0].geometry, faces[1].geometry);
console.log(
  "Opposite wall-side finish ownership and triangle conservation passed.",
);

const bakeGeometry = new Function(
  "THREE",
  partitionSource + ";return bakeGeometry;",
)({ BufferAttribute: Attribute });
class NormalizedAttribute extends Attribute {
  getX(i) {
    return super.getX(i) / 32767;
  }
  getY(i) {
    return super.getY(i) / 32767;
  }
  getZ(i) {
    return super.getZ(i) / 32767;
  }
}
class BakeGeometry extends Geometry {
  clone() {
    const copy = new BakeGeometry();
    copy.attributes = { ...this.attributes };
    return copy;
  }
  getAttribute(k) {
    return this.attributes[k];
  }
  applyMatrix4(translation) {
    const p = this.attributes.position;
    for (let i = 0; i < p.count; i++)
      for (let k = 0; k < 3; k++) p.array[i * 3 + k] += translation[k];
    return this;
  }
}
const compressed = new BakeGeometry().setAttribute(
  "position",
  new NormalizedAttribute(new Int16Array([0, 32767, 0]), 3, true),
);
const baked = bakeGeometry(compressed, [18, 2, -7]);
assert(baked.attributes.position.array instanceof Float32Array);
assert.equal(baked.attributes.position.normalized, false);
assert.deepEqual([...baked.attributes.position.array], [18, 3, -7]);
assert.deepEqual([...compressed.attributes.position.array], [0, 32767, 0]);
console.log(
  "Quantized GLB batching preserves translated metre coordinates without mutating source geometry.",
);

// Worker requests resolve by transaction ID and always terminate on cancellation.
const plannerSource = fs
  .readFileSync("js/interior/planner.js", "utf8")
  .replace("export function", "function")
  .replace("import.meta.url", '"https://example.test/js/interior/planner.js"');
class FakeWorker {
  static instances = [];
  constructor() {
    this.constructor.instances.push(this);
    this.messages = [];
  }
  postMessage(data) {
    this.messages.push(data);
  }
  terminate() {
    this.terminated = true;
  }
}
const plannerFactory = new Function(
  "Worker",
  plannerSource + ";return createInteriorPlanner;",
)(FakeWorker);
const planner = plannerFactory((floor) => ({ fallback: floor.index }));
assert.equal(planner.backend, "worker");
const first = planner.plan({ index: 2 }, {}),
  second = planner.plan({ index: 8 }, {});
const worker = FakeWorker.instances.at(-1);
worker.onmessage({ data: { id: worker.messages[1].id, plan: { floor: 8 } } });
worker.onmessage({ data: { id: worker.messages[0].id, plan: { floor: 2 } } });
assert.deepEqual(await first, { floor: 2 });
assert.deepEqual(await second, { floor: 8 });
const cancelled = planner.plan({ index: 9 }, {});
planner.dispose();
await assert.rejects(cancelled, { name: "AbortError" });
assert(worker.terminated);
const restricted = plannerFactory((floor) => ({ fallback: floor.index }));
const retry = restricted.plan({ index: 4 }, {});
FakeWorker.instances.at(-1).onerror({ preventDefault() {} });
assert.deepEqual(await retry, { fallback: 4 });
assert.equal(restricted.backend, "main-thread-fallback");
restricted.dispose();
console.log(
  "Planner worker ordering, cancellation, cleanup and restricted-host fallback passed.",
);

const { createHash } = await import("node:crypto");
const surfaceManifest = JSON.parse(
  fs.readFileSync("assets/interior-textures/manifest.json", "utf8"),
);
assert.equal(surfaceManifest.textures.length, 3);
for (const texture of surfaceManifest.textures) {
  assert(
    texture.generated &&
      texture.model === "gpt-image-1.5" &&
      texture.licence &&
      texture.prompt,
  );
  const file = fs.readFileSync("assets/interior-textures/" + texture.file);
  assert.equal(createHash("sha256").update(file).digest("hex"), texture.sha256);
  assert.equal(file.length, texture.bytes);
  assert(file.length < 600000);
  assert.equal(file.toString("ascii", 0, 4), "RIFF");
  assert.equal(file.toString("ascii", 8, 12), "WEBP");
  let dimensions;
  for (let offset = 12; offset + 8 < file.length;) {
    const kind = file.toString("ascii", offset, offset + 4),
      size = file.readUInt32LE(offset + 4),
      data = offset + 8;
    if (kind === "VP8X")
      dimensions = [
        file.readUIntLE(data + 4, 3) + 1,
        file.readUIntLE(data + 7, 3) + 1,
      ];
    if (kind === "VP8 ")
      dimensions = [
        file.readUInt16LE(data + 6) & 16383,
        file.readUInt16LE(data + 8) & 16383,
      ];
    offset = data + size + (size % 2);
  }
  assert.deepEqual(dimensions, [1024, 1024]);
  assert.equal(texture.colourSpace, "sRGB");
  assert.deepEqual(texture.physicalTileMetres, [1, 1]);
}
console.log(
  "Three generated 1K WebP textures: provenance, hashes, real dimensions and transfer budgets passed.",
);
