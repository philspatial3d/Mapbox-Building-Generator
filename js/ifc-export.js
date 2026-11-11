/* IFC4 export of a generated building (STEP physical file, ReferenceView-style geometry).
   Every component is a native IFC element of its class, placed in its storey, with swept
   (extruded polygon) geometry, a surface colour, a material and a property set naming its
   generator id, layer, part and basis. The site carries the source footprint and an
   IfcMapConversion to the UTM zone, so the model lands at its real location in tools that
   read IFC georeferencing. This is an exchange model: elements arrive as IFC-native
   categories with fixed geometry, not as editable parametric families. */
import { localFrame, utmFromLngLat } from './asset-model.js';

const B64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

/* deterministic 128 bits from a string, compressed to the 22-character IFC GlobalId */
function guidFor(key) {
  const words = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map(seed => {
    let h = seed >>> 0;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
      h ^= h >>> 13;
    }
    return h >>> 0;
  });
  const bytes = [];
  words.forEach(w => bytes.push((w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  let num = 0n;
  bytes.forEach(b => { num = (num << 8n) | BigInt(b); });
  let out = '';
  for (let i = 0; i < 22; i++) {
    out = B64[Number(num & 63n)] + out;
    num >>= 6n;
  }
  return out;
}

const esc = text => `'${String(text ?? '').replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/[^\x20-\x7e]/g, ch => `\\X2\\${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}\\X0\\`)}'`;
const num = v => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.';
  const s = (Math.round(n * 1e6) / 1e6).toString();
  return /[.eE]/.test(s) ? s : `${s}.`;
};
const opt = v => (v === null || v === undefined ? '$' : v);

function hexToRgb(hex) {
  const h = String(hex || '#999999').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '9');
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
}

function dms(deg) {
  const sign = deg < 0 ? -1 : 1;
  let a = Math.abs(deg);
  const d = Math.floor(a); a = (a - d) * 60;
  const m = Math.floor(a); a = (a - m) * 60;
  const s = Math.floor(a);
  const micro = Math.round((a - s) * 1e6);
  return `(${[d, m, s, micro].map(v => String(sign * v)).join(',')})`;
}

function cleanRing(ring, toLocal) {
  const pts = [];
  for (const [lng, lat] of ring) {
    const [x, y] = toLocal(lng, lat);
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(last[0] - x, last[1] - y) > 1e-4) pts.push([x, y]);
  }
  if (pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-4) pts.pop();
  if (pts.length < 3) return null;
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  if (Math.abs(area) < 1e-6) return null;
  return { pts, ccw: area > 0 };
}

const ENTITY_ARITY_13 = new Set(['IfcWindow', 'IfcDoor']);
const EXTERNAL_PSET = { IfcWall: 'Pset_WallCommon', IfcWindow: 'Pset_WindowCommon', IfcDoor: 'Pset_DoorCommon', IfcCurtainWall: 'Pset_CurtainWallCommon', IfcRoof: 'Pset_RoofCommon' };
const INTERNAL_LAYERS = new Set(['interiorWalls', 'floorSlabs', 'pillars', 'elevatorShafts', 'elevators', 'stairs', 'stairRailings', 'podiumLobby']);

/* manifest: from buildAssetManifest; geo: the generated geometry tree (same order);
   styleFor(layerKey, props) -> { color, opacity, material } */
export function buildIfc({ manifest, geo, styleFor, sourceFootprints = [], name = 'Generated building', timestamp = new Date().toISOString() }) {
  const lines = [];
  let id = 0;
  const add = text => { id += 1; lines.push(`#${id}=${text};`); return `#${id}`; };
  const origin = manifest.georeference.originLngLat;
  const frame = localFrame(origin[0], origin[1]);
  const elevation = manifest.georeference.originElevationM;

  const person = add(`IFCPERSON($,$,'',$,$,$,$,$)`);
  const org = add(`IFCORGANIZATION($,${esc(manifest.generator)},$,$,$)`);
  const po = add(`IFCPERSONANDORGANIZATION(${person},${org},$)`);
  const app = add(`IFCAPPLICATION(${org},'${manifest.schema}',${esc(manifest.generator)},'MBG')`);
  const stamp = Math.floor(Date.parse(timestamp) / 1000) || 0;
  const oh = add(`IFCOWNERHISTORY(${po},${app},$,.ADDED.,${stamp},${po},${app},${stamp})`);
  const lenUnit = add(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`);
  const areaUnit = add(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`);
  const volUnit = add(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`);
  const angUnit = add(`IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)`);
  const units = add(`IFCUNITASSIGNMENT((${lenUnit},${areaUnit},${volUnit},${angUnit}))`);
  const o3 = add(`IFCCARTESIANPOINT((0.,0.,0.))`);
  const zDir = add(`IFCDIRECTION((0.,0.,1.))`);
  const xDir = add(`IFCDIRECTION((1.,0.,0.))`);
  const worldAxis = add(`IFCAXIS2PLACEMENT3D(${o3},${zDir},${xDir})`);
  const north = add(`IFCDIRECTION((0.,1.))`);
  const ctx = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${worldAxis},${north})`);
  const body = add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${ctx},$,.MODEL_VIEW.,$)`);
  const footprintCtx = add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('FootPrint','Model',*,*,*,*,${ctx},$,.PLAN_VIEW.,$)`);
  const project = add(`IFCPROJECT('${guidFor(`project|${name}|${origin}`)}',${oh},${esc(name)},${esc('Generated by ' + manifest.generator + '; procedural exterior exchange model')},$,$,$,(${ctx}),${units})`);

  /* Georeferencing: local x = true east, y = true north. The map axis is measured, not
     assumed, by projecting points 100 m east of the origin into the UTM grid. */
  const utm = utmFromLngLat(origin[0], origin[1]);
  const east = utmFromLngLat(...frame.toLngLat(100, 0));
  const ax = (east.easting - utm.easting), ay = (east.northing - utm.northing);
  const al = Math.hypot(ax, ay) || 1;
  const crs = add(`IFCPROJECTEDCRS('EPSG:${utm.epsg}',${esc(`WGS 84 / UTM zone ${utm.zone}${utm.hemisphere}`)},'WGS84',$,'UTM',${esc(`${utm.zone}${utm.hemisphere}`)},${lenUnit})`);
  add(`IFCMAPCONVERSION(${ctx},${crs},${num(utm.easting)},${num(utm.northing)},${num(Number.isFinite(elevation) ? elevation : 0)},${num(ax / al)},${num(ay / al)},1.)`);

  const placeAt = (rel, x, y, z) => {
    const p = add(`IFCCARTESIANPOINT((${num(x)},${num(y)},${num(z)}))`);
    return add(`IFCLOCALPLACEMENT(${rel},${add(`IFCAXIS2PLACEMENT3D(${p},$,$)`)})`);
  };
  const sitePlace = placeAt('$', 0, 0, 0);
  const sourceRings = sourceFootprints.flatMap(fp => {
    const g = fp.geometry || fp;
    return g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map(p => p[0]) : [];
  });
  let siteRep = '$';
  const curves = sourceRings.map(ring => cleanRing(ring, frame.toLocal)).filter(Boolean).map(({ pts }) => {
    const ptsIds = [...pts, pts[0]].map(([x, y]) => add(`IFCCARTESIANPOINT((${num(x)},${num(y)},0.))`));
    return add(`IFCPOLYLINE((${ptsIds.join(',')}))`);
  });
  if (curves.length) {
    const set = add(`IFCGEOMETRICCURVESET((${curves.join(',')}))`);
    const rep = add(`IFCSHAPEREPRESENTATION(${footprintCtx},'FootPrint','GeometricCurveSet',(${set}))`);
    siteRep = add(`IFCPRODUCTDEFINITIONSHAPE(${esc('Source footprint')},$,(${rep}))`);
  }
  const site = add(`IFCSITE('${guidFor(`site|${origin}`)}',${oh},'Site',${esc('Footprint and location from the source data')},$,${sitePlace},${siteRep},$,.ELEMENT.,${dms(origin[1])},${dms(origin[0])},${Number.isFinite(elevation) ? num(elevation) : '$'},$,$)`);
  const buildingPlace = placeAt(sitePlace, 0, 0, 0);
  const building = add(`IFCBUILDING('${guidFor(`building|${origin}|${name}`)}',${oh},${esc(name)},${esc('Procedural exterior model; see Pset_MBG_Provenance')},$,${buildingPlace},$,$,.ELEMENT.,$,$,$)`);
  add(`IFCRELAGGREGATES('${guidFor('agg|project')}',${oh},$,$,${project},(${site}))`);
  add(`IFCRELAGGREGATES('${guidFor('agg|site')}',${oh},$,$,${site},(${building}))`);

  const storeys = new Map();
  (manifest.levels.length ? manifest.levels : [{ index: 0, name: 'Level 00', elevation: 0 }]).forEach(level => {
    const place = placeAt(buildingPlace, 0, 0, level.elevation);
    const storey = add(`IFCBUILDINGSTOREY('${guidFor(`storey|${origin}|${level.index}`)}',${oh},${esc(level.name)},$,$,${place},$,$,.ELEMENT.,${num(level.elevation)})`);
    storeys.set(level.index, { storey, place, elevation: level.elevation, elements: [] });
  });
  add(`IFCRELAGGREGATES('${guidFor('agg|building')}',${oh},$,$,${building},(${[...storeys.values()].map(s => s.storey).join(',')}))`);

  const prop = (pname, type, value) => add(`IFCPROPERTYSINGLEVALUE(${esc(pname)},$,${type}(${value}),$)`);
  const pset = (owner, psetName, props, key) => {
    const ps = add(`IFCPROPERTYSET('${guidFor(`pset|${psetName}|${key}`)}',${oh},${esc(psetName)},$,(${props.join(',')}))`);
    add(`IFCRELDEFINESBYPROPERTIES('${guidFor(`relpset|${psetName}|${key}`)}',${oh},$,$,(${owner}),${ps})`);
  };

  const styles = new Map();
  const materials = new Map();
  const styleFor2 = (layerKey, props) => {
    const s = styleFor(layerKey, props) || {};
    const key = `${s.material || layerKey}|${s.color}|${Number(s.opacity ?? 1).toFixed(2)}`;
    if (!styles.has(key)) {
      const [r, g, b] = hexToRgb(s.color);
      const colour = add(`IFCCOLOURRGB($,${num(r)},${num(g)},${num(b)})`);
      const rendering = add(`IFCSURFACESTYLERENDERING(${colour},${num(1 - Number(s.opacity ?? 1))},$,$,$,$,$,$,.NOTDEFINED.)`);
      const style = add(`IFCSURFACESTYLE(${esc(s.material || layerKey)},.BOTH.,(${rendering}))`);
      styles.set(key, style);
    }
    const mkey = s.material || layerKey;
    if (!materials.has(mkey)) materials.set(mkey, { material: add(`IFCMATERIAL(${esc(mkey)},$,${esc(s.category || 'Generated')})`), elements: [] });
    return { style: styles.get(key), mat: materials.get(mkey) };
  };

  const byClass = {};
  const features = [];
  Object.entries(geo || {}).forEach(([layerKey, fc]) => (fc && fc.features || []).forEach(f => {
    const p = f && f.properties || {};
    if (f && f.geometry && Number(p.h) > Number(p.b)) features.push({ layerKey, f });
  }));
  if (features.length !== manifest.components.length) throw new Error(`IFC export: ${features.length} features but ${manifest.components.length} components`);

  features.forEach(({ layerKey, f }, i) => {
    const c = manifest.components[i];
    const storeyRec = storeys.get(c.level) || storeys.values().next().value;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const depth = c.top - c.base;
    const { style, mat } = styleFor2(layerKey, f.properties || {});
    const solids = [];
    for (const poly of polys) {
      const outer = cleanRing(poly[0] || [], frame.toLocal);
      if (!outer) continue;
      const curveOf = ({ pts }) => {
        const ids = [...pts, pts[0]].map(([x, y]) => add(`IFCCARTESIANPOINT((${num(x)},${num(y)}))`));
        return add(`IFCPOLYLINE((${ids.join(',')}))`);
      };
      const holes = poly.slice(1).map(r => cleanRing(r, frame.toLocal)).filter(Boolean);
      const profile = holes.length
        ? add(`IFCARBITRARYPROFILEDEFWITHVOIDS(.AREA.,$,${curveOf(outer)},(${holes.map(curveOf).join(',')}))`)
        : add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${curveOf(outer)})`);
      const solid = add(`IFCEXTRUDEDAREASOLID(${profile},${worldAxis},${zDir},${num(depth)})`);
      add(`IFCSTYLEDITEM(${solid},(${style}),$)`);
      solids.push(solid);
    }
    if (!solids.length) return;
    const rep = add(`IFCSHAPEREPRESENTATION(${body},'Body','SweptSolid',(${solids.join(',')}))`);
    const shape = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${rep}))`);
    const place = placeAt(storeyRec.place, 0, 0, c.base - storeyRec.elevation);
    const userDefined = c.predefinedType === 'USERDEFINED';
    const objectType = c.objectType || (userDefined ? c.name : null);
    const guid = guidFor(c.id);
    const head = `'${guid}',${oh},${esc(c.name)},${esc(`${c.layer}/${c.part}`)},${objectType ? esc(objectType) : '$'},${place},${shape},${esc(c.id)}`;
    const entity = c.ifc.toUpperCase();
    const element = ENTITY_ARITY_13.has(c.ifc)
      ? add(`${entity}(${head},${num(depth)},$,.${c.predefinedType}.,.NOTDEFINED.,$)`)
      : add(`${entity}(${head},.${c.predefinedType}.)`);
    storeyRec.elements.push(element);
    mat.elements.push(element);
    byClass[c.ifc] = (byClass[c.ifc] || 0) + 1;
    pset(element, 'Pset_MBG_Component', [
      prop('ComponentId', 'IFCIDENTIFIER', esc(c.id)),
      prop('Layer', 'IFCLABEL', esc(c.layer)),
      prop('Part', 'IFCLABEL', esc(c.part)),
      prop('Basis', 'IFCLABEL', esc(c.basis)),
      prop('Height', 'IFCLENGTHMEASURE', num(depth)),
      prop('PlanArea', 'IFCAREAMEASURE', num(c.planAreaM2))
    ], c.id);
    const common = EXTERNAL_PSET[c.ifc];
    if (common) pset(element, common, [prop('IsExternal', 'IFCBOOLEAN', INTERNAL_LAYERS.has(c.layer) ? '.F.' : '.T.')], `${c.id}|common`);
  });

  storeys.forEach((s, index) => {
    if (s.elements.length) add(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${guidFor(`contain|${origin}|${index}`)}',${oh},$,$,(${s.elements.join(',')}),${s.storey})`);
  });
  materials.forEach((m, key) => {
    if (m.elements.length) add(`IFCRELASSOCIATESMATERIAL('${guidFor(`mat|${key}`)}',${oh},$,$,(${m.elements.join(',')}),${m.material})`);
  });
  const src = manifest.provenance.source, inf = manifest.provenance.inferred;
  pset(building, 'Pset_MBG_Provenance', [
    prop('AssetSchema', 'IFCINTEGER', String(manifest.schema)),
    prop('SourceType', 'IFCLABEL', esc(src.type)),
    prop('SourceFootprintArea', 'IFCAREAMEASURE', num(src.footprintAreaM2)),
    prop('SourceFootprintParts', 'IFCINTEGER', String(src.footprintParts)),
    prop('SourceFootprintHoles', 'IFCINTEGER', String(src.footprintHoles)),
    ...(src.sourceHeightM !== null ? [prop('SourceHeight', 'IFCLENGTHMEASURE', num(src.sourceHeightM))] : []),
    prop('InferredHeight', 'IFCLENGTHMEASURE', num(inf.totalHeightM)),
    prop('InferredStoreys', 'IFCINTEGER', String(inf.storeys)),
    prop('EntranceBasis', 'IFCTEXT', esc(inf.entranceBasis)),
    prop('Assumptions', 'IFCTEXT', esc(manifest.provenance.assumptions.join(' '))),
    prop('ElevationSource', 'IFCLABEL', esc(manifest.georeference.originElevationSource))
  ], 'building');

  const header = [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]','ExchangeRequirement [Procedural exterior model]'),'2;1');",
    `FILE_NAME(${esc(name.replace(/[^\w.-]+/g, '-') + '.ifc')},'${timestamp.replace(/\.\d+Z$/, '')}',(''),(${esc(manifest.generator)}),${esc(manifest.generator)},${esc(manifest.generator + ' asset schema ' + manifest.schema)},'');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;'
  ];
  return { text: [...header, ...lines, 'ENDSEC;', 'END-ISO-10303-21;', ''].join('\n'), stats: { entities: id, elements: Object.values(byClass).reduce((a, b) => a + b, 0), byClass } };
}
