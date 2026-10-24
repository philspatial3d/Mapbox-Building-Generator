import * as THREE from "https://esm.sh/three@0.185.1";
import { STYLES } from "./state.js";
const baseMaps = new Map();
function baseMap(family) {
  const name = { wall: "plaster", wood: "oak", stone: "stone", tile: "stone" }[
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
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        "vec3 paintColour = diffuseColor.rgb;\n#include <map_fragment>\ndiffuseColor.rgb = mix(paintColour, diffuseColor.rgb, 0.18);",
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
  for (const [k, color] of Object.entries({
    wall: p.wall,
    floor: p.floor,
    wood: p.wood,
    textile: p.textile,
    stone: p.stone,
    tile: p.stone,
    carpet: p.floor,
    metal: p.metal,
    linen: "#eee8dc",
    ceramic: "#eeeae1",
    dark: "#242b2c",
    glass: "#c2d2cb",
    mirror: "#afb9b5",
  }))
    result[k] = new THREE.MeshStandardMaterial({
      color,
      roughness:
        k === "glass"
          ? 0.12
          : k === "metal"
            ? 0.35
            : k === "ceramic"
              ? 0.3
              : 0.78,
      metalness: k === "metal" || k === "mirror" ? 0.8 : 0,
      transparent: k === "glass",
      opacity: k === "glass" ? 0.22 : 1,
      depthWrite: k !== "glass",
      side: THREE.DoubleSide,
    });
  Object.values(result).forEach((m) => {
    m.envMap = environment;
    m.envMapIntensity = 0.4;
  });
  result.carpet.roughness = 0.97;
  result.tile.roughness = 0.4;
  result.mirror.roughness = 0.06;
  result.glow = new THREE.MeshStandardMaterial({
    color: "#fff1d7",
    emissive: "#ffdfa3",
    emissiveIntensity: 1.4,
    roughness: 0.8,
  });
  for (const key of [
    "wall",
    "floor",
    "wood",
    "textile",
    "stone",
    "carpet",
    "tile",
  ])
    finishMaterial(result[key], key === "floor" ? "wood" : key);
  return result;
}
