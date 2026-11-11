/* Where something could plausibly be standing: beside walls and along pavements near the
   viewer, never inside a building and never behind one (2D line of sight against
   OpenStreetMap footprints). Local frame: metres, x = east, z = south (north is -z),
   matching the device-orientation camera frame. */

const R = 6378137;
const CACHE_PREFIX = 'camera.osm.';
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;

export function toLocal(origin, lat, lng) {
  const k = Math.PI / 180;
  return {
    x: (lng - origin.lng) * k * R * Math.cos(origin.lat * k),
    z: -(lat - origin.lat) * k * R
  };
}

export function toGeo(origin, x, z) {
  const k = Math.PI / 180;
  return {
    lat: origin.lat - z / (R * k),
    lng: origin.lng + x / (R * k * Math.cos(origin.lat * k))
  };
}

/* Compass bearing (deg clockwise from north) of a local point seen from the origin. */
export const bearingOf = (x, z) => ((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360;
export const angleDelta = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

/* OpenStreetMap buildings and streets from OpenFreeMap's vector tiles (z14, no key,
   CDN-cached). The Overpass API proved too slow and unreliable from browsers. */
const TILEJSON = 'https://tiles.openfreemap.org/planet';
const ROAD_CLASS = { primary: 'primary', secondary: 'secondary', tertiary: 'tertiary', minor: 'residential', service: 'service', path: 'footway' };

async function fetchOsm(lat, lng, signal) {
  const [{ VectorTile }, { default: Pbf }] = await Promise.all([
    import('https://cdn.jsdelivr.net/npm/@mapbox/vector-tile@2.0.5/+esm'),
    import('https://cdn.jsdelivr.net/npm/pbf@4.0.2/+esm')
  ]);
  const tilejson = await (await fetch(TILEJSON, { signal })).json();
  const template = tilejson.tiles[0];
  const z = 14;
  const n = 2 ** z;
  const fx = ((lng + 180) / 360) * n;
  const latR = (lat * Math.PI) / 180;
  const fy = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx);
  const ty = Math.floor(fy);
  /* Neighbouring tiles only when the viewer is within ~180 m of an edge. */
  const tileM = (40075016 * Math.cos(latR)) / n;
  const edge = 180 / tileM;
  const xs = [tx, ...(fx - tx < edge ? [tx - 1] : []), ...(tx + 1 - fx < edge ? [tx + 1] : [])];
  const ys = [ty, ...(fy - ty < edge ? [ty - 1] : []), ...(ty + 1 - fy < edge ? [ty + 1] : [])];
  const origin = { lat, lng };
  const near = ring => ring.some(([la, ln]) => {
    const p = toLocal(origin, la, ln);
    return Math.hypot(p.x, p.z) < 200;
  });
  const buildings = [];
  const roads = [];
  await Promise.all(xs.flatMap(x => ys.map(async y => {
    const url = template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const buf = await (await fetch(url, { signal })).arrayBuffer();
    const tile = new VectorTile(new Pbf(buf));
    const toGeoPt = (layer, p) => {
      const gx = (x + p.x / layer.extent) / n;
      const gy = (y + p.y / layer.extent) / n;
      return [Math.atan(Math.sinh(Math.PI * (1 - 2 * gy))) * 180 / Math.PI, gx * 360 - 180];
    };
    const b = tile.layers.building;
    for (let i = 0; b && i < b.length; i++) {
      b.feature(i).loadGeometry().forEach(ring => {
        const r = ring.map(p => toGeoPt(b, p));
        if (r.length >= 4 && near(r)) buildings.push(r);
      });
    }
    const t = tile.layers.transportation;
    for (let i = 0; t && i < t.length; i++) {
      const f = t.feature(i);
      const kind = f.properties.subclass === 'pedestrian' ? 'pedestrian' : ROAD_CLASS[f.properties.class];
      if (!kind || f.type !== 2) continue;
      f.loadGeometry().forEach(line => {
        const l = line.map(p => toGeoPt(t, p));
        if (l.length >= 2 && near(l)) roads.push({ kind, line: l });
      });
    }
  })));
  const round = ring => ring.map(([la, ln]) => [+la.toFixed(6), +ln.toFixed(6)]);
  return { buildings: buildings.map(round), roads: roads.map(r => ({ kind: r.kind, line: round(r.line) })) };
}

/* OSM context for a location, cached per ~100 m cell. Resolves null when offline. */
export async function loadSurroundings(lat, lng) {
  const key = `${CACHE_PREFIX}${lat.toFixed(3)},${lng.toFixed(3)}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached && Date.now() - cached.t < CACHE_TTL_MS) return cached.d;
  } catch (e) { /* storage unavailable */ }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const d = await fetchOsm(lat, lng, controller.signal);
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (e) { /* quota */ }
    return d;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const ROAD_HALF_WIDTH = {
  primary: 6, secondary: 5.5, tertiary: 4.5, residential: 3.5, unclassified: 3.5, living_street: 3,
  service: 2.5, pedestrian: 2.5, footway: 1, path: 1, cycleway: 1, steps: 1
};

function segIntersect(ax, az, bx, bz, cx, cz, dx, dz) {
  const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d;
  const u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d;
  return t > 0.001 && t < 0.999 && u >= 0 && u <= 1;
}

function insidePoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/* Candidate standing spots around the viewer, rebuilt whenever the local origin moves. */
export class Surroundings {
  constructor(data, origin) {
    this.origin = origin;
    this.polys = (data ? data.buildings : []).map(ring => ring.map(([lat, lng]) => {
      const p = toLocal(origin, lat, lng);
      return [p.x, p.z];
    })).filter(p => p.length >= 4)
      /* GPS often puts a pavement viewer a few metres inside the nearest footprint;
         that building cannot be in the way of anything, so it is left out. */
      .filter(p => !insidePoly(0, 0, p) && !insidePoly(3, 0, p) && !insidePoly(-3, 0, p) && !insidePoly(0, 3, p) && !insidePoly(0, -3, p));
    this.spots = [];
    this.verified = Boolean(data);
    if (data) this.buildSpots(data);
  }

  blocked(x, z) {
    return this.polys.some(poly => {
      for (let i = 0; i < poly.length - 1; i++) {
        if (segIntersect(0, 0, x, z, poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1])) return true;
      }
      return false;
    });
  }

  insideAny(x, z) {
    return this.polys.some(poly => insidePoly(x, z, poly));
  }

  clear(x, z) {
    return !this.insideAny(x, z) && !this.blocked(x, z);
  }

  buildSpots(data) {
    /* Carriageways: nobody ordinary stands in the middle of the road. */
    const lanes = [];
    (data.roads || []).forEach(road => {
      const half = ROAD_HALF_WIDTH[road.kind];
      if (!half || half < 2.5) return;
      const pts = road.line.map(([lat, lng]) => toLocal(this.origin, lat, lng));
      for (let i = 0; i < pts.length - 1; i++) lanes.push([pts[i], pts[i + 1], half]);
    });
    const onRoad = (x, z) => lanes.some(([a, b, half]) => {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < half + 0.4;
    });
    const add = (x, z, tangent, kind) => {
      const d = Math.hypot(x, z);
      if (d < 4 || d > 75) return;
      if (!this.clear(x, z) || onRoad(x, z)) return;
      this.spots.push({ x, z, d, bearing: bearingOf(x, z), tangent, kind });
    };
    /* Beside walls: 0.9 m out from each facade, every 3 m. */
    this.polys.forEach(poly => {
      for (let i = 0; i < poly.length - 1; i++) {
        const [ax, az] = poly[i];
        const [bx, bz] = poly[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 3) continue;
        const ux = (bx - ax) / len;
        const uz = (bz - az) / len;
        /* Outward is whichever side of the edge lies outside this footprint. */
        const mx = (ax + bx) / 2;
        const mz = (az + bz) / 2;
        const out = insidePoly(mx - uz * 0.5, mz + ux * 0.5, poly) ? -1 : 1;
        const nx = -uz * out;
        const nz = ux * out;
        for (let s = 1.5; s < len - 1; s += 3) {
          add(ax + ux * s + nx * 0.9, az + uz * s + nz * 0.9, Math.atan2(ux, -uz), 'wall');
        }
      }
    });
    /* Pavement edges either side of streets, every 6 m. */
    (data.roads || []).forEach(road => {
      const half = ROAD_HALF_WIDTH[road.kind];
      if (!half) return;
      const pts = road.line.map(([lat, lng]) => {
        const p = toLocal(this.origin, lat, lng);
        return [p.x, p.z];
      });
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i];
        const [bx, bz] = pts[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 2) continue;
        const ux = (bx - ax) / len;
        const uz = (bz - az) / len;
        const off = half + 1.6;
        for (let s = 2; s < len; s += 6) {
          [-1, 1].forEach(side => add(ax + ux * s + uz * off * side, az + uz * s - ux * off * side, Math.atan2(ux, -uz), 'pavement'));
        }
      }
    });
  }

  /* Pick a spot within a distance band whose bearing satisfies `bearingOk`. */
  pick(rand, minD, maxD, bearingOk) {
    const pool = this.spots.filter(s => s.d >= minD && s.d <= maxD && bearingOk(s.bearing));
    if (!pool.length) return null;
    return pool[Math.floor(rand() * pool.length)];
  }
}

/* Solar azimuth (deg from north, clockwise) and elevation (deg), NOAA approximation. */
export function sunPosition(date, lat, lng) {
  const rad = Math.PI / 180;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const epsilon = (23.439 - 0.0000004 * n) * rad;
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = (gmst * 15 + lng) * rad;
  const ha = lst - ra;
  const latR = lat * rad;
  const el = Math.asin(Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(latR) - Math.sin(latR) * Math.cos(ha));
  return { azimuth: ((az / rad) + 360) % 360, elevation: el / rad };
}
