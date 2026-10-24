// Build-only SDK, resolved from an explicitly supplied glTF Transform CLI installation.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
if (!process.argv[2])
  throw new Error(
    "Usage: node scripts/manifest_interior_assets.mjs /path/to/@gltf-transform/cli",
  );
const require = createRequire(
  pathToFileURL(resolve(process.argv[2], "package.json")),
);
const { NodeIO } = require("@gltf-transform/core");
const { ALL_EXTENSIONS } = require("@gltf-transform/extensions");
const { getBounds } = require("@gltf-transform/functions");
const { MeshoptDecoder } = await import(
  pathToFileURL(require.resolve("meshoptimizer"))
);
import fs from "node:fs/promises";
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const entries = [];
for (const id of await fs.readdir("assets/interior")) {
  if (!(await fs.stat("assets/interior/" + id)).isDirectory()) continue;
  const p = "assets/interior/" + id;
  const m = JSON.parse(await fs.readFile(p + "/provenance.json", "utf8"));
  m.levels = {};
  for (const level of ["high", "low"]) {
    const d = await io.read(p + "/" + level + ".glb");
    const b = getBounds(d.getRoot().listScenes()[0]);
    const tris = d
      .getRoot()
      .listMeshes()
      .reduce(
        (s, mesh) =>
          s +
          mesh
            .listPrimitives()
            .reduce(
              (t, p) =>
                t +
                (p.getIndices()?.getCount() ||
                  p.getAttribute("POSITION").getCount()) /
                  3,
              0,
            ),
        0,
      );
    m.levels[level] = {
      url: `./assets/interior/${id}/${level}.glb`,
      triangles: tris,
      bytes: (await fs.stat(p + "/" + level + ".glb")).size,
      textures: d
        .getRoot()
        .listTextures()
        .map((t) => ({
          name: t.getName(),
          size: t.getSize(),
          mime: t.getMimeType(),
        })),
    };
    m.bounds = b;
    m.materialSlots = d
      .getRoot()
      .listMaterials()
      .map((x) => x.getName() || "PBR surface");
  }
  m.footprint = [
    m.bounds.max[0] - m.bounds.min[0],
    m.bounds.max[2] - m.bounds.min[2],
  ];
  m.clearance = 0.9;
  m.clearanceZone = {
    shape: "rectangle",
    width: m.footprint[0] + 1.8,
    depth: m.footprint[1] + 1.8,
    margin: 0.9,
  };
  await fs.writeFile(p + "/manifest.json", JSON.stringify(m, null, 2) + "\n");
  entries.push(m);
  console.log(id, m.levels.high.triangles, m.levels.low.triangles, m.footprint);
}
await fs.writeFile(
  "assets/interior/manifest.json",
  JSON.stringify(
    { schema: 1, credit: "Furniture: Poly Haven (CC0)", models: entries },
    null,
    2,
  ) + "\n",
);
