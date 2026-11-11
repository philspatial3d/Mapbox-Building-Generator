import * as THREE from "https://esm.sh/three@0.185.1";
import { STYLES } from "./state.js";
import { artAtlas, rugTexture, bookTexture, carpetTexture, tileTexture, screenTexture } from "./canvas-textures.js";
const baseMaps = new Map();
function baseMap(family) {
  const name = { wall: "plaster", wood: "oak", stone: "stone" }[
    family
  ];
  if (!name) return null;
  if (!baseMaps.has(name)) {
    const texture = new THREE.TextureLoader().load(
      new URL(`../../assets/interior-textures/${name}.webp`, import.meta.url)
        .href,
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 4;
    baseMaps.set(name, texture);
  }
  return baseMaps.get(name);
}
export function disposeFinishTextures() {
  baseMaps.forEach((texture) => texture.dispose());
  baseMaps.clear();
}
/** Subtle deterministic micro-normal, tiled in world units (geometry UVs are metres). */
export function finishMaterial(material, family) {
  material.map = baseMap(family);
  if (family === "wall") {
    // Paint is a finish colour with restrained grain, rather than a photograph
    // covering the wall. Keep broad generated colour variation below the paint.
    // Wall geometry is baked floor-relative, so object-space y is height above
    // the slab: darken the bottom 0.6 m as cheap contact occlusion at skirtings.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vFloorY;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFloorY = position.y;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vFloorY;")
        .replace(
          "#include <map_fragment>",
          "vec3 paintColour = diffuseColor.rgb;\n#include <map_fragment>\ndiffuseColor.rgb = mix(paintColour, diffuseColor.rgb, 0.18) * (0.8 + 0.2 * smoothstep(0.04, 0.65, vFloorY));",
        );
    };
    material.roughness = 0.92;
    material.envMapIntensity = 0.12;
  }
  const size = 128,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain =
        family === "wood"
          ? Math.sin(y * 0.55 + Math.sin(x * 0.08) * 1.5) * 2
          : Math.sin(x * 12.9898 + y * 78.233) * 1.3;
      data[i] = 128 + grain;
      data[i + 1] = 128 + Math.cos(x * 0.4 + y * 0.2) * 1.5;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  const normal = new THREE.DataTexture(data, size, size);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.colorSpace = THREE.NoColorSpace;
  normal.generateMipmaps = true;
  normal.minFilter = THREE.LinearMipmapLinearFilter;
  normal.magFilter = THREE.LinearFilter;
  normal.needsUpdate = true;
  material.normalMap = normal;
  material.normalScale.set(
    family === "wall" ? 0.03 : 0.28,
    family === "wall" ? 0.03 : 0.28,
  );
  return material;
}

export function palette(style, environment) {
  const p = STYLES[style],
    result = {};
  const colors = {
    wall: p.wall,
    ceiling: p.ceiling,
    floor: p.floor,
    wood: p.wood,
    textile: p.textile,
    stone: p.stone,
    tile: p.stone,
    walltile: "#f3f2ee",
    carpet: p.carpet,
    metal: p.metal,
    linen: p.linen,
    ceramic: "#f2f0ea",
    dark: "#22282a",
    glass: "#c9d8d4",
    mirror: "#b9c3c0",
    accent: p.accent,
    soft: p.soft,
    soft2: p.soft2,
    throw: p.throw,
    brass: p.brass,
    felt: p.felt,
    door: new THREE.Color(p.wall).multiplyScalar(0.94).getStyle(),
    leaf: "#4f6b45",
    paper: "#f1ede4",
    // Window joinery and drapes are separate so a section can cut them
    // without cutting furniture that shares their colours.
    frame: p.metal,
    trim: p.wood,
    pane: "#c9d8d4",
    drape: p.linen,
  };
  const roughness = {
    glass: 0.08,
    pane: 0.08,
    frame: 0.4,
    drape: 0.95,
    metal: 0.38,
    brass: 0.32,
    ceramic: 0.22,
    walltile: 0.28,
    mirror: 0.05,
    stone: 0.45,
    tile: 0.4,
    dark: 0.5,
    carpet: 0.98,
    felt: 0.97,
    textile: 0.92,
    linen: 0.95,
    soft: 0.92,
    soft2: 0.92,
    throw: 0.95,
    ceiling: 0.96,
  };
  for (const [k, color] of Object.entries(colors))
    result[k] = new THREE.MeshStandardMaterial({
      color,
      roughness: roughness[k] ?? 0.78,
      metalness: ["metal", "brass", "mirror", "frame"].includes(k) ? 0.85 : 0,
      transparent: k === "glass" || k === "pane",
      opacity: k === "glass" || k === "pane" ? 0.16 : 1,
      depthWrite: k !== "glass" && k !== "pane",
      side: THREE.DoubleSide,
    });
  Object.values(result).forEach((m) => {
    m.envMap = environment;
    m.envMapIntensity = 0.4;
  });
  result.glass.envMapIntensity = result.pane.envMapIntensity = 1.2;
  result.mirror.envMapIntensity = 1.1;
  result.ceramic.envMapIntensity = 0.7;
  // Ceilings only see the hemisphere's ground colour; a little self-light stands
  // in for bounce from the floor so they read white rather than grey.
  result.ceiling.emissive = new THREE.Color(p.ceiling).multiplyScalar(0.2);
  result.glow = new THREE.MeshStandardMaterial({
    color: "#fff1d7",
    emissive: "#ffdfa3",
    emissiveIntensity: 1.4,
    roughness: 0.8,
  });
  const map = (key, texture) => {
    const m = result[key] || (result[key] = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide, envMap: environment, envMapIntensity: 0.3 }));
    m.map = texture;
    if (["art", "rug", "books", "screen"].includes(key)) m.color.set("#ffffff");
    return m;
  };
  map("art", artAtlas(style, p.art)).roughness = 0.7;
  map("rug", rugTexture(style, p.art, p.throw)).roughness = 0.98;
  map("books", bookTexture(style, p.art));
  const screen = map("screen", screenTexture());
  screen.emissive = new THREE.Color("#ffffff");
  screen.emissiveMap = screen.map;
  screen.emissiveIntensity = 0.55;
  screen.roughness = 0.25;
  for (const key of ["wall", "floor", "wood", "textile", "stone", "carpet", "tile", "walltile"])
    finishMaterial(result[key], key === "floor" ? "wood" : key);
  result.carpet.map = carpetTexture(style, p.carpet);
  result.carpet.color.set("#ffffff");
  // Wet-room floors sit a few tones below the wall tile so the room has a base.
  result.tile.map = tileTexture("floor", new THREE.Color(p.stone).lerp(new THREE.Color(p.metal), 0.38).getStyle(), 0.6);
  result.tile.color.set("#ffffff");
  result.walltile.map = tileTexture("wall", "#f3f2ee", 0.6, 2);
  result.walltile.color.set("#ffffff");
  return result;
}
