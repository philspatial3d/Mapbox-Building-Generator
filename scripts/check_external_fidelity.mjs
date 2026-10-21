#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const appPath = path.join(root, 'app.html');
const presetsPath = path.join(root, 'presets', 'defaults.json');
const texturesPath = path.join(root, 'js', 'textures.js');
const html = fs.readFileSync(appPath, 'utf8');
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
const texturesSource = fs.readFileSync(texturesPath, 'utf8');

const failures = [];
const pass = message => console.log(`PASS ${message}`);
const assert = (condition, message) => {
  if (condition) pass(message);
  else failures.push(message);
};

function scanPair(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unclosed ${openChar}${closeChar} pair at ${openIndex}`);
}

function extractConstStatement(source, name) {
  const start = source.indexOf(`const ${name}`);
  if (start < 0) throw new Error(`Missing const ${name}`);
  let paren = 0;
  let square = 0;
  let curly = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '[') square++;
    else if (ch === ']') square--;
    else if (ch === '{') curly++;
    else if (ch === '}') curly--;
    else if (ch === ';' && paren === 0 && square === 0 && curly === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed const ${name}`);
}

function extractTopLevelFunctions(source) {
  const functions = [];
  const names = new Set();
  const matcher = /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let match;
  while ((match = matcher.exec(source))) {
    const name = match[1];
    const parenStart = source.indexOf('(', match.index);
    const parenEnd = scanPair(source, parenStart, '(', ')');
    const bodyStart = source.indexOf('{', parenEnd);
    if (bodyStart < 0) throw new Error(`Missing body for ${name}`);
    const bodyEnd = scanPair(source, bodyStart, '{', '}');
    if (!names.has(name)) {
      functions.push(source.slice(match.index, bodyEnd + 1));
      names.add(name);
    }
    matcher.lastIndex = bodyEnd + 1;
  }
  return functions.join('\n\n');
}

const requiredControls = [
  'buildingType', 'facadeType', 'facadeArticulation', 'facadeArticulationDensity', 'panelModuleWidth',
  'facadeArticulationDepth', 'facadeArticulationWidth', 'facadeArticulationColor',
  'windowStyle', 'windowProportion', 'separatorStyle', 'separatorEvery',
  'balconyType', 'balconyWidthRatio', 'balconySlabThickness', 'roofProfile',
  'roofAccentColor', 'viewTransparency', 'floorplanStatus', 'downloadGeo',
  'siteMenu', 'siteMenuToggle', 'siteMenuBody',
  'podiumStyle', 'podiumUpperFloorHt', 'podiumBaseHeight', 'podiumBayWidth',
  'podiumPierWidth', 'podiumCapDepth', 'podiumEntranceSide', 'podiumEntranceStyle',
  'podiumEntranceWidth', 'podiumEntranceHeight', 'podiumEntranceRecess',
  'podiumDoorStyle', 'podiumDoorCount', 'podiumDoorHeight', 'podiumCanopyStyle',
  'podiumCanopyDepth', 'podiumLobbyDepth'
];
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicateIds.length === 0, 'HTML control IDs are unique');
requiredControls.forEach(id => assert(ids.includes(id), `control #${id} exists`));
const staticDomRefs = [...new Set([...html.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]))];
const missingDomRefs = staticDomRefs.filter(id => !ids.includes(id));
assert(missingDomRefs.length === 0, `all ${staticDomRefs.length} static DOM references resolve to controls`);
assert(
  /<input id="buildingType" type="hidden" value="office">/.test(html)
    && !/<(?:label|td)[^>]*>\s*Building Type\s*</.test(html)
    && !/<select id="buildingType">/.test(html),
  'building typology remains internal and is not exposed as a misleading editor option'
);
assert(
  /<label for="randomBuildingType">Design Profile<\/label>/.test(html)
    && !/Random Building Type|Updating Building Type/.test(html),
  'randomizer describes archetypes as design profiles rather than building types'
);
assert(
  /<section id="siteMenu"[\s\S]*id="siteMenuToggle"[\s\S]*id="siteMenuBody"/.test(html)
    && /#siteMenu\.collapsed #siteMenuBody\{[\s\S]{0,80}display:none/.test(html),
  'site and footprint tools share one hideable menu'
);
assert(
  /body\{[\s\S]{0,120}font:13px\/1\.35/.test(html)
    && /#controls td\{[\s\S]{0,180}font-size:12px/.test(html),
  'map and editor typography use the compact scale'
);
assert(
  /<select id="facadeArticulation">[\s\S]*?<option value="none" selected>None<\/option>/.test(html),
  'facade articulation is off in the initial editor state'
);
assert(
  /<select id="separatorStyle">[\s\S]*?<option value="slab-edge" selected>Slab edge<\/option>/.test(html),
  'slab edge is the initial facade band type'
);
assert(
  /pointHitsActiveBuilding\(e\.point, e\.lngLat\)[\s\S]{0,260}renderWithLoader\(lastPoly, cfg\(\)/.test(html)
    && /map\.queryRenderedFeatures\(point, \{ layers: generatedLayerIds \}\)/.test(html),
  'clicking the active hidden parcel or its visible generated geometry rebuilds the current building'
);
assert(
  /balconyActive && !\(Number\(balconyDepth\.value\) > 0\)\) balconyDepth\.value = '0\.9'/.test(html)
    && /\['balconyType', 'balconyDepth', 'balEvery', 'balconyWidthRatio', 'balconySlabThickness'/.test(html),
  'active balcony types recover from zero depth and rerender from balcony controls'
);
assert(
  /\.main-flow-secondary\s*\{\s*display\s*:\s*none\s*!important\s*;?\s*\}/.test(html),
  'legacy and secondary tools stay outside the primary editor flow'
);
assert(
  /enableRibs\s*:\s*usesFins/.test(html)
    && /exoType\s*:\s*usesLattice\s*\?\s*'lattice'\s*:\s*\(usesFrame\s*\?\s*'vertical'\s*:\s*'none'\)/.test(html),
  'live configuration derives legacy rib and exoskeleton fields only from facade articulation'
);
assert(
  /mbg_climate_opacity_factor/.test(html)
    && !/applyToLayer\('core'[\s\S]{0,320}feat\.properties\.a\s*=/.test(html),
  'facade climate metadata cannot lower the rendered wall-shell opacity'
);
assert(
  /const panelModuleWidth = clamp\(Number\(cfg\.panelModuleWidth\)/.test(html)
    && /Math\.round\(len \/ panelModuleWidth\)/.test(html),
  'panel grid uses the explicit module-width control instead of opaque density scaling'
);
assert(
  /<select id="podiumStyle">[\s\S]*?Transparent retail[\s\S]*?Stone portal[\s\S]*?Bronze residential[\s\S]*?Arcaded commercial[\s\S]*?Civic colonnade[\s\S]*?Sculpted glass/.test(html),
  'podium editor offers six coordinated architectural compositions'
);
assert(
  /function buildPodiumSystem\(/.test(html)
    && /buildPodiumSystem\(footprintPoly, o, out\)/.test(html)
    && !/podiumNoise\s*<\s*o\.podiumWinRatio/.test(html),
  'podium geometry uses a deterministic layered entrance system instead of random glazing'
);
assert(
  /'fill-extrusion-opacity'\s*:\s*layerOpacity/.test(html)
    && !/'fill-extrusion-opacity'[\s\S]{0,180}\['get', 'a'\]/.test(html),
  'Mapbox extrusion opacity remains a supported layer constant while controls set that constant'
);
assert(
  /function applyPodiumConfigFallbacks\(/.test(html)
    && /const podiumStyle = inferPodiumStyle\(config\)/.test(html),
  'legacy presets receive a complete podium composition fallback'
);
assert(
  /@media\s*\(max-width:\s*899px\)/.test(html)
    && /max-height\s*:\s*min\(62vh,\s*560px\)/.test(html)
    && /-webkit-overflow-scrolling\s*:\s*touch/.test(html),
  'narrow screens use a bounded, scrollable mobile editor sheet'
);

const requiredLayers = [
  'core', 'windows', 'windowSills', 'seps', 'balconies', 'railings',
  'facadePanels', 'facadeJoints', 'verticalRibs', 'exoskeleton',
  'roof', 'roofTerraces', 'roofScreens', 'roofEquipment', 'roofPlanting',
  'podium', 'podiumGlass', 'podiumFrames', 'podiumDoors', 'podiumCanopies',
  'podiumLobby', 'podiumCap'
];
requiredLayers.forEach(layer => {
  const occurrences = (html.match(new RegExp(`['\"]${layer}['\"]`, 'g')) || []).length;
  assert(occurrences >= 3, `${layer} is wired through geometry, presentation, and export`);
});

const validArticulations = new Set(['none', 'panel-grid', 'vertical-fins', 'expressed-frame', 'lattice']);
const validRoofs = new Set(['standard', 'mechanical', 'terraced', 'green', 'tapered', 'crown', 'gable', 'hip', 'mansard']);
const validBands = new Set(['none', 'recessed-joint', 'slab-edge', 'spandrel-band', 'belt-course', 'flowing-band']);
const validPodiumStyles = new Set([
  'transparent-retail', 'stone-portal', 'bronze-residential',
  'arcaded-commercial', 'civic-colonnade', 'sculpted-glass'
]);
const validPodiumEntranceSides = new Set(['auto', 'longest', 'north', 'east', 'south', 'west', 'corner']);
const validPodiumEntranceStyles = new Set(['recessed', 'framed', 'colonnade', 'sculpted']);
const validPodiumDoorStyles = new Set(['double', 'revolving', 'retail-pairs']);
const validPodiumCanopyStyles = new Set(['none', 'blade', 'framed', 'deep-soffit']);
const requiredPresetKeys = [
  'buildingType', 'facadeType', 'viewTransparency', 'windowStyle', 'windowProportion',
  'facadeArticulation', 'facadeArticulationDensity', 'facadeArticulationDepth',
  'facadeArticulationWidth', 'facadeArticulationColor', 'separatorStyle',
  'separatorEvery', 'balWidthRatio', 'balSlabH', 'roofProfile', 'roofAccentCol',
  'podiumStyle', 'podiumUpperFloorHt', 'podiumBaseHeight', 'podiumBayWidth',
  'podiumPierWidth', 'podiumCapDepth', 'podiumEntranceSide', 'podiumEntranceStyle',
  'podiumEntranceWidth', 'podiumEntranceHeight', 'podiumEntranceRecess',
  'podiumDoorStyle', 'podiumDoorCount', 'podiumDoorHeight', 'podiumCanopyStyle',
  'podiumCanopyDepth', 'podiumCanopyThickness', 'podiumLobbyDepth'
];

for (const preset of presets.presets || []) {
  const cfg = preset.config || {};
  assert(requiredPresetKeys.every(key => cfg[key] !== undefined), `${preset.name} uses the external-fidelity preset contract`);
  assert(validArticulations.has(cfg.facadeArticulation), `${preset.name} has a valid facade articulation`);
  assert(validRoofs.has(cfg.roofProfile), `${preset.name} has a valid roof assembly`);
  assert(validBands.has(cfg.separatorStyle), `${preset.name} has a valid facade band`);
  assert(validPodiumStyles.has(cfg.podiumStyle), `${preset.name} has a valid podium composition`);
  assert(validPodiumEntranceSides.has(cfg.podiumEntranceSide), `${preset.name} has a valid podium entrance side`);
  assert(validPodiumEntranceStyles.has(cfg.podiumEntranceStyle), `${preset.name} has a valid podium entrance treatment`);
  assert(validPodiumDoorStyles.has(cfg.podiumDoorStyle), `${preset.name} has a valid podium door system`);
  assert(validPodiumCanopyStyles.has(cfg.podiumCanopyStyle), `${preset.name} has a valid podium canopy system`);
  assert(
    ['enableSlabs', 'enablePillars', 'enableStairs', 'enableElevators', 'enableFloorplans']
      .every(key => cfg[key] === false),
    `${preset.name} keeps internal systems opt-in`
  );
  const busyExterior = cfg.balType !== 'none' && ['lattice', 'expressed-frame', 'vertical-fins'].includes(cfg.facadeArticulation);
  assert(!busyExterior, `${preset.name} avoids competing balcony and structural systems`);
}

const turfUrl = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
const turfResponse = await fetch(turfUrl);
if (!turfResponse.ok) throw new Error(`Could not load pinned Turf test runtime: HTTP ${turfResponse.status}`);
const turfSource = await turfResponse.text();

const context = vm.createContext({ console });
vm.runInContext(turfSource, context, { filename: 'turf.min.js' });
const constNames = [
  'safe', 'safeClone', 'safeBuf', 'safeDiff', 'safeInt', 'rand', 'clamp', 'lightenHex',
  'FACADE_PATTERN_PRESETS', 'FACADE_LIGHT_PRESETS', 'FACADE_CLIMATE_PRESETS',
  'EXTERIOR_LAYER_KEYS', 'envelopeGuardLogCache', 'PRIMARY_ENVELOPE_LAYERS',
  'SECONDARY_ENVELOPE_LAYERS', 'ACCENT_ENVELOPE_LAYERS', 'envelopeProfileCache',
  'TRANSPARENCY_MODE_LABELS', 'EXPORT_SCHEMA_VERSION', 'EXPORT_EDGE_RADIUS_M',
  'EXPORT_ROUNDED_ROOF', 'EXPORT_RADIANCE', 'EXPORT_SHADOW_INTENSITY',
  'MIN_POLY_AREA', 'polyArea', 'isUsablePoly', 'BUILDING_ARCHETYPE_ORDER',
  'MATERIAL_SYSTEMS', 'MATERIAL_SYSTEM_TEXTURES', 'materialSystem', 'BUILDING_ARCHETYPES',
  'MUNTIN_PATTERNS', 'MUNTIN_W', 'muntinPatternFor', 'trimColorFor', 'typologyPartCache', 'pushMerged',
  'planFlowCache', 'planFlowPivotCache', 'PODIUM_STYLE_CONFIGS', 'presetFieldMap',
  'EARTH_M_PER_DEG', 'pointCoords', 'unitForBearing', 'bearingOfVector', 'facadeGuideCache',
  'primaryBearingCache', 'plateCorePointCache', 'shellMemoCache', 'shellBuf', 'shellScaleCache',
  'shellFamilyCache', 'PLAN_REUSE_TOLERANCE', 'RIBBON_SPANDREL_PROFILES',
  'SETBACK_FACE_MODES', 'massingContextCache', 'tierPlateCache', 'slotPlateCache',
  'bayLayoutCache', 'zoneSplitCache', 'MASSING_FEATURE_DEFAULTS', 'isGableEnd', 'pitchedRidgeCache', 'obeliskCache'
];
/* unit floorplan engine helpers are top-level consts (fpX / FP_X) */
[...html.matchAll(/^const ((?:fp|FP_)\w+)\s*=/gm)].forEach(match => { if (!constNames.includes(match[1])) constNames.push(match[1]); });
const runtimeSource = [
  ...constNames.map(name => extractConstStatement(html, name)),
  extractTopLevelFunctions(html)
].join('\n\n');
vm.runInContext(runtimeSource, context, { filename: 'app-geometry-runtime.js' });

const archetypeOrder = vm.runInContext('BUILDING_ARCHETYPE_ORDER', context);
const archetypes = vm.runInContext('BUILDING_ARCHETYPES', context);
archetypeOrder.forEach(type => {
  const rules = archetypes[type];
  for (let sample = 1; sample <= 2; sample++) {
    const result = context.buildArchetypeControlSet(type, true);
    const values = result.values;
    const choicesValid = Object.entries(rules.choices || {})
      .every(([key, choices]) => choices.includes(values[key]));
    const rangesValid = Object.entries(rules.ranges || {}).every(([key, [min, max]]) => {
      const value = Number(values[key]);
      return Number.isFinite(value) && value >= min && value <= max;
    });
    const internalsOff = ['enableSlabs', 'enablePillars', 'enableStairs', 'enableElevators', 'enableFloorplans']
      .every(key => values[key] === false);
    const structuralArticulation = ['vertical-fins', 'expressed-frame', 'lattice'].includes(values.facadeArticulation);
    const exteriorCompatible = values.balconyType === 'none' || !structuralArticulation;
    const punchedIsSolid = values.windowStyle !== 'punched' || Number(values.facadeAlpha) === 1;
    const crownStartsInsideTower = values.roofProfile !== 'tapered'
      || (Number(values.roofTaperStartFloor) >= 1 && Number(values.roofTaperStartFloor) <= Number(values.floors));
    assert(
      values.buildingType === (rules.buildingType || type)
        && rules.facadeTypes.includes(values.facadeType)
        && choicesValid
        && rangesValid
        && internalsOff
        && exteriorCompatible
        && punchedIsSolid
        && crownStartsInsideTower,
      `${rules.label} random sample ${sample} stays within its exterior rules`
    );
  }
});
archetypeOrder.forEach(type => {
  const defaults = context.buildArchetypeControlSet(type, false).values;
  assert(defaults.facadeArticulation === 'none', `${archetypes[type].label} defaults to no facade articulation`);
  assert(defaults.separatorStyle === 'slab-edge', `${archetypes[type].label} defaults to slab-edge bands`);
});

const presetFieldMap = vm.runInContext('presetFieldMap', context);
const supportedPresetKeys = Object.keys(presetFieldMap);
const presetNames = (presets.presets || []).map(preset => preset.name);
const textureIds = new Set([
  'none',
  ...[...texturesSource.matchAll(/\bid:\s*'([^']+)'/g)].map(match => match[1])
]);
const rejectedCandidateNames = new Set([
  'Solar-Fin Office Tower',
  'Wintergarden Residential Tower',
  'Green Crown Mixed-Use Landmark'
]);
assert(presets.schema === 1, 'advanced preset collection retains schema version 1');
assert(presetNames.length === 37, 'advanced preset collection contains exactly 37 candidates');
assert(new Set(presetNames).size === 37, 'advanced preset candidate names are unique');
assert(presetNames.every(name => !rejectedCandidateNames.has(name)), 'rejected generic candidates are absent');
assert(
  (presets.presets || []).every(preset => typeof preset.description === 'string' && preset.description.length >= 180),
  'every advanced preset includes an architectural design description'
);
assert(
  (presets.presets || []).every(preset => supportedPresetKeys.every(key => preset.config[key] !== undefined)),
  'every advanced preset populates every supported preset field'
);
const canonicalConfigKeys = Object.keys(presets.presets[0].config).sort().join('|');
assert(
  presets.presets.every(preset => Object.keys(preset.config).sort().join('|') === canonicalConfigKeys),
  'all advanced presets use the same complete configuration contract'
);
assert(
  presets.presets.every(preset => textureIds.has(preset.config.wallTex) && textureIds.has(preset.config.roofTex)),
  'all advanced presets use available facade and roof textures'
);
/* Library policy: opaque envelopes (glass reads by colour, never translucency), a
   balanced typology mix led by low- and mid-rise, glass-dominant towers a minority,
   and glass darker than the wall on every masonry or panel preset. */
const PRESET_CATEGORIES = new Set(['Townhouses & low-rise', 'Mid-rise & apartments', 'Pre-war & heritage', 'Masonry & stone towers', 'Sculptural & landmark', 'Ultra-modern & supertall', 'Office buildings', 'Contemporary residential', 'Glass & metal towers']);
const luminance = hex => {
  const n = String(hex || '#000000').replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255).map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const lightness = hex => {
  const y = luminance(hex);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
};
const glassDominant = cfg => cfg.windowStyle === 'ribbon' && ['curtain-wall', 'panelized-office'].includes(cfg.facadeType);
assert(
  presets.presets.every(preset => preset.config.viewTransparency === 'balanced'),
  'all presets use the opaque architectural view'
);
assert(
  presets.presets.every(preset => PRESET_CATEGORIES.has(preset.category)),
  'every preset belongs to a library category'
);
assert(
  presets.presets.filter(preset => Number(preset.config.floors) <= 9).length >= 8,
  'at least eight presets are low- or mid-rise (9 floors or fewer)'
);
assert(
  presets.presets.filter(preset => Number(preset.config.floors) >= 25).length >= 8,
  'at least eight presets are tower-scale'
);
assert(
  presets.presets.filter(preset => glassDominant(preset.config)).length <= Math.floor(presets.presets.length * 0.4),
  'glass-dominant towers are a minority of the library (40% or fewer)'
);
assert(
  ['Ultra-modern & supertall', 'Office buildings', 'Contemporary residential']
    .every(category => presets.presets.filter(preset => preset.category === category).length >= 2),
  'ultra-modern, office and contemporary residential categories are populated'
);
assert(
  presets.presets.filter(preset => !glassDominant(preset.config))
    .every(preset => lightness(preset.config.wallColor) - lightness(preset.config.windowColor) >= 8 || lightness(preset.config.pierColor) - lightness(preset.config.windowColor) >= 15),
  'glass reads darker than the wall or piers on every masonry and panel preset'
);
assert(
  presets.presets.filter(preset => ['gable', 'hip', 'mansard'].includes(preset.config.roofProfile)).length >= 4,
  'pitched and mansard roofs appear in the library'
);
assert(
  presets.presets.filter(preset => preset.config.muntinPattern !== 'none').length >= 10,
  'divided lites appear on at least ten presets'
);
assert(
  presets.presets.every(preset => Number(preset.config.podOut) <= 2.5),
  'podium outsets stay footprint-safe'
);
assert(
  presets.presets.filter(preset => preset.config.separatorStyle !== 'none').length >= 15,
  'facade bands contribute to at least 15 presets'
);
assert(
  presets.presets.every(preset => {
    const cfg = preset.config;
    const balconyValid = cfg.balType === 'none'
      ? Number(cfg.balD) === 0
      : Number(cfg.balD) >= 0.5 && Number(cfg.balD) <= 1.8;
    const structural = ['lattice', 'expressed-frame', 'vertical-fins'].includes(cfg.facadeArticulation);
    return Number(cfg.facadeArticulationDepth) >= 0.08
      && Number(cfg.facadeArticulationDepth) <= 1.2
      && balconyValid
      && !(structural && cfg.balType !== 'none');
  }),
  'preset projections are buildable and competing exterior systems are excluded'
);
assert(
  presets.presets.every(preset => {
    const cfg = preset.config;
    return ['enableSlabs', 'enablePillars', 'enableStairs', 'enableElevators', 'enableFloorplans']
      .every(key => cfg[key] === false)
      && cfg.cutStairwell === true
      && cfg.cutElevatorShafts === true
      && Number(cfg.elevatorCount) >= 2
      && Number(cfg.corridorWidth) >= 2;
  }),
  'advanced presets configure coherent circulation while keeping internal systems hidden in exterior view'
);

const baseConfig = {
  buildingType: 'office', facadeType: 'panelized-office', viewTransparency: 'balanced',
  floors: 8, F: 3.6, taperMode: 'none', taper: 0, stepEvery: 4, stepFactor: 0,
  massingProfile: 'prismatic', windowStyle: 'ribbon', windowSpacing: 3.1,
  windowWidth: 1.4, windowProportion: 'tall', facadeAlpha: 0.72,
  wallColor: '#c6d0d6', wallTex: 'none', windowAlpha: 0.84,
  windowColor: '#5f94b5', wnw: 1, bW: 0.12, bCol: '#d9dfe2',
  mullionV: 2, mullionH: 1, mullionThick: 0.04, mullionCol: '#4e5b62',
  facadeArticulation: 'panel-grid', facadeArticulationDensity: 4, panelModuleWidth: 1.8,
  facadeArticulationDepth: 0.16, facadeArticulationWidth: 0.08,
  facadeArticulationColor: '#7d8b91', facadePatternMode: 'calm', facadeSeed: 2145,
  facadeClimateMode: 'temperate-office', facadeLightMode: 'crisp-tectonic',
  enablePanelization: true, panelModuleFamily: 'balanced', panelOrientationMode: 'auto',
  panelJointMm: 14, climateMulNorth: 1, climateMulEast: 1,
  climateMulSouth: 1, climateMulWest: 1, separatorStyle: 'recessed-joint',
  separatorEvery: 1, sH: 0.18, sW: 0.12, sCol: '#536474', balD: 0,
  balN: 2, balWidthRatio: 0.62, balSlabH: 0.22, balCol: '#d8dfe3',
  railH: 1.05, railThick: 0.08, railCol: '#4e5b62', podF: 1, podOut: 1.2,
  podCol: '#b8c2c8', podA: 0.84, podiumSpecialGroundFloor: true,
  podiumGroundFlrHt: 4.8, podiumUpperFloorHt: 3.8, podiumBaseHeight: 0.45,
  podiumWinRatio: 0.72, podiumStyle: 'transparent-retail', podiumBayWidth: 4.2,
  podiumPierWidth: 0.38, podiumGlassColor: '#7faec0', podiumFrameColor: '#465860',
  podiumCapDepth: 0.35, podiumCapColor: '#687982', podiumEntranceSide: 'auto',
  podiumEntranceStyle: 'recessed', podiumEntranceWidth: 6.4, podiumEntranceHeight: 4.2,
  podiumEntranceOffset: 0, podiumEntranceRecess: 1.2, podiumDoorStyle: 'double',
  podiumDoorCount: 4, podiumDoorHeight: 2.7, podiumDoorColor: '#93c4d5',
  podiumDoorFrameColor: '#35444b', podiumCanopyStyle: 'blade', podiumCanopyDepth: 1.8,
  podiumCanopyThickness: 0.22, podiumCanopyColor: '#566871', podiumLobbyDepth: 7,
  podiumLobbyFloorColor: '#c9bda9', podiumLobbyWallColor: '#827767', roofProfile: 'standard',
  roofTaperStartFloor: 6, roofTaperStep: -0.035, roofSlabH: 0.4,
  roofCol: '#414b50', roofTex: 'none', roofAccentCol: '#6f7f8c',
  parapetH: 1.1, parapetThick: 0.3, parapetCol: '#59666c', penthouseF: 0,
  penthouseScale: 0.52, penthouseCol: '#59666c', corniceH: 0.3,
  corniceOut: 0.2, corniceCol: '#76848a', enableSpire: false,
  spireHeight: 24, spireWidth: 2, spireColor: '#536474', enableRibs: false,
  ribCount: 0, ribDepth: 0.16, ribWidth: 0.08, ribColor: '#7d8b91',
  enableSlabs: false, slabThick: 0.22, slabColor: '#dbe9f2', enablePillars: false,
  pillarSize: 0.5, pillarRows: 2, pillarCols: 2, pillarColor: '#777777',
  enableCentralCore: false, centralCoreScale: 0.24, centralCoreColor: '#536474',
  enableStairs: false, stairType: 'U', stairWidth: 2.4, stairPosition: 'central',
  stairColor: '#8b5f2b', enableStairRailings: false, stairRailingHeight: 1.1,
  stairRailingColor: '#333333', cutStairwell: false, enableElevators: false,
  elevatorType: 'double-bank', elevatorCount: 4, elevatorBanking: 'split',
  elevatorCarWidth: 2.1, elevatorCarDepth: 2, elevatorColor: '#5ea3db',
  elevatorShaftColor: '#536474', cutElevatorShafts: false, enableFloorplans: false,
  floorplanStyle: 'corridor', intWallThick: 0.18, intWallColor: '#555555',
  corridorWidth: 2, overallRoundness: 0.12, exoType: 'none', exoSize: 0.08,
  exoOffset: 0, exoDensity: 0, exoColor: '#7d8b91', weaveEnable: false,
  weaveCount: 0, weaveWidth: 0, weaveSpan: 0, weaveTwist: 0, weaveWave: 0,
  weaveCycles: 0, weaveInset: 0, weaveAlpha: 0, weaveColor: '#5ea3db', balType: 'none'
};

function configFor(overrides = {}) {
  const cfg = { ...baseConfig, ...overrides };
  const articulation = cfg.facadeArticulation;
  cfg.enablePanelization = articulation === 'panel-grid';
  cfg.enableRibs = articulation === 'vertical-fins';
  cfg.ribCount = cfg.enableRibs ? cfg.facadeArticulationDensity : 0;
  cfg.ribDepth = cfg.facadeArticulationDepth;
  cfg.ribWidth = cfg.facadeArticulationWidth;
  cfg.ribColor = cfg.facadeArticulationColor;
  cfg.panelJointMm = Math.max(8, Math.min(28, cfg.facadeArticulationWidth * 160));
  cfg.exoType = articulation === 'lattice' ? 'lattice' : (articulation === 'expressed-frame' ? 'vertical' : 'none');
  cfg.exoSize = cfg.facadeArticulationWidth;
  cfg.exoOffset = ['lattice', 'expressed-frame'].includes(articulation) ? cfg.facadeArticulationDepth : 0;
  cfg.exoDensity = ['lattice', 'expressed-frame'].includes(articulation) ? cfg.facadeArticulationDensity : 0;
  cfg.exoColor = cfg.facadeArticulationColor;
  return cfg;
}

const footprint = context.turf.polygon([[[-79.3905, 43.6500], [-79.3900, 43.6500], [-79.3900, 43.6503], [-79.3905, 43.6503], [-79.3905, 43.6500]]]);
assert(
  context.pointHitsFootprints({ lng: -79.39025, lat: 43.65015 }, footprint),
  'active parcel hit testing recognizes a repeat click inside the footprint'
);
assert(
  !context.pointHitsFootprints({ lng: -79.3915, lat: 43.6515 }, footprint),
  'active parcel hit testing leaves clicks outside the footprint available for new selection'
);
const secondFootprintCoords = [[[-79.38995, 43.6500], [-79.38955, 43.6500], [-79.38955, 43.65025], [-79.38995, 43.65025], [-79.38995, 43.6500]]];
const preparedPolygon = context.prepareFootprints({ type: 'Polygon', coordinates: footprint.geometry.coordinates });
const preparedMultiPolygon = context.prepareFootprints({
  type: 'MultiPolygon',
  coordinates: [footprint.geometry.coordinates, secondFootprintCoords]
});
assert(preparedPolygon.length === 1, 'uploaded Polygon prepares one usable footprint');
assert(preparedMultiPolygon.length === 2, 'uploaded MultiPolygon prepares each usable footprint');
assert(context.dedupeFootprints(preparedMultiPolygon).length === 2, 'uploaded MultiPolygon preserves distinct adjacent parts');
const cases = [
  {
    name: 'masonry punched',
    cfg: configFor({ buildingType: 'masonry-midrise', facadeType: 'masonry-punched', floors: 8, F: 3.3, windowStyle: 'punched', windowProportion: 'tall', facadeAlpha: 1, facadeArticulation: 'none', separatorStyle: 'belt-course', separatorEvery: 4, roofProfile: 'standard', wallColor: '#b56d54', wallTex: 'wall-brick-red', bCol: '#774638', windowColor: '#6f99ad' }),
    expect: { windows: 1, windowSills: 1, seps: 1 }
  },
  {
    name: 'panelized office mechanical roof',
    cfg: configFor({ floors: 16, F: 3.8, facadeArticulation: 'panel-grid', facadeArticulationDensity: 3, roofProfile: 'mechanical' }),
    expect: { facadePanels: 1, facadeJoints: 1, roofScreens: 1, roofEquipment: 1 }
  },
  {
    name: 'residential balconies terraced roof',
    cfg: configFor({ buildingType: 'residential', facadeType: 'residential-balcony', floors: 14, F: 3.2, facadeArticulation: 'panel-grid', balType: 'perimeter-segmented', balD: 1.1, balN: 2, roofProfile: 'terraced' }),
    expect: { balconies: 1, railings: 1, roofTerraces: 3 }
  },
  {
    name: 'vertical fins green roof',
    cfg: configFor({ floors: 18, F: 3.6, facadeArticulation: 'vertical-fins', facadeArticulationDensity: 3, roofProfile: 'green', roofAccentCol: '#66835f' }),
    expect: { verticalRibs: 1, roofPlanting: 1 }
  },
  {
    name: 'expressed frame',
    cfg: configFor({ buildingType: 'industrial-loft', facadeType: 'heavy-concrete', floors: 7, F: 4.2, windowStyle: 'punched', windowProportion: 'wide', facadeAlpha: 1, facadeArticulation: 'expressed-frame', separatorStyle: 'spandrel-band', roofProfile: 'mechanical', wallColor: '#787f82', bCol: '#4c5559' }),
    expect: { exoskeleton: 1, roofScreens: 1 }
  },
  {
    name: 'lattice landmark',
    cfg: configFor({ buildingType: 'glass-landmark', facadeType: 'curtain-wall', floors: 24, F: 3.9, facadeArticulation: 'lattice', facadeArticulationDensity: 3, taperMode: 'cont', taper: 0.12, roofProfile: 'tapered', roofTaperStartFloor: 18 }),
    expect: { exoskeleton: 1, roof: 1 }
  }
];

const featureCount = (geometry, layer) => geometry[layer] && geometry[layer].features
  ? geometry[layer].features.length
  : 0;
/* Facade members are merged per floor and orientation, so density is counted in polygon parts. */
const partCount = (geometry, layer, predicate = () => true) => (geometry[layer] && geometry[layer].features ? geometry[layer].features : [])
  .filter(predicate)
  .reduce((sum, feature) => sum + (feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates.length : 1), 0);
const layerArea = collection => collection.features.reduce(
  (sum, feature) => sum + context.turf.area(feature),
  0
);
const averageFeatureArea = collection => collection.features.length
  ? layerArea(collection) / collection.features.length
  : 0;
const layerVerticalSpan = collection => collection.features.length
  ? Math.max(...collection.features.map(feature => Number(feature.properties.h)))
    - Math.min(...collection.features.map(feature => Number(feature.properties.b)))
  : 0;
const topLevelArea = collection => {
  if (!collection.features.length) return 0;
  const highestBase = Math.max(...collection.features.map(feature => Number(feature.properties.b)));
  return collection.features
    .filter(feature => Math.abs(Number(feature.properties.b) - highestBase) < 0.001)
    .reduce((sum, feature) => sum + context.turf.area(feature), 0);
};
const coordinateCount = collection => collection.features.reduce((total, feature) => {
  const polygons = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : (feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : []);
  return total + polygons.reduce(
    (polygonTotal, polygon) => polygonTotal + polygon.reduce((ringTotal, ring) => ringTotal + ring.length, 0),
    0
  );
}, 0);

const advancedPresetFootprints = [
  { name: 'rectangular', feature: footprint },
  {
    name: 'elongated',
    feature: context.turf.polygon([[[-79.39065, 43.65002], [-79.38985, 43.65002], [-79.38985, 43.65018], [-79.39065, 43.65018], [-79.39065, 43.65002]]])
  },
  {
    name: 'concave',
    feature: context.turf.polygon([[[-79.39062, 43.6500], [-79.38988, 43.6500], [-79.38988, 43.6502], [-79.39018, 43.6502], [-79.39018, 43.65046], [-79.39062, 43.65046], [-79.39062, 43.6500]]])
  }
];
const advancedPresetFixtures = [];
const articulationLayerFor = {
  'panel-grid': 'facadePanels',
  'vertical-fins': 'verticalRibs',
  'expressed-frame': 'exoskeleton',
  lattice: 'exoskeleton'
};
for (const preset of presets.presets) {
  let finiteAcrossFootprints = true;
  let systemsAcrossFootprints = true;
  for (let shapeIndex = 0; shapeIndex < advancedPresetFootprints.length; shapeIndex++) {
    const shape = advancedPresetFootprints[shapeIndex];
    const cfg = { ...preset.config };
    const geometry = context.build(shape.feature, cfg);
    if (shapeIndex === 0) advancedPresetFixtures.push({ name: preset.name, geometry, cfg });
    const allFeatures = Object.values(geometry).flatMap(collection => collection.features || []);
    finiteAcrossFootprints = finiteAcrossFootprints && allFeatures.length > 0 && allFeatures.every(feature => {
      const b = Number(feature.properties && feature.properties.b);
      const h = Number(feature.properties && feature.properties.h);
      const area = context.turf.area(feature);
      return Number.isFinite(b) && Number.isFinite(h) && h > b && Number.isFinite(area) && area > 0;
    });
    const articulationLayer = articulationLayerFor[cfg.facadeArticulation];
    const hasPodium = Number(cfg.podF) > 0;
    systemsAcrossFootprints = systemsAcrossFootprints
      && (!hasPodium || (featureCount(geometry, 'podium') > 0
        && featureCount(geometry, 'podiumGlass') > 0
        && featureCount(geometry, 'podiumFrames') > 0
        && featureCount(geometry, 'podiumDoors') > 0
        && featureCount(geometry, 'podiumLobby') > 0
        && (cfg.podiumCanopyStyle === 'none' || featureCount(geometry, 'podiumCanopies') > 0)
        && (Number(cfg.podiumCapDepth) <= 0 || featureCount(geometry, 'podiumCap') > 0)))
      && featureCount(geometry, 'roof') > 0
      && (cfg.separatorStyle === 'none' || featureCount(geometry, 'seps') > 0)
      && (cfg.balType === 'none' || (featureCount(geometry, 'balconies') > 0 && featureCount(geometry, 'railings') > 0))
      && (!articulationLayer || featureCount(geometry, articulationLayer) > 0);
  }
  assert(finiteAcrossFootprints, `${preset.name} emits finite geometry on rectangular, elongated, and concave footprints`);
  assert(systemsAcrossFootprints, `${preset.name} preserves its authored exterior systems across footprint shapes`);
}

/* Typology details: each library preset's signature elements are actually generated. */
const fixtureFor = name => advancedPresetFixtures.find(f => f.name === name);
const partsNamed = (geometry, layer, part) => (geometry[layer] && geometry[layer].features ? geometry[layer].features : [])
  .filter(f => f.properties && f.properties.part === part).length;
const typologyExpectations = [
  ['Brooklyn Brick Two-Storey Condos', g => partsNamed(g, 'borders', 'muntin_bar') > 0 && partsNamed(g, 'borders', 'muntin_rail') > 0, 'divided-lite sashes'],
  ['Brooklyn Brick Two-Storey Condos', g => partsNamed(g, 'windowSills', 'stoop_step') > 0 && partsNamed(g, 'accentPanels', 'front_door') > 0, 'stoops and front doors'],
  ['Brooklyn Brick Two-Storey Condos', g => partsNamed(g, 'seps', 'keystone') > 0, 'stone keystones'],
  ['Toronto Bay-and-Gable Row', g => partsNamed(g, 'windows', 'oriel_glass') > 0 && partsNamed(g, 'roof', 'gable_roof_course') > 4, 'canted bays under a coursed gable'],
  ['Haussmann Limestone Block', g => partsNamed(g, 'roof', 'mansard_course') > 4 && partsNamed(g, 'windows', 'dormer_glass') > 0, 'a mansard with dormers'],
  ['Haussmann Limestone Block', g => partsNamed(g, 'core', 'arch_infill') > 0, 'arched ground-floor openings'],
  ['Upper East Side Pre-War Co-op', g => partsNamed(g, 'seps', 'rustication_course') > 0 && partsNamed(g, 'seps', 'quoin') > 0 && partsNamed(g, 'roofEquipment', 'water_tank_staves') === 1, 'rustication, quoins and a water tank'],
  ['Limestone Art Deco Tower (RAMSA style)', g => partsNamed(g, 'rooftopStructures', 'lantern_tier_1') === 1 && partsNamed(g, 'parapets', 'stone_balustrade') > 0, 'a lantern crown over stone-balustraded setbacks'],
  ['Scandinavian Brick Courtyard Block', g => partsNamed(g, 'parapets', 'chimney_stack') > 0, 'chimney stacks'],
  ['Fluid Band Residences (Hadid style)', g => partsNamed(g, 'seps', 'flowing-band') >= 10, 'flowing slab bands on every floor'],
  ['Gabled Stacked Townhouses', g => partsNamed(g, 'core', 'gable_end_wall') > 4 && partsNamed(g, 'roof', 'gable_roof_course') > 4, 'gable-end walls under coursed gables'],
  ['Haussmann Limestone Block', g => partsNamed(g, 'railings', 'iron_pickets') > 0 && partsNamed(g, 'windows', 'balustrade_glass') === 0, 'see-through wrought-iron balconies'],
  ['Diagrid Cigar Tower (30 St Mary Axe style)', g => partsNamed(g, 'exoskeleton', 'diagrid_member') > 40, 'a full-height diagrid'],
  ['Spiral Setback Supertall (Burj Khalifa style)', g => partsNamed(g, 'borders', 'louvre_blade') > 0 && partsNamed(g, 'spires', 'spire_mast') === 1, 'louvred plant floors and a spire'],
  ['Gold Sail Tower (Dubai Marina style)', g => partsNamed(g, 'spires', 'crown_blade') > 10 && partsNamed(g, 'windows', 'crown_screen_glass') === 1, 'a sail blade over a glazed crown screen'],
  ['Wraparound Balcony Residences (Dubai Marina style)', g => partsNamed(g, 'rooftopStructures', 'raked_crown_glass') > 6, 'a raked glass crown'],
  ['Bundled-Tube Black Tower (Willis style)', g => partsNamed(g, 'core', 'mech_recess') >= 2, 'louvred mechanical floors']
];
typologyExpectations.forEach(([name, test, label]) => {
  const fixture = fixtureFor(name);
  assert(Boolean(fixture) && test(fixture.geometry), `${name} generates ${label}`);
});
/* Obelisk: the top plate is chamfered to roughly half the base plate; spiral rhythm
   carves one face per tier, so successive tier plates shrink but stay off-centre. */
(() => {
  const square = context.turf.polygon([[[-74.0, 40.7], [-73.99964, 40.7], [-73.99964, 40.70027], [-74.0, 40.70027], [-74.0, 40.7]]]);
  const fixture = advancedPresetFixtures.find(f => f.name === 'Chamfered Obelisk Supertall (One World Trade style)');
  const cfg = fixture ? fixture.cfg : null;
  const baseArea = cfg ? context.turf.area(context.floorShell(square, cfg, 0)) : 0;
  const topArea = cfg ? context.turf.area(context.floorShell(square, cfg, cfg.floors)) : 0;
  assert(Boolean(cfg) && topArea > baseArea * 0.4 && topArea < baseArea * 0.62, 'Chamfered obelisk turns the square plan into a half-area diamond at the roof');
  const spiralCfg = { ...(cfg || {}), taperMode: 'none', tierEvery: 4, tierStart: 4, tierDepth: 2, tierCount: 4, tierFaces: 'spiral', floors: 24 };
  const tiers = context.getSetbackTiers(spiralCfg);
  assert(tiers.length === 4 && new Set(tiers.map(t => t.faces)).size === 4, 'Spiral setback rhythm steps a different face on each tier');
})();
/* Twist: the top plate is rotated against the base by the authored total (within the per-floor clamp). */
(() => {
  const fixture = fixtureFor('Twisting White-Band Tower');
  const cores = fixture ? fixture.geometry.core.features : [];
  const bearingOf = feat => context.getPrimaryBearing(feat);
  const first = cores[0];
  const last = cores[cores.length - 1];
  const delta = first && last ? Math.abs(((bearingOf(last) - bearingOf(first) + 540) % 180) - 90) : 90;
  assert(Boolean(first && last) && delta < 70, 'Twisting White-Band Tower rotates its plates through the height');
})();

let exportFixture = null;
const visualFixtures = [];
for (const testCase of cases) {
  const geometry = context.build(footprint, testCase.cfg);
  visualFixtures.push({ name: testCase.name, geometry, cfg: testCase.cfg });
  if (testCase.name === 'residential balconies terraced roof') exportFixture = { geometry, cfg: testCase.cfg };
  for (const [layer, minimum] of Object.entries(testCase.expect)) {
    const count = geometry[layer] && geometry[layer].features ? geometry[layer].features.length : 0;
    assert(count >= minimum, `${testCase.name} generates ${layer}`);
  }
  const allFeatures = Object.values(geometry).flatMap(collection => collection.features || []);
  const valid = allFeatures.every(feature => {
    const b = Number(feature.properties && feature.properties.b);
    const h = Number(feature.properties && feature.properties.h);
    const area = context.turf.area(feature);
    return Number.isFinite(b) && Number.isFinite(h) && h > b && Number.isFinite(area) && area > 0;
  });
  assert(valid, `${testCase.name} emits finite positive extrusion geometry`);
  if (testCase.cfg.windowStyle === 'punched') {
    const coreParts = new Set(geometry.core.features.map(feature => feature.properties.part));
    const openingZones = geometry.core.features.filter(feature => feature.properties.part === 'wall_opening_zone');
    assert(
      coreParts.has('wall_sill_zone') && coreParts.has('wall_opening_zone') && coreParts.has('wall_lintel_zone'),
      `${testCase.name} splits opaque walls into sill, opening, and lintel zones`
    );
    assert(
      openingZones.length > 0 && openingZones.every(feature => context.turf.area(feature) < context.turf.area(footprint)),
      `${testCase.name} cuts real plan notches through the window-height wall zone`
    );
  }
  if (testCase.cfg.facadeArticulation === 'lattice') {
    const members = geometry.exoskeleton.features.filter(feature => feature.properties.part === 'diagrid_member');
    const rings = geometry.exoskeleton.features.filter(feature => feature.properties.part === 'diagrid_node_ring');
    assert(
      members.length > 0 && rings.length > 0,
      `${testCase.name} generates a wound diagrid with node ring beams`
    );
    assert(
      members.every(feature => feature.properties.h - feature.properties.b < testCase.cfg.F / 4),
      `${testCase.name} slices diagonal members finely instead of full-floor ties`
    );
    assert(
      members.every(feature => feature.geometry.type === 'MultiPolygon' && feature.geometry.coordinates.length >= 6),
      `${testCase.name} groups diagrid members into render-efficient MultiPolygons`
    );
  }
}

const widePanels = context.build(footprint, configFor({ facadeArticulation: 'panel-grid', panelModuleWidth: 4 }));
const narrowPanels = context.build(footprint, configFor({ facadeArticulation: 'panel-grid', panelModuleWidth: 1 }));
const panelModuleCount = collection => collection.features.reduce(
  (sum, feature) => sum + Math.max(1, Number(feature.properties && feature.properties.module_count) || 1),
  0
);
assert(panelModuleCount(narrowPanels.facadePanels) > panelModuleCount(widePanels.facadePanels), 'panel module width changes facade module count predictably');
assert(
  panelModuleCount(narrowPanels.facadePanels) > narrowPanels.facadePanels.features.length * 4,
  'panel-grid groups repeated modules into render-efficient MultiPolygon features'
);
const shallowPanels = context.build(footprint, configFor({ facadeArticulation: 'panel-grid', facadeArticulationDepth: 0.08 }));
const deepPanels = context.build(footprint, configFor({ facadeArticulation: 'panel-grid', facadeArticulationDepth: 0.4 }));
assert(layerArea(deepPanels.facadePanels) > layerArea(shallowPanels.facadePanels), 'articulation projection changes panel depth');

const planCfg = context.floorplanOverlayConfig(configFor({
  buildingType: 'office',
  floors: 18,
  F: 3.8,
  floorplanStyle: 'corridor',
  stairType: 'U',
  stairPosition: 'central',
  stairWidth: 2.2,
  elevatorCount: 6,
  elevatorType: 'double-bank',
  elevatorBanking: 'split'
}));
const planRep = context.chooseRepresentativeShell(footprint, planCfg);
const planStair = context.getStairwellPolygon(planRep.shell, planCfg, planRep.floorIndex);
const planLifts = context.getElevatorZones(planRep.shell, planCfg, planRep.floorIndex, planStair);
const planCore = context.buildServiceCoreEnvelope(planRep.shell, planCfg, planStair, planLifts);
const planModel = context.generateFloorplanModel(
  planRep.shell,
  planRep.floorIndex,
  planCfg,
  0,
  planStair,
  planLifts,
  { detail: 'high', coreEnvelope: planCore }
);
const overlapArea = (a, b) => {
  try {
    const overlap = context.turf.intersect(a, b);
    return overlap && overlap.geometry ? context.turf.area(overlap) : 0;
  } catch {
    return 0;
  }
};
const hasPairOverlap = features => features.some((feature, index) =>
  features.slice(index + 1).some(other => overlapArea(feature, other) > 0.01)
);
assert(planCfg.enableFloorplans && planCfg.enableStairs && planCfg.enableElevators, 'View overlay always enables a complete circulation plan');
assert(planRep.floorIndex > 0 && planRep.tag.startsWith('tower-'), 'View overlay selects one representative tower floor instead of the podium');
assert(planCore && planCore.geometry && planStair && planLifts.length >= 2, 'floorplan produces one bounded core with stairs and a lift bank');
assert(!hasPairOverlap(planLifts), 'elevator shafts do not overlap each other');
assert(planLifts.every(lift => overlapArea(lift, planStair) <= 0.01), 'elevator shafts do not overlap the stairwell');
assert(planModel.rooms.length > 0 && planModel.corridors.length === 1, 'floorplan produces rooms and one dissolved circulation network');
assert(!hasPairOverlap(planModel.rooms), 'floorplan rooms have no overlapping allocated area');
assert(planModel.rooms.every(room => overlapArea(room, planCore) <= 0.01), 'floorplan rooms do not overlap the service core');
assert(
  planModel.rooms.every(room => planModel.corridors.every(corridor => overlapArea(room, corridor) <= 0.01)),
  'floorplan rooms do not overlap corridors'
);
assert(context.inferProgramType(planRep.shell, planCfg, planRep.floorIndex) === 'commercial', 'office buildings receive a commercial floor program');
assert(
  context.inferProgramType(planRep.shell, { ...planCfg, buildingType: 'residential' }, planRep.floorIndex) === 'residential',
  'residential buildings receive a residential floor program'
);

/* Unit floorplan engine (facade band → corridor → unit fill → adaptive plans) */
const unitPlanChecks = [
  { name: 'rectangular', feature: footprint },
  { name: 'concave', feature: context.turf.polygon([[[-79.39062, 43.6500], [-79.38988, 43.6500], [-79.38988, 43.6502], [-79.39018, 43.6502], [-79.39018, 43.65046], [-79.39062, 43.65046], [-79.39062, 43.6500]]]) }
];
unitPlanChecks.forEach(({ name, feature }) => {
  const unitCfg = context.floorplanOverlayConfig(configFor({ buildingType: 'residential', floors: 20, F: 3.2, floorplanStyle: 'corridor', elevatorCount: 3 }));
  const rep = context.chooseRepresentativeShell(feature, unitCfg);
  const stair = context.getStairwellPolygon(rep.shell, unitCfg, rep.floorIndex);
  const lifts = context.getElevatorZones(rep.shell, unitCfg, rep.floorIndex, stair);
  const core = context.buildServiceCoreEnvelope(rep.shell, unitCfg, stair, lifts);
  const plan = context.generateUnitFloorplan(rep.shell, rep.floorIndex, unitCfg, stair, lifts, core);
  assert(plan && plan.units.length >= 3, `${name} residential plate is filled with units`);
  assert(plan.metrics.plansGenerated >= 4 && plan.metrics.candidates.some(c => c.selected), `${name} plan is chosen from scored candidates`);
  assert(plan.entrances.length >= plan.units.length, `${name} every unit has an entrance on the corridor`);
  assert(plan.rooms.every(room => overlapArea(room, core) <= 0.05), `${name} unit rooms stay clear of the service core`);
  assert(plan.rooms.every(room => plan.corridors.every(corridor => overlapArea(room, corridor) <= 0.05)), `${name} unit rooms stay clear of the corridor`);
  assert(!hasPairOverlap(plan.units), `${name} units do not overlap`);
  assert(plan.walls.length > 0 && plan.doors.length > plan.units.length * 2, `${name} plan has walls and interior doors`);
  assert(plan.furniture.length > plan.units.length * 3, `${name} rooms are furnished`);
  assert(plan.metrics.efficiency >= 55 && plan.metrics.efficiency <= 95, `${name} net-to-gross efficiency is plausible`);
  assert(plan.metrics.scores.daylight >= 0.8, `${name} habitable rooms keep daylight`);
});
const officePlanCfg = context.floorplanOverlayConfig(configFor({ buildingType: 'office', floors: 20, F: 3.8, floorplanStyle: 'corridor' }));
const officeRep = context.chooseRepresentativeShell(footprint, officePlanCfg);
const officeStair = context.getStairwellPolygon(officeRep.shell, officePlanCfg, officeRep.floorIndex);
const officeLifts = context.getElevatorZones(officeRep.shell, officePlanCfg, officeRep.floorIndex, officeStair);
const officePlan = context.generateUnitFloorplan(officeRep.shell, officeRep.floorIndex, officePlanCfg, officeStair, officeLifts,
  context.buildServiceCoreEnvelope(officeRep.shell, officePlanCfg, officeStair, officeLifts));
assert(officePlan && officePlan.metrics.mode === 'office' && officePlan.rooms.some(r => r.properties.roomType === 'workspace'), 'office plates get open workspace neighbourhoods');
assert(officePlan.furniture.some(f => f.properties.kind === 'desk'), 'office workspace is laid out with desk benches');

const articulationExpectations = {
  none: [],
  'panel-grid': ['facadePanels', 'facadeJoints'],
  'vertical-fins': ['verticalRibs'],
  'expressed-frame': ['exoskeleton'],
  lattice: ['exoskeleton']
};
const articulationLayers = ['facadePanels', 'facadeJoints', 'verticalRibs', 'exoskeleton'];
Object.entries(articulationExpectations).forEach(([mode, expectedLayers]) => {
  const geometry = context.build(footprint, configFor({
    floors: 6,
    podF: 0,
    facadeArticulation: mode,
    facadeArticulationDensity: 2
  }));
  const expectedPresent = expectedLayers.every(layer => featureCount(geometry, layer) > 0);
  const competingAbsent = articulationLayers
    .filter(layer => !expectedLayers.includes(layer))
    .every(layer => featureCount(geometry, layer) === 0);
  assert(expectedPresent && competingAbsent, `${mode} activates only its intended facade articulation layers`);
});

const lowMassing = context.build(footprint, configFor({
  floors: 6, F: 3, podF: 0, facadeArticulation: 'none', roofProfile: 'standard'
}));
const tallMassing = context.build(footprint, configFor({
  floors: 12, F: 4, podF: 0, facadeArticulation: 'none', roofProfile: 'standard'
}));
const mainRoofBase = geometry => Number(
  geometry.roof.features.find(feature => feature.properties.part === 'main_roof_slab').properties.b
);
assert(Math.abs(mainRoofBase(lowMassing) - 18) < 0.001, 'floor count and floor height set exact tower height');
assert(mainRoofBase(tallMassing) > mainRoofBase(lowMassing) * 2.5, 'massing height controls materially change the silhouette');

const prismaticMassing = context.build(footprint, configFor({
  floors: 12, podF: 0, facadeArticulation: 'none', taperMode: 'none', taper: 0
}));
const taperedMassing = context.build(footprint, configFor({
  floors: 12, podF: 0, facadeArticulation: 'none', taperMode: 'cont', taper: -0.32
}));
const steppedMassing = context.build(footprint, configFor({
  floors: 12, podF: 0, facadeArticulation: 'none', taperMode: 'step', stepEvery: 3, stepFactor: -0.08
}));
assert(topLevelArea(taperedMassing.core) < topLevelArea(prismaticMassing.core) * 0.82, 'continuous taper changes the upper-floor footprint');
assert(topLevelArea(steppedMassing.core) < topLevelArea(prismaticMassing.core) * 0.75, 'stepped taper creates visible setbacks');
const squareMassing = context.build(footprint, configFor({
  floors: 4, podF: 0, facadeArticulation: 'none', overallRoundness: 0
}));
const roundedMassing = context.build(footprint, configFor({
  floors: 4, podF: 0, facadeArticulation: 'none', overallRoundness: 1.4
}));
assert(coordinateCount(roundedMassing.core) > coordinateCount(squareMassing.core) * 2, 'roundness replaces sharp footprint corners with curved geometry');

const punchedBase = {
  floors: 5,
  podF: 0,
  facadeArticulation: 'none',
  windowStyle: 'punched',
  facadeAlpha: 1,
  windowWidth: 1.25
};
const tightPunched = context.build(footprint, configFor({ ...punchedBase, windowSpacing: 1.1 }));
const loosePunched = context.build(footprint, configFor({ ...punchedBase, windowSpacing: 5.8 }));
assert(partCount(tightPunched, 'windows') > partCount(loosePunched, 'windows'), 'punched-window spacing changes bay count');
const tallPunched = context.build(footprint, configFor({ ...punchedBase, windowProportion: 'tall' }));
const widePunched = context.build(footprint, configFor({ ...punchedBase, windowProportion: 'wide' }));
assert(averageFeatureArea(widePunched.windows) > averageFeatureArea(tallPunched.windows), 'wide punched windows have wider plan openings');
assert(layerVerticalSpan(tallPunched.windows) > layerVerticalSpan(widePunched.windows), 'punched-window proportion changes vertical opening height');

const sparseMullions = context.build(footprint, configFor({
  floors: 4, podF: 0, facadeArticulation: 'none', mullionV: 1, mullionH: 0
}));
const denseMullions = context.build(footprint, configFor({
  floors: 4, podF: 0, facadeArticulation: 'none', mullionV: 4, mullionH: 2
}));
assert(partCount(denseMullions, 'mullions') > partCount(sparseMullions, 'mullions') * 2, 'mullion counts change facade grid density');
const thinMullions = context.build(footprint, configFor({
  floors: 4, podF: 0, facadeArticulation: 'none', mullionV: 3, mullionH: 1, mullionThick: 0.02
}));
const thickMullions = context.build(footprint, configFor({
  floors: 4, podF: 0, facadeArticulation: 'none', mullionV: 3, mullionH: 1, mullionThick: 0.16
}));
const verticalMullions = collection => ({ features: collection.features.filter(feature => feature.properties.part === 'mullion') });
assert(layerArea(verticalMullions(thickMullions.mullions)) > layerArea(verticalMullions(thinMullions.mullions)) * 2, 'mullion thickness changes rendered member size');

const bandStyles = ['recessed-joint', 'slab-edge', 'spandrel-band', 'belt-course'];
bandStyles.forEach(style => {
  const geometry = context.build(footprint, configFor({
    floors: 6,
    podF: 0,
    facadeArticulation: 'none',
    separatorStyle: style,
    separatorEvery: 1
  }));
  assert(
    featureCount(geometry, 'seps') === 6
      && geometry.seps.features.every(feature => feature.properties.part === style),
    `${style} emits one correctly typed facade band per selected floor`
  );
});
const noBands = context.build(footprint, configFor({ floors: 6, podF: 0, facadeArticulation: 'none', separatorStyle: 'none' }));
const sparseBands = context.build(footprint, configFor({ floors: 8, podF: 0, facadeArticulation: 'none', separatorEvery: 4 }));
const frequentBands = context.build(footprint, configFor({ floors: 8, podF: 0, facadeArticulation: 'none', separatorEvery: 1 }));
assert(featureCount(noBands, 'seps') === 0, 'facade bands can be disabled cleanly');
assert(featureCount(frequentBands, 'seps') === featureCount(sparseBands, 'seps') * 4, 'facade-band frequency changes floor rhythm predictably');
const narrowBelts = context.build(footprint, configFor({ floors: 4, podF: 0, facadeArticulation: 'none', separatorStyle: 'belt-course', sW: 0.06 }));
const deepBelts = context.build(footprint, configFor({ floors: 4, podF: 0, facadeArticulation: 'none', separatorStyle: 'belt-course', sW: 0.34 }));
assert(layerArea(deepBelts.seps) > layerArea(narrowBelts.seps) * 2, 'facade-band projection changes visible depth');

const balconyBase = {
  floors: 8,
  podF: 0,
  facadeArticulation: 'none',
  balType: 'projecting',
  balD: 0.7,
  balN: 1,
  balWidthRatio: 0.42
};
const shallowBalconies = context.build(footprint, configFor(balconyBase));
const deepBalconies = context.build(footprint, configFor({ ...balconyBase, balD: 1.6 }));
assert(layerArea(deepBalconies.balconies) > layerArea(shallowBalconies.balconies) * 1.7, 'balcony depth changes usable projection');
const narrowBalconies = context.build(footprint, configFor({ ...balconyBase, balWidthRatio: 0.28 }));
const wideBalconies = context.build(footprint, configFor({ ...balconyBase, balWidthRatio: 0.78 }));
assert(layerArea(wideBalconies.balconies) > layerArea(narrowBalconies.balconies) * 1.8, 'balcony bay width changes facade coverage');
const sparseBalconies = context.build(footprint, configFor({ ...balconyBase, balN: 3 }));
assert(featureCount(shallowBalconies, 'balconies') > featureCount(sparseBalconies, 'balconies') * 2, 'balcony frequency changes occupied floors');
const balconyTypes = ['projecting', 'wrap', 'perimeter-segmented', 'alternating', 'corner', 'stacked'];
const balconySignatures = balconyTypes.map(type => {
  const geometry = context.build(footprint, configFor({ ...balconyBase, balType: type }));
  return [...new Set(geometry.balconies.features.map(feature => String(feature.properties.part)))].sort().join('|');
});
assert(
  balconySignatures.every(Boolean) && new Set(balconySignatures).size === balconyTypes.length,
  'all balcony types generate distinct facade-oriented arrangements'
);
const lowRailings = context.build(footprint, configFor({ ...balconyBase, railH: 0.75, railThick: 0.05 }));
const highRailings = context.build(footprint, configFor({ ...balconyBase, railH: 1.35, railThick: 0.16 }));
assert(layerVerticalSpan(highRailings.railings) > layerVerticalSpan(lowRailings.railings), 'railing height changes the protective edge height');
assert(layerArea(highRailings.railings) > layerArea(lowRailings.railings) * 1.5, 'railing thickness changes the outer-edge member size');

const oneStoreyPodium = context.build(footprint, configFor({ floors: 4, podF: 1, podOut: 0.5, podiumSpecialGroundFloor: false }));
const threeStoreyPodium = context.build(footprint, configFor({ floors: 4, podF: 3, podOut: 0.5, podiumSpecialGroundFloor: false }));
assert(
  featureCount(oneStoreyPodium, 'podium') >= 2
    && featureCount(threeStoreyPodium, 'podium') > featureCount(oneStoreyPodium, 'podium'),
  'podium floor count creates layered floor plates and spandrels for each requested storey'
);
assert(layerVerticalSpan(threeStoreyPodium.podium) > layerVerticalSpan(oneStoreyPodium.podium) * 2.5, 'podium floor count changes podium height');
const compactPodium = context.build(footprint, configFor({ floors: 4, podF: 1, podOut: 0.2 }));
const broadPodium = context.build(footprint, configFor({ floors: 4, podF: 1, podOut: 3 }));
assert(layerArea(broadPodium.podium) > layerArea(compactPodium.podium) * 1.25, 'podium outset changes its footprint');
const standardGround = context.build(footprint, configFor({ floors: 4, podF: 1, podiumSpecialGroundFloor: false }));
const tallGround = context.build(footprint, configFor({ floors: 4, podF: 1, podiumSpecialGroundFloor: true, podiumGroundFlrHt: 6 }));
assert(layerVerticalSpan(tallGround.podium) > layerVerticalSpan(standardGround.podium) * 1.5, 'tall ground floor changes podium storey height');

const podiumLayers = ['podiumGlass', 'podiumFrames', 'podiumDoors', 'podiumCanopies', 'podiumLobby', 'podiumCap'];
assert(
  podiumLayers.every(layer => featureCount(oneStoreyPodium, layer) > 0),
  'default podium emits storefront glazing, entrance framing, clear doors, canopy, visible lobby, and cap'
);
assert(
  oneStoreyPodium.podium.features.some(feature => feature.properties.part === 'podium_perimeter_backing'),
  'podium includes a continuous recessed perimeter backing behind storefront layers'
);
const disconnectedPodiumFootprint = context.turf.multiPolygon([
  footprint.geometry.coordinates,
  secondFootprintCoords
]);
const disconnectedPodiumOut = {
  podium: [], podiumGlass: [], podiumFrames: [], podiumDoors: [],
  podiumCanopies: [], podiumLobby: [], podiumCap: []
};
const disconnectedPodiumConfig = configFor({ floors: 1, podF: 2, podOut: 0.4, overallRoundness: 0 });
context.buildPodiumSystem(
  disconnectedPodiumFootprint,
  disconnectedPodiumConfig,
  disconnectedPodiumOut
);
const styledPodiumComponents = new Set(disconnectedPodiumOut.podiumGlass.map(feature => feature.properties.podium_component));
const disconnectedBacking = disconnectedPodiumOut.podium.find(feature => feature.properties.part === 'podium_perimeter_backing');
assert(
  styledPodiumComponents.has(0) && styledPodiumComponents.has(1),
  'storefront glazing and bays wrap every disconnected podium footprint component'
);
assert(
  disconnectedBacking
    && disconnectedBacking.properties.perimeter_parts === 2
    && context.turf.area(disconnectedBacking) > 1,
  'continuous podium backing spans every disconnected perimeter component'
);
visualFixtures.push({
  name: 'disconnected podium perimeter',
  geometry: context.build(disconnectedPodiumFootprint, disconnectedPodiumConfig),
  cfg: disconnectedPodiumConfig
});
assert(
  oneStoreyPodium.podiumDoors.features.every(feature =>
    ['entrance_door_leaf', 'retail_door_leaf', 'revolving_door'].includes(feature.properties.part)
      && context.turf.area(feature) > 0
  ),
  'podium entrance doors carry explicit architectural part metadata and finite geometry'
);
const narrowEntrance = context.build(footprint, configFor({ floors: 4, podF: 1, podiumEntranceWidth: 3.2 }));
const wideEntrance = context.build(footprint, configFor({ floors: 4, podF: 1, podiumEntranceWidth: 10 }));
assert(layerArea(wideEntrance.podiumDoors) > layerArea(narrowEntrance.podiumDoors) * 1.5, 'entrance width changes the glazed door assembly');
const lowDoors = context.build(footprint, configFor({ floors: 4, podF: 1, podiumDoorHeight: 2.1 }));
const tallDoors = context.build(footprint, configFor({ floors: 4, podF: 1, podiumDoorHeight: 3.5 }));
assert(layerVerticalSpan(tallDoors.podiumDoors) > layerVerticalSpan(lowDoors.podiumDoors) * 1.45, 'door height changes the entrance elevation');
const shallowCanopy = context.build(footprint, configFor({ floors: 4, podF: 1, podiumCanopyDepth: 0.7 }));
const deepCanopy = context.build(footprint, configFor({ floors: 4, podF: 1, podiumCanopyDepth: 4 }));
assert(layerArea(deepCanopy.podiumCanopies) > layerArea(shallowCanopy.podiumCanopies) * 3.5, 'canopy depth changes the weather-protected arrival zone');
const shallowLobby = context.build(footprint, configFor({ floors: 4, podF: 1, podiumLobbyDepth: 3 }));
const deepLobby = context.build(footprint, configFor({ floors: 4, podF: 1, podiumLobbyDepth: 14 }));
assert(layerArea(deepLobby.podiumLobby) > layerArea(shallowLobby.podiumLobby) * 1.5, 'lobby depth changes the visible interior arrival hall');
const coarseStorefront = context.build(footprint, configFor({ floors: 4, podF: 2, podiumBayWidth: 8 }));
const fineStorefront = context.build(footprint, configFor({ floors: 4, podF: 2, podiumBayWidth: 2.4 }));
assert(featureCount(fineStorefront, 'podiumGlass') > featureCount(coarseStorefront, 'podiumGlass') * 2, 'storefront bay width controls podium facade rhythm');
const flushCap = context.build(footprint, configFor({ floors: 4, podF: 1, podiumCapDepth: 0.05 }));
const deepCap = context.build(footprint, configFor({ floors: 4, podF: 1, podiumCapDepth: 1.5 }));
assert(layerArea(deepCap.podiumCap) > layerArea(flushCap.podiumCap) * 1.1, 'podium cap depth changes the top-of-base reveal');
const podiumStyleConfigs = vm.runInContext('PODIUM_STYLE_CONFIGS', context);
assert(
  validPodiumStyles.size === Object.keys(podiumStyleConfigs).length
    && [...validPodiumStyles].every(style => podiumStyleConfigs[style]),
  'all six podium compositions have coordinated fallback values'
);

const roofBaseConfig = {
  floors: 10,
  podF: 0,
  facadeArticulation: 'none',
  penthouseF: 0,
  enableSpire: false
};
const standardRoof = context.build(footprint, configFor({ ...roofBaseConfig, roofProfile: 'standard' }));
const mechanicalRoof = context.build(footprint, configFor({ ...roofBaseConfig, roofProfile: 'mechanical' }));
const terracedRoof = context.build(footprint, configFor({ ...roofBaseConfig, roofProfile: 'terraced' }));
const greenRoof = context.build(footprint, configFor({ ...roofBaseConfig, roofProfile: 'green' }));
const taperedRoof = context.build(footprint, configFor({
  ...roofBaseConfig,
  roofProfile: 'tapered',
  roofTaperStartFloor: 6,
  roofTaperStep: -0.07
}));
assert(featureCount(standardRoof, 'roof') === 1, 'standard roof remains a restrained slab and parapet assembly');
assert(featureCount(mechanicalRoof, 'roofScreens') > 0 && featureCount(mechanicalRoof, 'roofEquipment') > 0, 'mechanical roof generates screened equipment');
assert(featureCount(terracedRoof, 'roofTerraces') === 3, 'terraced roof generates a three-stage crown');
assert(featureCount(greenRoof, 'roofPlanting') > 0, 'green roof generates a planting layer');
assert(topLevelArea(taperedRoof.core) < topLevelArea(standardRoof.core) * 0.8, 'tapered roof creates a narrowing crown in the tower envelope');
const penthouseRoof = context.build(footprint, configFor({ ...roofBaseConfig, roofProfile: 'standard', penthouseF: 2, penthouseScale: 0.5 }));
assert(featureCount(penthouseRoof, 'rooftopStructures') === 1 && featureCount(penthouseRoof, 'roof') === 2, 'penthouse floors add a roof structure and cap');
const shortSpire = context.build(footprint, configFor({ ...roofBaseConfig, enableSpire: true, spireHeight: 12 }));
const tallSpire = context.build(footprint, configFor({ ...roofBaseConfig, enableSpire: true, spireHeight: 48 }));
assert(featureCount(shortSpire, 'spires') >= 3, 'enabled spire generates a tapered multi-stage assembly');
assert(layerVerticalSpan(tallSpire.spires) > layerVerticalSpan(shortSpire.spires) * 3.9, 'spire height changes crown height');
const lowParapet = context.build(footprint, configFor({ ...roofBaseConfig, parapetH: 0.5, parapetThick: 0.12 }));
const highParapet = context.build(footprint, configFor({ ...roofBaseConfig, parapetH: 1.5, parapetThick: 0.5 }));
assert(layerVerticalSpan(highParapet.parapets) > layerVerticalSpan(lowParapet.parapets) * 2.9, 'parapet height changes roof-edge height');
assert(layerArea(highParapet.parapets) > layerArea(lowParapet.parapets) * 2.5, 'parapet thickness changes roof-edge mass');

/* ---- Setback tiers, pier crown, bay grid, material zones (BG-083..085) ---- */
const tierBase = { floors: 12, F: 3.5, podF: 0, facadeArticulation: 'none', roofProfile: 'standard', penthouseF: 0 };
const flatTower = context.build(footprint, configFor(tierBase));
const streetTier = context.build(footprint, configFor({ ...tierBase, sb1Floor: 9, sb1Depth: 3, sb1Faces: 'street' }));
const allTier = context.build(footprint, configFor({ ...tierBase, sb1Floor: 9, sb1Depth: 3, sb1Faces: 'all' }));
const streetRatio = topLevelArea(streetTier.core) / topLevelArea(flatTower.core);
const allRatio = topLevelArea(allTier.core) / topLevelArea(flatTower.core);
assert(streetRatio > 0.86 && streetRatio < 0.94, `street-face setback removes one storey-scale strip (${streetRatio.toFixed(3)})`);
assert(allRatio > 0.62 && allRatio < 0.76, `all-face setback steps every face back by the tier depth (${allRatio.toFixed(3)})`);
const coreBelowTier = streetTier.core.features.filter(f => Number(f.properties.h) <= 8 * 3.5 + 0.001);
assert(
  coreBelowTier.length > 0 && Math.abs(layerArea({ features: coreBelowTier }) / coreBelowTier.length - layerArea({ features: flatTower.core.features.filter(f => Number(f.properties.h) <= 8 * 3.5 + 0.001) }) / coreBelowTier.length) < 1,
  'floors below a setback tier keep the full plate'
);
const terraceParts = part => layer => (layer.features || []).filter(f => f.properties.part === part).length;
assert(terraceParts('setback_terrace')(streetTier.roofTerraces) === 1, 'each setback tier is paved as a terrace');
assert(terraceParts('terrace_handrail')(streetTier.railings) >= 1 && terraceParts('terrace_balustrade_glass')(streetTier.windows) >= 1, 'setback terraces get a 1.1 m glass balustrade');
assert(terraceParts('terrace_planter')(streetTier.roofPlanting) >= 1, 'setback terraces get planters');
const railTop = Math.max(...streetTier.railings.features.filter(f => f.properties.part === 'terrace_handrail').map(f => f.properties.h));
const terraceDeck = streetTier.roofTerraces.features[0].properties.b;
assert(Math.abs(railTop - terraceDeck - 1.16) < 0.02, 'terrace balustrade stands 1.1 m above the paving');
const bareTier = context.build(footprint, configFor({ ...tierBase, sb1Floor: 9, sb1Depth: 3, sb1Faces: 'all', setbackTerraces: false }));
assert(featureCount(bareTier, 'roofPlanting') === 0 && featureCount(bareTier, 'roofTerraces') === 1, 'terrace planting and rails can be switched off');
const terracedCrown = context.build(footprint, configFor({ ...tierBase, roofProfile: 'terraced' }));
const terraceDecks = terracedCrown.roofTerraces.features.map(f => Number(f.properties.b)).sort((a, b) => a - b);
assert(terraceDecks.length === 3 && terraceDecks[1] - terraceDecks[0] >= 3.5 - 0.001, 'Terraced Crown steps back one full storey per tier');
assert(topLevelArea(terracedCrown.core) < topLevelArea(flatTower.core) * 0.5, 'Terraced Crown pulls the top floors in by storey-scale setbacks');
const legacyStep = context.build(footprint, configFor({ ...tierBase, taperMode: 'step', stepEvery: 4, stepFactor: -0.05 }));
assert(featureCount(legacyStep, 'roofTerraces') === 2, 'legacy stepped taper resolves to setback tiers with terraces');
assert(
  context.getSetbackTiers({ floors: 30, taperMode: 'none', roofProfile: 'standard', sb1Floor: 20, sb1Depth: 3, sb1Faces: 'street', sb2Floor: 0 }).length === 1,
  'only tiers with a start floor and depth are active'
);
const migrated = context.migrateMassingConfig({ floors: 20, taperMode: 'step', stepEvery: 5, stepFactor: -0.06 });
assert(migrated.taperMode === 'none' && migrated.sb1Floor === 6 && migrated.sb3Floor === 16 && migrated.bayGrid === false, 'legacy presets migrate stepped tapers to explicit tiers and default the new systems off');

const crownBase = { ...tierBase, roofProfile: 'crown', crownFloors: 2 };
const crenellated = context.build(footprint, configFor({ ...crownBase, crownStyle: 'crenellated' }));
const frameCrown = context.build(footprint, configFor({ ...crownBase, crownStyle: 'picture-frame' }));
const crownPiers = crenellated.piers.features.filter(f => f.properties.part === 'crown_pier');
const roofLevel = 12 * 3.5;
const crownTops = [...new Set(crownPiers.map(f => Number(f.properties.h).toFixed(2)))];
assert(crownPiers.length > 0 && Math.max(...crownPiers.map(f => f.properties.h)) - roofLevel >= 2 * 3.5, 'pier crown rises two storeys above the roof slab');
assert(crownTops.length >= 2, 'crenellated crown alternates pier heights');
const bulkhead = crenellated.roofEquipment.features.find(f => f.properties.part === 'screened_bulkhead');
assert(bulkhead && bulkhead.properties.h < Math.max(...crownPiers.map(f => f.properties.h)), 'crown piers rise above and screen the mechanical bulkhead');
assert(frameCrown.piers.features.some(f => f.properties.part === 'crown_frame_beam'), 'picture-frame crown ties the piers with a top beam');
assert(featureCount(crenellated, 'rooftopStructures') === 0, 'pier crown replaces the penthouse box');

const bayBase = { floors: 8, F: 3.4, podF: 0, facadeArticulation: 'none', windowStyle: 'bay', facadeAlpha: 1, bayWidth: 3.3, pierWidth: 0.7, pierProjection: 0.2, glassRecess: 0.3, lightsPerBay: 2, transomHeight: 2.2, groupFloors: 1 };
const bayTower = context.build(footprint, configFor(bayBase));
const facadePiers = bayTower.piers.features.filter(f => f.properties.part === 'facade_pier');
assert(facadePiers.length > 0 && facadePiers.every(f => Math.abs(f.properties.b - 0) < 0.01 && Math.abs(f.properties.h - 8 * 3.4) < 0.01), 'bay-grid piers stack into continuous full-height members');
assert(bayTower.core.features.some(f => f.properties.part === 'wall_opening_zone'), 'bay openings are cut through the wall');
assert(bayTower.mullions.features.some(f => f.properties.part === 'bay_transom') && bayTower.mullions.features.some(f => f.properties.part === 'bay_mullion'), 'bay openings carry mullions and a transom');
const oneLight = context.build(footprint, configFor({ ...bayBase, lightsPerBay: 1 }));
const threeLight = context.build(footprint, configFor({ ...bayBase, lightsPerBay: 3 }));
assert(partCount(threeLight, 'mullions', f => f.properties.part === 'bay_mullion') > partCount(bayTower, 'mullions', f => f.properties.part === 'bay_mullion')
  && partCount(oneLight, 'mullions', f => f.properties.part === 'bay_mullion') === 0, 'lights per bay sets the mullion subdivision');
const wideBays = context.build(footprint, configFor({ ...bayBase, bayWidth: 6 }));
assert(partCount(wideBays, 'windows') < partCount(bayTower, 'windows'), 'bay width sets the opening rhythm');
const doubleBays = context.build(footprint, configFor({ ...bayBase, groupFloors: 2 }));
const doubleSpan = Math.max(...doubleBays.core.features.filter(f => f.properties.part === 'wall_opening_zone').map(f => f.properties.h - f.properties.b));
const singleSpan = Math.max(...bayTower.core.features.filter(f => f.properties.part === 'wall_opening_zone').map(f => f.properties.h - f.properties.b));
assert(doubleBays.borders.features.some(f => f.properties.part === 'bay_spandrel_panel') && doubleSpan > singleSpan, 'two-floor window groups share a cut with a recessed spandrel panel');
const pierCountPerFloor = geometry => geometry.piers.features.filter(f => f.properties.part === 'facade_pier')
  .reduce((sum, f) => sum + (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.length : 1), 0);
const finnedBays = context.build(footprint, configFor({ ...bayBase, facadeArticulation: 'vertical-fins', facadeArticulationDensity: 3, facadeArticulationDepth: 0.3, bayGrid: true }));
const finsPerFloor = partCount(finnedBays, 'verticalRibs') / 8;
assert(Math.abs(finsPerFloor - pierCountPerFloor(bayTower)) < 0.01, `fins land on every pier line when the bay grid is on (${finsPerFloor} vs ${pierCountPerFloor(bayTower)})`);
const groupedPunched = context.build(footprint, configFor({ floors: 5, podF: 0, facadeArticulation: 'none', windowStyle: 'punched', facadeAlpha: 1, bayGrid: true, lightsPerBay: 2 }));
const singlePunched = context.build(footprint, configFor({ floors: 5, podF: 0, facadeArticulation: 'none', windowStyle: 'punched', facadeAlpha: 1, bayGrid: true, lightsPerBay: 1 }));
assert(partCount(groupedPunched, 'windows') === partCount(singlePunched, 'windows') * 2, 'grouped punched windows place two windows per bay');
const ribbonBay = context.build(footprint, configFor({ floors: 4, podF: 0, facadeArticulation: 'none', windowStyle: 'ribbon', bayGrid: true, bayWidth: 3.3 }));
const ribbonBayWide = context.build(footprint, configFor({ floors: 4, podF: 0, facadeArticulation: 'none', windowStyle: 'ribbon', bayGrid: true, bayWidth: 6.6 }));
assert(partCount(ribbonBay, 'mullions', f => f.properties.part === 'mullion') > partCount(ribbonBayWide, 'mullions', f => f.properties.part === 'mullion'), 'ribbon mullions follow the bay grid');
const steppedBays = context.build(footprint, configFor({ ...bayBase, floors: 10, sb1Floor: 7, sb1Depth: 3, sb1Faces: 'street' }));
const tierZ = 6 * 3.4;
assert(steppedBays.piers.features.some(f => f.properties.b < tierZ - 1 && f.properties.h > tierZ + 1), 'piers on faces untouched by a setback stack straight through the tier');

const zoneCfg = { ...bayBase, floors: 10, zoneEnable: true, zoneBaseFloors: 2, zoneBaseColor: '#332211', zoneBaseTex: 'none', zoneBaseFrame: '#111111', zoneTopFloors: 2, zoneTopColor: '#ddccbb', zoneTopTex: 'none', zoneTopFrame: '#222222', wallColor: '#b56d54' };
const zoned = context.build(footprint, configFor(zoneCfg));
const coreAt = (geometry, floor) => geometry.core.features.filter(f => Math.floor((f.properties.b + 0.01) / 3.4) === floor);
assert(coreAt(zoned, 0).length > 0 && coreAt(zoned, 0).every(f => f.properties.c === '#332211'), 'base zone floors take the base wall material');
assert(coreAt(zoned, 9).length > 0 && coreAt(zoned, 9).every(f => f.properties.c === '#ddccbb'), 'top zone floors take the top wall material');
assert(coreAt(zoned, 5).every(f => f.properties.c === undefined), 'shaft floors keep the facade material');
assert(zoned.borders.features.some(f => f.properties.c === '#111111') && zoned.borders.features.some(f => f.properties.c === '#222222'), 'base and top zones take their own frame colour');
const longFootprint = advancedPresetFootprints[1].feature;
const volumeCfg = { floors: 6, F: 3.4, podF: 0, facadeArticulation: 'none', windowStyle: 'punched', facadeAlpha: 1, volumeCount: '3', volumeColorB: '#444444', volumeColorC: '#cccccc', slotWidth: 1.8, slotDepth: 0.9, slotColor: '#101010' };
const blocked = context.build(longFootprint, configFor(volumeCfg));
const unblocked = context.build(longFootprint, configFor({ ...volumeCfg, volumeCount: 'none' }));
const volumeColors = new Set(blocked.core.features.map(f => f.properties.c));
assert(volumeColors.has('#444444') && volumeColors.has('#cccccc') && volumeColors.has('#101010'), 'plan volumes and connector slots take their own materials');
assert(topLevelArea(blocked.core) < topLevelArea(unblocked.core) - 1, 'connector slots are recessed into the plate');
const accented = context.build(footprint, configFor({ floors: 6, podF: 0, facadeArticulation: 'none', windowStyle: 'punched', facadeAlpha: 1, bayGrid: true, accentPanels: 'spandrel', accentDensity: 0.5 }));
assert(featureCount(accented, 'accentPanels') > 0 && featureCount(context.build(footprint, configFor({ floors: 6, podF: 0, facadeArticulation: 'none', windowStyle: 'punched', facadeAlpha: 1, bayGrid: true, accentPanels: 'none' })), 'accentPanels') === 0, 'accent panels are optional spandrel panels');
const glassProfile = context.exportMaterialProfile('windows', 'none');
const brickProfile = context.exportMaterialProfile('core', 'wall-brick-red');
const metalProfile = context.exportMaterialProfile('mullions', 'none');
assert(glassProfile.kind === 'glass' && glassProfile.transmission > 0 && glassProfile.roughness < 0.1, 'GLB glass exports as transmissive PBR');
assert(brickProfile.roughness > 0.85 && brickProfile.metalness === 0 && metalProfile.metalness > 0.7, 'GLB brick and metal export with distinct roughness and metalness');
assert(/MeshPhysicalMaterial\(\{ \.\.\.common, transmission/.test(html) && /exportMaterialProfile\(layerKey/.test(html), '3D export builds materials from the PBR profile');
assert(/renderEntries\.forEach\(\(\[k, c, a, p, fc, suffix\]\)/.test(html), 'Mapbox layers split by per-feature material so zones keep their textures');
assert(presets.presets.filter(preset => Number(preset.config.sb1Floor) > 0).length >= 8, 'advanced presets use storey-scale setback tiers');
assert(presets.presets.some(preset => preset.config.roofProfile === 'crown') && presets.presets.some(preset => preset.config.windowStyle === 'bay'), 'advanced presets showcase the pier crown and pier-and-bay facades');
assert(presets.presets.some(preset => preset.config.volumeCount !== 'none') && presets.presets.some(preset => preset.config.zoneEnable), 'advanced presets showcase colour-blocked volumes and elevation zones');
assert(presets.presets.every(preset => preset.config.taperMode !== 'step'), 'advanced presets no longer use the legacy stepped taper');

context.lastFootprintSource = 'test-harness';
context.selectedBuildingGroups = [];
context.lastPoly = footprint;
const styledExport = context.buildStyledGeoJsonExport(exportFixture.geometry, exportFixture.cfg);
const exportKeys = [
  'mbg_building_type', 'mbg_facade_type', 'mbg_facade_articulation', 'mbg_roof_style',
  'mbg_transparency_mode', 'mbg_layer', 'mbg_part', 'mbg_floor', 'mbg_base_m',
  'mbg_height_m', 'mbg_fill_color', 'mbg_fill_opacity', 'mbg_pattern'
];
assert(styledExport.features.length > 0, 'styled GeoJSON export contains exterior geometry');
assert(
  styledExport.features.every(feature => exportKeys.every(key => Object.prototype.hasOwnProperty.call(feature.properties, key))),
  'styled GeoJSON export carries architectural and presentation metadata on every feature'
);
assert(styledExport.mbg_export.facadeArticulation === 'panel-grid', 'styled GeoJSON export records facade articulation');
assert(styledExport.mbg_export.roofStyle === 'terraced', 'styled GeoJSON export records roof assembly');
assert(styledExport.mbg_export.layerSummary.roofTerraces >= 3, 'styled GeoJSON export preserves roof terrace layers');
assert(styledExport.mbg_export.layerSummary.balconies > 0, 'styled GeoJSON export preserves balcony layers');
assert(
  styledExport.features.filter(feature => feature.properties.mbg_layer === 'facadePanels')
    .every(feature => feature.properties.mbg_fill_color === exportFixture.cfg.facadeArticulationColor),
  'styled GeoJSON export preserves facade articulation color'
);

const modes = ['solid', 'balanced', 'custom', 'xray', 'exterior-only'];
const opacityResult = Object.fromEntries(modes.map(mode => {
  const cfg = { viewTransparency: mode };
  return [mode, {
    skin: context.getLayerPresentationOpacity('core', 0.6, cfg),
    detail: context.getLayerPresentationOpacity('balconies', 1, cfg),
    internal: context.getLayerPresentationOpacity('floorSlabs', 1, cfg)
  }];
}));
assert(opacityResult.solid.internal === 0, 'Solid mode hides internal systems');
assert(opacityResult.solid.skin === 1 && opacityResult.solid.detail === 1, 'Solid mode makes the complete exterior opaque');
assert(opacityResult.balanced.skin === 1 && opacityResult.balanced.detail === 1 && opacityResult.balanced.internal === 0, 'Balanced mode renders the envelope fully opaque (no ghosted walls)');
assert(
  context.getLayerPresentationOpacity('core', 0.8, { viewTransparency: 'custom' })
    > context.getLayerPresentationOpacity('core', 0.2, { viewTransparency: 'custom' }),
  'Manual opacity mode still honours the facade-opacity control'
);
assert(opacityResult.custom.skin === 0.6, 'Manual opacity uses the configured facade opacity directly');
assert(
  context.getLayerPresentationOpacity('windows', 0.25, { viewTransparency: 'custom' }) === 0.25
    && context.getLayerPresentationOpacity('core', 0, { viewTransparency: 'custom' }) === 0,
  'Manual opacity supports translucent windows and a fully transparent facade'
);
const punchedWindowStyle = context.getExportLayerStyles(configFor({
  windowStyle: 'punched', windowAlpha: 0.43, windowColor: '#34789a', viewTransparency: 'custom'
})).windows;
const ribbonWindowStyle = context.getExportLayerStyles(configFor({
  windowStyle: 'ribbon', windowAlpha: 0.43, windowColor: '#34789a', viewTransparency: 'custom'
})).windows;
const expectedPunchedWindowColor = vm.runInContext("lightenHex('#34789a', 0.25)", context);
assert(
  punchedWindowStyle.pattern === 'none'
    && punchedWindowStyle.fillOpacity === 0.43
    && punchedWindowStyle.fillColor === expectedPunchedWindowColor,
  'punched windows use their configured glazing color and manual opacity without an opaque texture'
);
assert(ribbonWindowStyle.pattern === 'facade-glass-grid', 'ribbon glazing retains its glass texture');
assert(
  (html.match(/\['windows',[^\n]+o\.windowStyle !== 'ribbon' \? 'none' : 'facade-glass-grid'/g) || []).length === 2,
  'Mapbox rendering and styled GeoJSON export both disable textures for punched windows'
);
assert(
  /'masonry-punched': \{[\s\S]{0,180}viewTransparency: 'custom'/.test(html)
    && /'heavy-concrete': \{[\s\S]{0,180}viewTransparency: 'custom'/.test(html),
  'punched facade defaults preserve manual window opacity'
);
assert(
  /\['facadeAlpha', 'windowAlpha'\][\s\S]{0,340}\$\('viewTransparency'\)\.value = 'custom'/.test(html),
  'editing either opacity control activates Manual opacity mode'
);
assert(!/windowStyle'\)\.value === 'punched' \? 1 :/.test(html), 'punched facades respect the configured facade opacity');
assert(opacityResult.xray.internal > opacityResult.xray.skin, 'X-Ray mode prioritizes internal systems');
assert(opacityResult['exterior-only'].internal === 0, 'Exterior Only mode removes internal systems');
assert(opacityResult['exterior-only'].skin === 1 && opacityResult['exterior-only'].detail === 1, 'Exterior Only mode keeps all exterior structure opaque');
const envelopeOpacityLayers = ['core', 'podium', 'facadePanels', 'verticalRibs', 'exoskeleton', 'balconies', 'roof'];
assert(
  envelopeOpacityLayers.every(layer => context.getLayerPresentationOpacity(layer, 0.2, { viewTransparency: 'balanced' }) >= 0.88),
  'Balanced mode prevents low component opacity from turning the whole building transparent'
);
assert(
  envelopeOpacityLayers.every(layer => context.getLayerPresentationOpacity(layer, 1, { viewTransparency: 'xray' }) < 0.63),
  'X-Ray is the only mode that makes the complete exterior translucent'
);

function shadeHex(value, multiplier) {
  let hex = String(value || '#888888').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) hex = '888888';
  const channel = index => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(index, index + 2), 16) * multiplier)))
    .toString(16).padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  })[char]);
}

function geometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function renderAxonometricSvg(fixture) {
  const width = 1000;
  const height = 760;
  const titleHeight = 64;
  const styles = context.getExportLayerStyles(fixture.cfg);
  const layerOrder = new Map([
    'podium', 'podiumLobby', 'podiumGlass', 'podiumDoors', 'podiumFrames',
    'podiumCanopies', 'podiumCap', 'core', 'windows', 'borders', 'windowSills', 'mullions', 'seps',
    'facadePanels', 'facadeJoints', 'verticalRibs', 'exoskeleton', 'balconies',
    'railings', 'cornices', 'roof', 'roofTerraces', 'roofScreens', 'roofEquipment',
    'roofPlanting', 'parapets', 'rooftopStructures', 'spires'
  ].map((layer, index) => [layer, index]));

  const coordinates = [];
  Object.values(fixture.geometry).forEach(collection => {
    (collection.features || []).forEach(feature => {
      geometryPolygons(feature.geometry).forEach(polygon => polygon.forEach(ring => ring.forEach(coord => coordinates.push(coord))));
    });
  });
  const centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / Math.max(1, coordinates.length);
  const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / Math.max(1, coordinates.length);
  const lonScale = 111320 * Math.cos(centerLat * Math.PI / 180);
  const local = coord => ({ x: (coord[0] - centerLng) * lonScale, y: (coord[1] - centerLat) * 110540 });
  const iso = (point, z) => ({ u: (point.x - point.y) * 0.8660254, v: (point.x + point.y) * 0.46 - z });
  const cameraDepth = (point, z) => (point.x + point.y) * 0.8660254 + z * 0.796743;
  const faces = [];
  const projected = [];
  const localPoints = coordinates.map(local);

  Object.entries(fixture.geometry).forEach(([layer, collection]) => {
    const style = styles[layer] || { fillColor: '#888888', fillOpacity: 1 };
    (collection.features || []).forEach((feature, featureIndex) => {
      const props = feature.properties || {};
      const base = Number(props.b);
      const top = Number(props.h);
      if (!Number.isFinite(base) || !Number.isFinite(top) || top <= base) return;
      const color = typeof props.c === 'string' ? props.c : style.fillColor;
      const propertyOpacity = Number(props.a);
      const opacity = Number.isFinite(propertyOpacity)
        ? context.getLayerPresentationOpacity(layer, propertyOpacity, fixture.cfg)
        : style.fillOpacity;
      if (!(opacity > 0.01)) return;

      geometryPolygons(feature.geometry).forEach((polygon, polygonIndex) => {
        const localRings = polygon.map(ring => ring.map(local));
        const depthPoints = localRings[0] || [];
        const meanDepth = depthPoints.reduce((sum, point) => sum + point.x + point.y, 0) / Math.max(1, depthPoints.length);

        localRings.forEach((ring, ringIndex) => {
          for (let edge = 0; edge < ring.length - 1; edge++) {
            const a = ring[edge];
            const b = ring[edge + 1];
            const points = [iso(a, base), iso(b, base), iso(b, top), iso(a, top)];
            projected.push(...points);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const directionalShade = 0.67 + 0.2 * (Math.abs(dx) / Math.max(0.001, Math.abs(dx) + Math.abs(dy)));
            faces.push({
              kind: 'polygon', points, fill: shadeHex(color, directionalShade), opacity,
              stroke: shadeHex(color, 0.52),
              depth: (cameraDepth(a, (base + top) / 2) + cameraDepth(b, (base + top) / 2)) / 2 + (ringIndex * 0.0001),
              order: layerOrder.get(layer) ?? 0,
              key: `${layer}-${featureIndex}-${polygonIndex}-${ringIndex}-${edge}`
            });
          }
        });

        const topRings = localRings.map(ring => ring.map(point => iso(point, top)));
        topRings.forEach(ring => projected.push(...ring));
        faces.push({
          kind: 'path', rings: topRings, fill: shadeHex(color, 1.12), opacity,
          stroke: shadeHex(color, 0.58), depth: meanDepth * 0.8660254 + top * 0.796743 + 0.0002,
          order: (layerOrder.get(layer) ?? 0) + 0.5,
          key: `${layer}-${featureIndex}-${polygonIndex}-top`
        });
      });
    });
  });

  const projectedBounds = projected.reduce((bounds, point) => ({
    minU: Math.min(bounds.minU, point.u),
    maxU: Math.max(bounds.maxU, point.u),
    minV: Math.min(bounds.minV, point.v),
    maxV: Math.max(bounds.maxV, point.v)
  }), { minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity });
  const { minU, maxU, minV, maxV } = projectedBounds;
  const plotWidth = width - 72;
  const plotHeight = height - titleHeight - 42;
  const scale = Math.min(plotWidth / Math.max(1, maxU - minU), plotHeight / Math.max(1, maxV - minV));
  const offsetX = 36 + (plotWidth - (maxU - minU) * scale) / 2;
  const offsetY = titleHeight + 16 + (plotHeight - (maxV - minV) * scale) / 2;
  const screen = point => ({
    x: offsetX + (point.u - minU) * scale,
    y: offsetY + (point.v - minV) * scale
  });
  const pointsAttr = points => points.map(point => {
    const p = screen(point);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
  const pathAttr = rings => rings.map(ring => {
    const points = ring.map(screen);
    if (!points.length) return '';
    return `M${points.map(point => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join('L')}Z`;
  }).join('');

  faces.sort((a, b) => a.depth - b.depth || a.order - b.order || a.key.localeCompare(b.key));
  const planBounds = localPoints.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const minX = planBounds.minX - 8;
  const maxX = planBounds.maxX + 8;
  const minY = planBounds.minY - 8;
  const maxY = planBounds.maxY + 8;
  const grid = [];
  for (let x = Math.floor(minX / 5) * 5; x <= maxX; x += 5) {
    grid.push([screen(iso({ x, y: minY }, 0)), screen(iso({ x, y: maxY }, 0))]);
  }
  for (let y = Math.floor(minY / 5) * 5; y <= maxY; y += 5) {
    grid.push([screen(iso({ x: minX, y }, 0)), screen(iso({ x: maxX, y }, 0))]);
  }

  const layerCount = Object.values(fixture.geometry).filter(collection => (collection.features || []).length).length;
  const featureCount = Object.values(fixture.geometry).reduce((sum, collection) => sum + (collection.features || []).length, 0);
  const subtitle = `${fixture.cfg.floors} floors · ${fixture.cfg.facadeType} · ${fixture.cfg.facadeArticulation} · ${fixture.cfg.roofProfile} roof · ${featureCount} features / ${layerCount} layers`;
  const gridSvg = grid.map(([a, b]) => `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`).join('');
  const facesSvg = faces.map(face => {
    if (face.kind === 'path') {
      return `<path d="${pathAttr(face.rings)}" fill="${face.fill}" fill-rule="evenodd" fill-opacity="${face.opacity.toFixed(3)}" stroke="${face.stroke}" stroke-width="0.45"/>`;
    }
    return `<polygon points="${pointsAttr(face.points)}" fill="${face.fill}" fill-opacity="${face.opacity.toFixed(3)}" stroke="${face.stroke}" stroke-width="0.45"/>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#eef2f4"/>
  <g stroke="#cbd3d8" stroke-width="0.55" opacity="0.75">${gridSvg}</g>
  <g stroke-linejoin="round" stroke-linecap="round">${facesSvg}</g>
  <rect x="0" y="0" width="${width}" height="${titleHeight}" fill="#f8fafb" stroke="#9ba9b2"/>
  <text x="24" y="28" fill="#1d2930" font-family="Arial, sans-serif" font-size="19" font-weight="700">${xmlEscape(fixture.name)}</text>
  <text x="24" y="49" fill="#52636d" font-family="Arial, sans-serif" font-size="12">${xmlEscape(subtitle)}</text>
</svg>`;
}

function renderFloorplanSvg() {
  const width = 1000;
  const height = 760;
  const titleHeight = 72;
  const layers = [
    { key: 'slab', features: [planRep.shell], fill: '#f7f9fa', stroke: '#26343d', strokeWidth: 2.4 },
    { key: 'rooms', features: planModel.rooms, fill: '#dbe7ee', stroke: '#8fa3ae', strokeWidth: 0.7 },
    { key: 'corridors', features: planModel.corridors, fill: '#e8dcc1', stroke: '#b5a37e', strokeWidth: 0.8 },
    { key: 'core', features: [planCore], fill: '#8c989f', stroke: '#47545c', strokeWidth: 1.4 },
    { key: 'elevators', features: planLifts, fill: '#68a9cf', stroke: '#275f80', strokeWidth: 1.1 },
    { key: 'stairs', features: [planStair], fill: '#a9825b', stroke: '#62482f', strokeWidth: 1.1 },
    { key: 'walls', features: planModel.walls, fill: '#35434b', stroke: '#26343d', strokeWidth: 0.45 }
  ];
  const coordinates = [];
  layers.forEach(layer => layer.features.filter(Boolean).forEach(feature => {
    geometryPolygons(feature.geometry).forEach(polygon => polygon.forEach(ring => ring.forEach(coord => coordinates.push(coord))));
  }));
  const centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / Math.max(1, coordinates.length);
  const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / Math.max(1, coordinates.length);
  const lonScale = 111320 * Math.cos(centerLat * Math.PI / 180);
  const local = coord => ({ x: (coord[0] - centerLng) * lonScale, y: (coord[1] - centerLat) * 110540 });
  const localPoints = coordinates.map(local);
  const bounds = localPoints.reduce((result, point) => ({
    minX: Math.min(result.minX, point.x), maxX: Math.max(result.maxX, point.x),
    minY: Math.min(result.minY, point.y), maxY: Math.max(result.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const plot = { x: 54, y: titleHeight + 28, width: width - 108, height: height - titleHeight - 86 };
  const scale = Math.min(
    plot.width / Math.max(1, bounds.maxX - bounds.minX),
    plot.height / Math.max(1, bounds.maxY - bounds.minY)
  );
  const padX = (plot.width - (bounds.maxX - bounds.minX) * scale) / 2;
  const padY = (plot.height - (bounds.maxY - bounds.minY) * scale) / 2;
  const screen = coord => {
    const point = local(coord);
    return {
      x: plot.x + padX + (point.x - bounds.minX) * scale,
      y: plot.y + padY + (bounds.maxY - point.y) * scale
    };
  };
  const pathFor = feature => geometryPolygons(feature.geometry).map(polygon => polygon.map(ring => {
    const points = ring.map(screen);
    return points.length ? `M${points.map(point => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join('L')}Z` : '';
  }).join('')).join('');
  const roomPalette = {
    office: '#d8e8f1', meeting: '#dce8dd', support: '#e7dfd2', residential: '#e4dfec',
    bedroom: '#e2deec', living: '#dce9df', retail: '#eadfcf', warehouse: '#dde2e4', partition: '#dbe7ee'
  };
  const shapes = layers.map(layer => layer.features.filter(feature => feature && feature.geometry).map(feature => {
    const roomType = feature.properties && feature.properties.roomType;
    const fill = layer.key === 'rooms' && roomPalette[roomType] ? roomPalette[roomType] : layer.fill;
    return `<path d="${pathFor(feature)}" fill="${fill}" fill-rule="evenodd" stroke="${layer.stroke}" stroke-width="${layer.strokeWidth}"/>`;
  }).join('')).join('');
  const labels = [];
  const addLabel = (feature, text, maxCount = Infinity) => {
    if (!feature || !feature.geometry || labels.length >= maxCount) return;
    const anchor = context.turf.pointOnFeature(feature);
    if (!anchor || !anchor.geometry) return;
    const point = screen(anchor.geometry.coordinates);
    labels.push(`<text x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${xmlEscape(text)}</text>`);
  };
  planModel.rooms.slice(0, 18).forEach(room => {
    if (context.turf.area(room) >= 18) addLabel(room, String(room.properties.roomType || 'room').replaceAll('_', ' '));
  });
  addLabel(planStair, 'STAIR');
  planLifts.forEach((lift, index) => addLabel(lift, `L${index + 1}`));
  const area = Math.round(context.turf.area(planRep.shell));
  const subtitle = `Typical floor ${planRep.floorIndex + 1} · commercial program · ${area} m² · 1 stair core · ${planLifts.length} lifts`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#eef2f4"/>
  <g stroke-linejoin="round">${shapes}</g>
  <g fill="#26343d" font-family="Arial, sans-serif" font-size="9" font-weight="700">${labels.join('')}</g>
  <rect x="0" y="0" width="${width}" height="${titleHeight}" fill="#f8fafb" stroke="#9ba9b2"/>
  <text x="24" y="29" fill="#1d2930" font-family="Arial, sans-serif" font-size="19" font-weight="700">Coordinated View Overlay Floorplan</text>
  <text x="24" y="51" fill="#52636d" font-family="Arial, sans-serif" font-size="12">${xmlEscape(subtitle)}</text>
  <g transform="translate(700 18)" font-family="Arial, sans-serif" font-size="10" fill="#33434c">
    <rect width="12" height="12" fill="#e8dcc1"/><text x="17" y="10">Circulation</text>
    <rect x="90" width="12" height="12" fill="#8c989f"/><text x="107" y="10">Service core</text>
    <rect y="20" width="12" height="12" fill="#a9825b"/><text x="17" y="30">Stair</text>
    <rect x="90" y="20" width="12" height="12" fill="#68a9cf"/><text x="107" y="30">Elevators</text>
  </g>
</svg>`;
}

if (failures.length) {
  console.error('\nExternal fidelity check failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

const renderArgIndex = process.argv.indexOf('--render-dir');
if (renderArgIndex >= 0) {
  const requestedDir = process.argv[renderArgIndex + 1];
  if (!requestedDir) throw new Error('--render-dir requires an output directory');
  const renderDir = path.resolve(root, requestedDir);
  fs.mkdirSync(renderDir, { recursive: true });
  const manifest = [];
  visualFixtures.forEach(fixture => {
    const slug = fixture.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${slug}.svg`;
    fs.writeFileSync(path.join(renderDir, fileName), renderAxonometricSvg(fixture));
    manifest.push({
      name: fixture.name,
      file: fileName,
      buildingType: fixture.cfg.buildingType,
      facadeType: fixture.cfg.facadeType,
      facadeArticulation: fixture.cfg.facadeArticulation,
      roofProfile: fixture.cfg.roofProfile,
      layerCounts: Object.fromEntries(Object.entries(fixture.geometry).map(([layer, collection]) => [layer, (collection.features || []).length]))
    });
  });
  advancedPresetFixtures.forEach(fixture => {
    const slug = `candidate-${fixture.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const fileName = `${slug}.svg`;
    fs.writeFileSync(path.join(renderDir, fileName), renderAxonometricSvg(fixture));
    manifest.push({
      name: fixture.name,
      file: fileName,
      collection: 'advanced-candidate',
      buildingType: fixture.cfg.buildingType,
      facadeType: fixture.cfg.facadeType,
      facadeArticulation: fixture.cfg.facadeArticulation,
      roofProfile: fixture.cfg.roofProfile,
      layerCounts: Object.fromEntries(Object.entries(fixture.geometry).map(([layer, collection]) => [layer, (collection.features || []).length]))
    });
  });
  const floorplanFile = 'coordinated-view-overlay-floorplan.svg';
  fs.writeFileSync(path.join(renderDir, floorplanFile), renderFloorplanSvg());
  manifest.push({
    name: 'Coordinated View Overlay Floorplan',
    file: floorplanFile,
    floor: planRep.floorIndex + 1,
    program: 'commercial',
    roomCount: planModel.rooms.length,
    liftCount: planLifts.length,
    stairCount: planStair ? 1 : 0
  });
  fs.writeFileSync(path.join(renderDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${visualFixtures.length} regression renders, ${advancedPresetFixtures.length} candidate renders, and 1 coordinated floorplan to ${renderDir}`);
}

console.log(`\nExternal fidelity check passed (${cases.length} geometry scenarios, ${presets.presets.length} presets).`);
