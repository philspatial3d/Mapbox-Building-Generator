/* Asset model: what a generated building is, independent of how it is drawn.
   Every generated feature becomes a component with a stable id, an IFC-style category,
   a level, its dimensions and a basis that says where its geometry came from. The
   building carries a level table, a geographic origin for its local metric frame and a
   provenance record that keeps source facts apart from inferred design choices.
   Pure functions only: the app, the exporters and the Node checks share this file. */

export const ASSET_SCHEMA_VERSION = 1;

/* Basis of a component's geometry.
   footprint: plan taken from the source footprint (or its floor-by-floor offset)
   procedural: placed by the generator's rules (windows, mullions, entrances, equipment) */
export const BASIS = { FOOTPRINT: 'footprint-derived', PROCEDURAL: 'procedural' };

/* layer -> IFC entity, predefined type, display name, basis. Part-name rules refine a layer
   where one layer holds several kinds of element (glass balustrades among windows, posts
   and braces in one exoskeleton). */
const TYPES = {
  podium: { ifc: 'IfcWall', type: 'SOLIDWALL', name: 'Podium wall', basis: BASIS.FOOTPRINT },
  podiumGlass: { ifc: 'IfcWindow', type: 'WINDOW', name: 'Storefront glazing' },
  podiumFrames: { ifc: 'IfcMember', type: 'MULLION', name: 'Storefront frame' },
  podiumDoors: { ifc: 'IfcDoor', type: 'DOOR', name: 'Entrance door' },
  podiumCanopies: { ifc: 'IfcSlab', type: 'USERDEFINED', object: 'Canopy', name: 'Entrance canopy' },
  podiumLobby: { ifc: 'IfcSlab', type: 'FLOOR', name: 'Lobby floor' },
  podiumCap: { ifc: 'IfcCovering', type: 'CLADDING', name: 'Podium cap' },
  core: { ifc: 'IfcWall', type: 'SOLIDWALL', name: 'Exterior wall', basis: BASIS.FOOTPRINT },
  windows: { ifc: 'IfcWindow', type: 'WINDOW', name: 'Window glazing' },
  borders: { ifc: 'IfcMember', type: 'MULLION', name: 'Window frame' },
  windowSills: { ifc: 'IfcMember', type: 'USERDEFINED', object: 'Sill', name: 'Window sill' },
  mullions: { ifc: 'IfcMember', type: 'MULLION', name: 'Mullion' },
  seps: { ifc: 'IfcCovering', type: 'CLADDING', name: 'Slab edge band' },
  balconies: { ifc: 'IfcSlab', type: 'FLOOR', object: 'Balcony', name: 'Balcony slab' },
  railings: { ifc: 'IfcRailing', type: 'GUARDRAIL', name: 'Railing' },
  cornices: { ifc: 'IfcCovering', type: 'CLADDING', object: 'Cornice', name: 'Cornice' },
  roof: { ifc: 'IfcRoof', type: 'FLAT_ROOF', name: 'Roof', basis: BASIS.FOOTPRINT },
  roofTerraces: { ifc: 'IfcSlab', type: 'ROOF', object: 'Terrace deck', name: 'Roof terrace' },
  roofScreens: { ifc: 'IfcBuildingElementProxy', type: 'USERDEFINED', object: 'Plant screen', name: 'Plant screen' },
  roofEquipment: { ifc: 'IfcBuildingElementProxy', type: 'USERDEFINED', object: 'Rooftop plant (indicative)', name: 'Rooftop plant' },
  roofPlanting: { ifc: 'IfcGeographicElement', type: 'USERDEFINED', object: 'Green roof planting', name: 'Roof planting' },
  parapets: { ifc: 'IfcWall', type: 'PARAPET', name: 'Parapet', basis: BASIS.FOOTPRINT },
  rooftopStructures: { ifc: 'IfcWall', type: 'SOLIDWALL', object: 'Rooftop enclosure', name: 'Rooftop enclosure' },
  spires: { ifc: 'IfcBuildingElementProxy', type: 'USERDEFINED', object: 'Spire', name: 'Spire' },
  verticalRibs: { ifc: 'IfcMember', type: 'MEMBER', object: 'Fin', name: 'Facade fin' },
  exoskeleton: { ifc: 'IfcMember', type: 'BRACE', name: 'Exoskeleton member' },
  facadePanels: { ifc: 'IfcPlate', type: 'CURTAIN_PANEL', name: 'Facade panel' },
  facadeJoints: { ifc: 'IfcMember', type: 'USERDEFINED', object: 'Panel joint', name: 'Panel joint' },
  piers: { ifc: 'IfcColumn', type: 'PILASTER', name: 'Pier' },
  accentPanels: { ifc: 'IfcPlate', type: 'CURTAIN_PANEL', object: 'Accent panel', name: 'Accent panel' },
  floorSlabs: { ifc: 'IfcSlab', type: 'FLOOR', name: 'Floor slab', basis: BASIS.FOOTPRINT },
  pillars: { ifc: 'IfcColumn', type: 'COLUMN', name: 'Column' },
  interiorWalls: { ifc: 'IfcWall', type: 'PARTITIONING', name: 'Interior wall' },
  elevatorShafts: { ifc: 'IfcWall', type: 'SHEAR', object: 'Lift shaft', name: 'Lift shaft wall' },
  elevators: { ifc: 'IfcTransportElement', type: 'ELEVATOR', name: 'Lift car' },
  stairs: { ifc: 'IfcStair', type: 'USERDEFINED', object: 'Stair flight', name: 'Stair' },
  stairRailings: { ifc: 'IfcRailing', type: 'HANDRAIL', name: 'Stair handrail' }
};
const PART_RULES = [
  { layer: 'windows', test: /balustrade/, ifc: 'IfcRailing', type: 'BALUSTRADE', name: 'Glass balustrade' },
  { layer: 'windows', test: /dormer/, name: 'Dormer window' },
  { layer: 'borders', test: /louvre/, type: 'USERDEFINED', object: 'Louvre blade', name: 'Louvre blade' },
  { layer: 'borders', test: /muntin/, object: 'Muntin', name: 'Glazing bar' },
  { layer: 'borders', test: /porch_post/, ifc: 'IfcColumn', type: 'COLUMN', name: 'Porch post' },
  { layer: 'windowSills', test: /stoop_step/, ifc: 'IfcStair', type: 'USERDEFINED', object: 'Stoop', name: 'Entrance stoop' },
  { layer: 'windowSills', test: /stoop_cheek/, ifc: 'IfcWall', type: 'SOLIDWALL', object: 'Stoop cheek wall', name: 'Stoop wall' },
  { layer: 'seps', test: /lintel/, ifc: 'IfcBeam', type: 'LINTEL', name: 'Lintel' },
  { layer: 'seps', test: /quoin|keystone|rustication/, object: 'Stone dressing', name: 'Stone dressing' },
  { layer: 'roof', test: /gable/, type: 'GABLE_ROOF', name: 'Gable roof' },
  { layer: 'roof', test: /hip/, type: 'HIP_ROOF', name: 'Hipped roof' },
  { layer: 'roof', test: /mansard/, type: 'MANSARD_ROOF', name: 'Mansard roof' },
  { layer: 'roof', test: /dormer/, type: 'USERDEFINED', object: 'Dormer', name: 'Dormer' },
  { layer: 'roof', test: /vault/, type: 'BARREL_ROOF', name: 'Barrel vault roof', basis: BASIS.FOOTPRINT },
  { layer: 'cornices', test: /chimney/, ifc: 'IfcChimney', type: 'USERDEFINED', object: 'Chimney cap', name: 'Chimney cap' },
  { layer: 'cornices', test: /soffit|fascia/, object: 'Eave', name: 'Eave' },
  { layer: 'parapets', test: /chimney/, ifc: 'IfcChimney', type: 'NOTDEFINED', name: 'Chimney' },
  { layer: 'parapets', test: /balustrade/, ifc: 'IfcRailing', type: 'BALUSTRADE', name: 'Stone balustrade' },
  { layer: 'parapets', test: /coping/, ifc: 'IfcCovering', type: 'CLADDING', object: 'Coping', name: 'Parapet coping', basis: BASIS.FOOTPRINT },
  { layer: 'piers', test: /beam/, ifc: 'IfcBeam', type: 'BEAM', name: 'Crown beam' },
  { layer: 'accentPanels', test: /door/, ifc: 'IfcDoor', type: 'DOOR', name: 'Front door' },
  { layer: 'podiumCanopies', test: /porch_roof/, ifc: 'IfcRoof', type: 'USERDEFINED', object: 'Porch roof', name: 'Porch roof' },
  { layer: 'podiumCanopies', test: /soffit/, ifc: 'IfcCovering', type: 'CEILING', name: 'Canopy soffit' },
  { layer: 'roofEquipment', test: /chimney/, ifc: 'IfcChimney', type: 'NOTDEFINED', name: 'Chimney pot' },
  { layer: 'roofEquipment', test: /water_t/, object: 'Water tower (indicative)', name: 'Water tower' },
  { layer: 'podium', test: /floor_plate/, ifc: 'IfcSlab', type: 'FLOOR', name: 'Podium floor slab' },
  { layer: 'podium', test: /plinth/, object: 'Plinth', name: 'Plinth' },
  { layer: 'podium', test: /spandrel/, object: 'Spandrel', name: 'Podium spandrel' },
  { layer: 'podiumFrames', test: /colonnade|pier/, ifc: 'IfcColumn', type: 'PILASTER', name: 'Streetwall pier' },
  { layer: 'podiumFrames', test: /header/, ifc: 'IfcBeam', type: 'LINTEL', name: 'Entrance header' },
  { layer: 'podiumDoors', test: /revolving/, object: 'Revolving door', name: 'Revolving door' },
  { layer: 'podiumLobby', test: /wall/, ifc: 'IfcWall', type: 'PARTITIONING', name: 'Lobby back wall' },
  { layer: 'exoskeleton', test: /post/, ifc: 'IfcColumn', type: 'COLUMN', name: 'Frame post' },
  { layer: 'exoskeleton', test: /ring|beam/, ifc: 'IfcBeam', type: 'BEAM', name: 'Frame beam' },
  { layer: 'rooftopStructures', test: /glass/, ifc: 'IfcWindow', type: 'SKYLIGHT', name: 'Crown glazing' },
  { layer: 'rooftopStructures', test: /frame/, ifc: 'IfcMember', type: 'MULLION', name: 'Crown frame' },
  { layer: 'rooftopStructures', test: /lantern/, object: 'Lantern', name: 'Lantern' },
  { layer: 'rooftopStructures', test: /penthouse/, object: 'Penthouse', name: 'Penthouse' },
  { layer: 'core', test: /spandrel/, object: 'Spandrel', name: 'Spandrel' },
  { layer: 'core', test: /plinth/, object: 'Plinth', name: 'Plinth' },
  { layer: 'core', test: /gable/, object: 'Gable end', name: 'Gable end wall' }
];

export function componentTypeFor(layerKey, part = '') {
  const base = TYPES[layerKey] || { ifc: 'IfcBuildingElementProxy', type: 'NOTDEFINED', name: layerKey };
  const rule = PART_RULES.find(r => r.layer === layerKey && r.test.test(String(part || '')));
  if (!rule) return { ...base, basis: base.basis || BASIS.PROCEDURAL };
  /* a part rule names a distinct element (a chimney on a parapet line): procedural unless it says otherwise */
  return { ifc: rule.ifc || base.ifc, type: rule.type || base.type, name: rule.name || base.name, object: rule.object ?? base.object ?? null, basis: rule.basis || BASIS.PROCEDURAL };
}

/* FNV-1a over a canonical string: the same footprint, configuration and component give
   the same id on every export, so a model can be re-exported and diffed. */
function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function ringsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function anchorKey(geometry) {
  const polys = ringsOf(geometry);
  let n = 0, sx = 0, sy = 0;
  polys.forEach(p => (p[0] || []).forEach(([x, y]) => { n++; sx += x; sy += y; }));
  if (!n) return '0|0|0';
  return `${(sx / n).toFixed(7)}|${(sy / n).toFixed(7)}|${n}`;
}

export function componentId(layerKey, part, levelIndex, feature, ordinal) {
  const p = feature.properties || {};
  const key = [layerKey, part || '', levelIndex, Number(p.b).toFixed(3), Number(p.h).toFixed(3), anchorKey(feature.geometry), ordinal].join('#');
  return `${layerKey}-L${String(levelIndex).padStart(3, '0')}-${fnv1a(key)}`;
}

/* levels: [{ index, name, elevation, height, zone }] ascending; a component belongs to the
   highest level whose elevation is at or below its base. */
export function levelIndexFor(levels, base) {
  if (!levels.length) return 0;
  let index = 0;
  for (const level of levels) {
    if (level.elevation <= base + 0.05) index = level.index;
    else break;
  }
  return index;
}

/* Equirectangular tangent frame at the origin: x east, y north (z up in IFC; glTF uses
   x east, y up, z south). Distortion is below 1 cm across 1 km at building latitudes. */
export function localFrame(originLng, originLat) {
  const mx = 111320 * Math.cos(originLat * Math.PI / 180);
  const my = 110540;
  return {
    toLocal: (lng, lat) => [(lng - originLng) * mx, (lat - originLat) * my],
    toLngLat: (x, y) => [originLng + x / mx, originLat + y / my],
    metresPerDegree: { lng: mx, lat: my }
  };
}

/* UTM zone and grid coordinates of a point (WGS84, Krueger series), so IFC can carry a
   projected map conversion that standard tools understand. */
export function utmFromLngLat(lng, lat) {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const phi = lat * Math.PI / 180, lambda0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const lambda = lng * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = Math.cos(phi) * (lambda - lambda0);
  const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi
    - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  const easting = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  let northing = k0 * (M + N * Math.tan(phi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
    + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720));
  if (lat < 0) northing += 10000000;
  /* grid convergence: angle from grid north to true north */
  const convergence = Math.atan(Math.tan(lambda - lambda0) * Math.sin(phi));
  return { zone, hemisphere: lat < 0 ? 'S' : 'N', epsg: (lat < 0 ? 32700 : 32600) + zone, easting, northing, convergenceRad: convergence };
}

function polygonAreaM2(rings, toLocal) {
  const ringArea = ring => {
    let s = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = toLocal(ring[j][0], ring[j][1]);
      const [x2, y2] = toLocal(ring[i][0], ring[i][1]);
      s += x1 * y2 - x2 * y1;
    }
    return Math.abs(s) / 2;
  };
  return rings.reduce((sum, rings2) => sum + ringArea(rings2[0] || []) - rings2.slice(1).reduce((h, r) => h + ringArea(r), 0), 0);
}

/* The assumptions a generated model rests on, stated once and carried by every export. */
export const PROCEDURAL_ASSUMPTIONS = [
  'Storey count and floor-to-floor heights come from the chosen preset or the editor, not from survey data.',
  'Entrance position is inferred (street-facing when mapped streets are available, otherwise the longest suitable facade) and can be changed in the editor.',
  'Facade grids, glazing, mullions, panels, cornices and roof equipment are procedural design elements, not surveyed conditions.',
  'Materials and colours are design intent from the preset; they are not measured from the real building.',
  'Interior elements, where present, are indicative planning blocks.'
];

/* Builds the asset manifest from a generated geometry tree.
   source: { type, footprints:[GeoJSON polygons], facts:{ height, minHeight, levels, id } }
   origin: { lng, lat, elevation (m above datum or null), elevationSource } */
export function buildAssetManifest({ geo, cfg = {}, levels = [], source = {}, origin, generator = 'Mapbox Building Generator' }) {
  const frame = localFrame(origin.lng, origin.lat);
  const components = [];
  const counts = {};
  Object.entries(geo || {}).forEach(([layerKey, collection]) => {
    (collection && collection.features || []).forEach((feature, ordinal) => {
      if (!feature || !feature.geometry) return;
      const p = feature.properties || {};
      const base = Number(p.b), top = Number(p.h);
      if (!(Number.isFinite(base) && Number.isFinite(top) && top > base)) return;
      const t = componentTypeFor(layerKey, p.part);
      const level = levelIndexFor(levels, base);
      const polys = ringsOf(feature.geometry);
      const component = {
        id: componentId(layerKey, p.part, level, feature, ordinal),
        layer: layerKey,
        ordinal,
        part: p.part || layerKey,
        ifc: t.ifc,
        predefinedType: t.type,
        objectType: t.object || null,
        name: t.name,
        level,
        basis: t.basis,
        base,
        top,
        height: top - base,
        planAreaM2: polygonAreaM2(polys, frame.toLocal),
        solids: polys.length
      };
      components.push(component);
      counts[t.ifc] = (counts[t.ifc] || 0) + 1;
    });
  });
  const footprints = source.footprints || [];
  const footprintArea = footprints.reduce((s, fp) => s + polygonAreaM2(ringsOf(fp.geometry || fp), frame.toLocal), 0);
  const holes = footprints.reduce((s, fp) => s + ringsOf(fp.geometry || fp).reduce((h, p) => h + Math.max(0, p.length - 1), 0), 0);
  const parts = footprints.reduce((s, fp) => s + ringsOf(fp.geometry || fp).length, 0);
  const top = components.reduce((m, c) => Math.max(m, c.top), 0);
  const facts = source.facts || {};
  const utm = utmFromLngLat(origin.lng, origin.lat);
  return {
    schema: ASSET_SCHEMA_VERSION,
    generator,
    units: { length: 'metre', angle: 'degree' },
    georeference: {
      originLngLat: [origin.lng, origin.lat],
      originElevationM: Number.isFinite(origin.elevation) ? origin.elevation : null,
      originElevationSource: Number.isFinite(origin.elevation) ? (origin.elevationSource || 'terrain model') : 'unknown',
      sourceCrs: 'EPSG:4326 (WGS84 longitude/latitude)',
      localFrame: 'East-North-Up tangent plane at the origin, metres; equirectangular approximation (under 1 cm error within 1 km)',
      gltfAxes: 'x = east, y = up, z = south (glTF is Y-up); the origin is the source footprint centroid at ground level',
      ifcAxes: 'x = east, y = north, z = up; IfcMapConversion to the UTM zone below',
      projected: { epsg: utm.epsg, zone: `${utm.zone}${utm.hemisphere}`, easting: utm.easting, northing: utm.northing, gridConvergenceDeg: utm.convergenceRad * 180 / Math.PI },
      trueNorth: 'local +y (IFC) / local -z (glTF)'
    },
    levels,
    provenance: {
      source: {
        type: source.type || 'unknown',
        footprintCount: footprints.length,
        footprintParts: parts,
        footprintHoles: holes,
        footprintAreaM2: footprintArea,
        sourceHeightM: Number.isFinite(facts.height) ? facts.height : null,
        sourceMinHeightM: Number.isFinite(facts.minHeight) ? facts.minHeight : null,
        sourceLevels: Number.isFinite(facts.levels) ? facts.levels : null,
        sourceId: facts.id ?? null,
        note: 'Footprint geometry and location are source data. Source height, where present, is reported here but the generated height follows the preset unless set to match.'
      },
      inferred: {
        storeys: levels.filter(l => l.zone !== 'roof').length,
        totalHeightM: top,
        preset: cfg.presetName || null,
        entranceSide: cfg.podiumEntranceSide || 'auto',
        entranceBasis: cfg.__entranceBasis || (cfg.podiumEntranceSide && cfg.podiumEntranceSide !== 'auto' ? 'chosen in the editor' : 'longest suitable facade'),
        roofProfile: cfg.roofProfile || 'standard',
        facadeType: cfg.facadeType || null
      },
      assumptions: PROCEDURAL_ASSUMPTIONS
    },
    summary: { components: components.length, byIfcClass: counts, heightM: top },
    components
  };
}
