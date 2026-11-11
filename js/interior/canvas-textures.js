import * as THREE from "https://esm.sh/three@0.185.1";
/** Small procedural textures drawn once per style: an art-print atlas, rugs,
 * book spines, carpet tiles and ceramic tile. They are shared by every room of a
 * style so dressing adds detail without adding draw calls or downloads. */
const cache = new Map();
export const ART_COLUMNS = 4,
  ART_ROWS = 2;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}
function finish(c, { repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}
function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}
export function disposeCanvasTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

/** Eight abstract prints on a paper mat: colour fields, arcs, a horizon,
 * stripes, a sun, blocks, a botanical line and a soft gradient. */
export function artAtlas(style, colors) {
  return memo("art|" + style, () => {
    const tile = 256,
      [c, g] = canvas(tile * ART_COLUMNS, tile * ART_ROWS),
      r = rng(style.length * 977 + 13);
    const pick = (i) => colors[i % colors.length];
    for (let i = 0; i < ART_COLUMNS * ART_ROWS; i++) {
      const x0 = (i % ART_COLUMNS) * tile,
        y0 = Math.floor(i / ART_COLUMNS) * tile;
      g.save();
      g.fillStyle = "#f4f1ea";
      g.fillRect(x0, y0, tile, tile);
      const m = 22,
        x = x0 + m,
        y = y0 + m,
        s = tile - m * 2;
      g.beginPath();
      g.rect(x, y, s, s);
      g.clip();
      g.fillStyle = pick(i + 4);
      g.fillRect(x, y, s, s);
      const k = i % 8;
      if (k === 0) {
        g.fillStyle = pick(0);
        g.fillRect(x + s * 0.12, y + s * 0.1, s * 0.76, s * 0.42);
        g.fillStyle = pick(2);
        g.fillRect(x + s * 0.12, y + s * 0.58, s * 0.76, s * 0.3);
      } else if (k === 1) {
        for (let j = 0; j < 4; j++) {
          g.strokeStyle = pick(j);
          g.lineWidth = s * 0.07;
          g.beginPath();
          g.arc(x + s * 0.5, y + s * 0.95, s * (0.2 + j * 0.13), Math.PI, 0);
          g.stroke();
        }
      } else if (k === 2) {
        const sky = g.createLinearGradient(0, y, 0, y + s);
        sky.addColorStop(0, pick(4));
        sky.addColorStop(0.6, pick(1));
        sky.addColorStop(1, pick(5));
        g.fillStyle = sky;
        g.fillRect(x, y, s, s);
        g.fillStyle = pick(2);
        g.beginPath();
        g.moveTo(x, y + s * 0.72);
        for (let j = 0; j <= 8; j++)
          g.lineTo(x + (s * j) / 8, y + s * (0.62 + r() * 0.12));
        g.lineTo(x + s, y + s);
        g.lineTo(x, y + s);
        g.fill();
        g.fillStyle = pick(3);
        g.fillRect(x, y + s * 0.86, s, s * 0.14);
      } else if (k === 3) {
        for (let j = 0; j < 9; j++) {
          g.fillStyle = pick(j % 3 === 0 ? 3 : j % 3 === 1 ? 1 : 0);
          g.fillRect(x + (s * j) / 9, y, s / 18 + r() * s * 0.04, s);
        }
      } else if (k === 4) {
        g.fillStyle = pick(5);
        g.beginPath();
        g.arc(x + s * 0.5, y + s * 0.42, s * 0.24, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = pick(3);
        g.fillRect(x, y + s * 0.7, s, s * 0.3);
      } else if (k === 5) {
        for (let j = 0; j < 6; j++) {
          g.fillStyle = pick(j);
          g.fillRect(
            x + r() * s * 0.6,
            y + r() * s * 0.6,
            s * (0.2 + r() * 0.3),
            s * (0.15 + r() * 0.3),
          );
        }
      } else if (k === 6) {
        g.fillStyle = "#efe9de";
        g.fillRect(x, y, s, s);
        g.strokeStyle = pick(3);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x + s * 0.5, y + s * 0.92);
        g.bezierCurveTo(x + s * 0.45, y + s * 0.6, x + s * 0.6, y + s * 0.4, x + s * 0.5, y + s * 0.08);
        g.stroke();
        for (let j = 0; j < 7; j++) {
          const t = 0.2 + j * 0.1,
            side = j % 2 ? 1 : -1;
          g.fillStyle = pick(2);
          g.beginPath();
          g.ellipse(x + s * (0.5 + side * 0.11), y + s * (1 - t), s * 0.1, s * 0.035, side * 0.6, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        const grad = g.createLinearGradient(x, y, x + s, y + s);
        grad.addColorStop(0, pick(0));
        grad.addColorStop(0.5, pick(1));
        grad.addColorStop(1, pick(2));
        g.fillStyle = grad;
        g.fillRect(x, y, s, s);
      }
      g.restore();
    }
    return finish(c);
  });
}
/** Map a box's front (+Z) face to one atlas tile; other faces take the paper edge. */
export function artUV(geometry, index) {
  const p = geometry.attributes.position,
    n = geometry.attributes.normal,
    uv = geometry.attributes.uv;
  geometry.computeBoundingBox();
  const b = geometry.boundingBox,
    col = index % ART_COLUMNS,
    row = Math.floor(index / ART_COLUMNS) % ART_ROWS;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) - b.min.x) / (b.max.x - b.min.x || 1),
      v = (p.getY(i) - b.min.y) / (b.max.y - b.min.y || 1);
    const front = n.getZ(i) > 0.5;
    uv.setXY(
      i,
      (col + (front ? u : 0.02)) / ART_COLUMNS,
      1 - (row + 1 - (front ? v : 0.02)) / ART_ROWS,
    );
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Flat-woven rug with a border and a quiet field pattern; UVs span the rug. */
export function rugTexture(style, colors, base) {
  return memo("rug|" + style, () => {
    const [c, g] = canvas(512, 512),
      r = rng(style.length * 31 + 7);
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = colors[3];
    g.globalAlpha = 0.55;
    g.lineWidth = 10;
    g.strokeRect(26, 26, 460, 460);
    g.lineWidth = 3;
    g.strokeRect(46, 46, 420, 420);
    g.globalAlpha = 0.16;
    g.fillStyle = colors[0];
    for (let y = 70; y < 450; y += 38)
      for (let x = 70; x < 450; x += 38)
        if ((x + y) % 76 === 0) g.fillRect(x, y, 14, 14);
    g.globalAlpha = 0.07;
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = r() > 0.5 ? "#000" : "#fff";
      g.fillRect(r() * 512, r() * 512, 2, 2);
    }
    return finish(c);
  });
}

/** Spines of 24 books in the style's colours; book boxes sample one column each. */
export function bookTexture(style, colors) {
  return memo("books|" + style, () => {
    const [c, g] = canvas(384, 64),
      r = rng(style.length * 53 + 3),
      tones = [...colors, "#e9e3d6", "#2c2c2a", "#8b7a63"];
    for (let i = 0; i < 24; i++) {
      g.fillStyle = tones[Math.floor(r() * tones.length)];
      g.fillRect(i * 16, 0, 16, 64);
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(i * 16 + 3, 10 + r() * 6, 10, 2);
      g.fillRect(i * 16 + 3, 48, 10, 1.5);
    }
    return finish(c);
  });
}

/** 50 cm carpet tiles laid quarter-turned; canvas spans 1 m for metre UVs. */
export function carpetTexture(style, base) {
  return memo("carpet|" + style, () => {
    const [c, g] = canvas(256, 256),
      r = rng(style.length * 71 + 5);
    const col = new THREE.Color(base);
    for (let q = 0; q < 4; q++) {
      const x0 = (q % 2) * 128,
        y0 = Math.floor(q / 2) * 128,
        k = 0.94 + (q % 3) * 0.035;
      g.fillStyle = "#" + col.clone().multiplyScalar(k).getHexString();
      g.fillRect(x0, y0, 128, 128);
      g.globalAlpha = 0.18;
      g.fillStyle = "#" + col.clone().multiplyScalar(0.8).getHexString();
      for (let j = 0; j < 16; j++)
        if (q % 2) g.fillRect(x0, y0 + j * 8, 128, 3);
        else g.fillRect(x0 + j * 8, y0, 3, 128);
      g.globalAlpha = 1;
    }
    g.globalAlpha = 0.12;
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = r() > 0.5 ? "#000" : "#fff";
      g.fillRect(r() * 256, r() * 256, 1, 1);
    }
    return finish(c, { repeat: [1, 1] });
  });
}

/** Large-format tile with fine grout; `size` metres per tile, canvas holds 2x2. */
export function tileTexture(key, base, size = 0.6, ratio = 1) {
  return memo("tile|" + key + base, () => {
    const [c, g] = canvas(256, Math.round(256 / ratio)),
      r = rng(base.length * 17 + 11),
      col = new THREE.Color(base);
    const tw = 128,
      th = 128 / ratio;
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        g.fillStyle =
          "#" + col.clone().multiplyScalar(0.97 + r() * 0.05).getHexString();
        g.fillRect(i * tw, j * th, tw, th);
      }
    g.fillStyle = "#" + col.clone().multiplyScalar(0.88).getHexString();
    for (let i = 0; i <= 2; i++) {
      g.fillRect(i * tw - 1, 0, 2, c.height);
      g.fillRect(0, i * th - 1, c.width, 2);
    }
    return finish(c, { repeat: [1 / (size * 2), 1 / ((size / ratio) * 2)] });
  });
}

/** Soft daylight spill: bright at the window edge (v = 1), fading into the room. */
export function daylightTexture() {
  return memo("daylight", () => {
    const [c, g] = canvas(64, 128);
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.65, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 128);
    const side = g.createLinearGradient(0, 0, 64, 0);
    side.addColorStop(0, "rgba(0,0,0,1)");
    side.addColorStop(0.18, "rgba(0,0,0,0)");
    side.addColorStop(0.82, "rgba(0,0,0,0)");
    side.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = side;
    g.fillRect(0, 0, 64, 128);
    return finish(c);
  });
}

/** Dim screen glow for monitors and the meeting-room display. */
export function screenTexture() {
  return memo("screen", () => {
    const [c, g] = canvas(256, 144);
    const grad = g.createLinearGradient(0, 0, 256, 144);
    grad.addColorStop(0, "#1d2f3a");
    grad.addColorStop(1, "#0d1418");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 144);
    g.fillStyle = "rgba(160,205,220,0.35)";
    g.fillRect(18, 18, 120, 10);
    g.fillStyle = "rgba(160,205,220,0.18)";
    for (let i = 0; i < 5; i++) g.fillRect(18, 44 + i * 16, 90 + ((i * 37) % 80), 6);
    g.fillStyle = "rgba(208,140,69,0.45)";
    g.fillRect(160, 44, 74, 74);
    return finish(c);
  });
}
