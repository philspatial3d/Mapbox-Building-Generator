#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const app = fs.readFileSync(path.join(rootDir, 'app.html'), 'utf8');
const ar = fs.readFileSync(path.join(rootDir, 'ar.html'), 'utf8');

function includesAll(source, values, label) {
  values.forEach(value => assert.ok(source.includes(value), `${label}: missing ${value}`));
}

assert.match(app, /const AR_PAYLOAD_SCHEMA_VERSION = 2;/, 'AR payload schema must be version 2');
includesAll(app, [
  "'podiumGlass'", "'podiumFrames'", "'podiumDoors'", "'podiumCanopies'", "'podiumLobby'", "'podiumCap'",
  "'floorSlabs'", "'interiorWalls'", "'elevatorShafts'", "'elevators'", "'stairs'"
], 'AR export layers');
includesAll(app, [
  'buildArContextBuildings(site)',
  "map.querySourceFeatures('composite', { sourceLayer: 'building' })",
  'AR_CONTEXT_RADIUS_M = 500',
  'styles: getExportLayerStyles(config)',
  'config,',
  'context: buildArContextBuildings(site)'
], 'AR payload fidelity contract');
assert.match(app, /Object\.entries\(props\)\.forEach/, 'AR export must preserve scalar feature metadata');
assert.equal((app.match(/buildCurrentArPayload\(site, cfgSnapshot\)/g) || []).length, 2, 'web AR paths must share the current payload builder');
assert.match(app, /<button id="openAR" type="button">Open AR Viewer<\/button>/, 'web AR entry point must remain visible in exports');
assert.match(app, /<div id="export3dRow">/, '3D format export row must remain visible');
assert.match(app, /<button id="downloadBulk3D" type="button">Bulk GLB<\/button>/, 'bulk GLB export must remain visible');
assert.match(app, /id="viewOptAr"[^>]+data-view-option="ar"/, 'AR must remain available in the top view menu');
assert.match(app, /option === 'ar'[\s\S]{0,100}openCurrentBuildingInAr\(\)/, 'top AR shortcut must open the upgraded web AR viewer');

includesAll(ar, [
  'three@0.185.1',
  'mergeGeometries',
  'XREstimatedLight',
  "'anchors'", "'hit-test'", "'light-estimation'", "'depth-sensing'",
  'getDepthSensingMesh',
  'colorWrite: false',
  'maybeCreateXrAnchor(frame)',
  'weightedFilteredLocation',
  'mbg_ar_calibration_',
  'DEFAULT_MODEL_VERTICAL_OFFSET_M = 0',
  'createContactShadow',
  'MeshPhysicalMaterial',
  'updateAdaptiveQuality',
  'updateDetailVisibility',
  'rebuildSkyEnvironment',
  'normalMap',
  'buildInteriorGroup'
], 'AR renderer capability');

assert.doesNotMatch(ar, /DEFAULT_MODEL_VERTICAL_OFFSET_M = -12/, 'AR must not retain the hidden -12m baseline shift');
assert.doesNotMatch(ar, /INITIAL_MODEL_PUSH_AWAY_M/, 'field placement must not retain an implicit camera-relative push');
assert.match(ar, /option value="complete">Exterior \+ interior/, 'AR must expose the current interior systems intentionally');
assert.match(ar, /option value="high">High fidelity/, 'AR must expose an explicit high-fidelity mode');
assert.match(ar, /powerPreference: 'high-performance'/, 'renderer must request the high-performance GPU path');
assert.match(ar, /shadowMap\.type = THREE\.PCFSoftShadowMap/, 'AR must use filtered realtime shadows');

/* Stabilisation: heading is seeded from the compass, then locked to the gyroscope. */
includesAll(ar, [
  'HEADING_ACQUIRE_MS',
  'HEADING_OUTLIER_DEG',
  'robustOffsetDeg',
  'pushHeadingSample',
  'state.headingLocked',
  'updateOverlayCameraPose',
  'VIDEO_LATENCY_MS',
  'POSE_FILTER_MIN_CUTOFF_HZ',
  'captureStablePoseLock',
  'onDeviceMotion',
  "event.type === 'deviceorientationabsolute'",
  'estimateCameraVerticalFovDeg',
  'quickLock',
  'headingTrimDeg',
  'anchorTargetLoc'
], 'camera-overlay stabilization contract');
assert.match(ar, /if \(state\.headingLocked\) \{[\s\S]{0,200}return;/, 'a locked heading must ignore further compass samples for pose');
assert.doesNotMatch(ar, /state\.fixedPosition = !state\.fixedPosition/, 'parcel lock must not accidentally toggle back into live GPS drift');

/* Calm, warm lighting */
assert.match(ar, /toneMapping = THREE\.NeutralToneMapping/, 'AR must use hue-preserving tone mapping (no white glare)');
assert.match(ar, /toneMappingExposure = clamp\(0\.7 \+ sceneLuma \* 0\.36, 0\.68, 0\.96\)/, 'camera-matched exposure must stay restrained');
assert.match(ar, /kelvinToColor\(state\.sunKelvin/, 'sun colour must follow the solar colour temperature');

/* Occlusion */
includesAll(ar, ['rebuildOccluders', 'fetchViewerContextTiles', 'CONTEXT_VIEWER_CLEARANCE_M', 'ringContainsXY'], 'occlusion contract');
/* Urban context: visible masses around the site at load, sight-line corridor once located. */
includesAll(ar, [
  'contextTilePlan', 'clipRingToTile', 'tileSeamsLocal', 'overlapsSiteFootprint', 'contentViewerXY',
  'appendContextMass', 'updateContextFade', 'CONTEXT_MAX_TILES', 'CONTEXT_MODE_STORAGE_KEY',
  'id="contextMode"', 'id="contextChip"', 'void fetchViewerContextTiles();'
], 'urban context contract');
assert.match(ar, /option value="massing" selected>Massing \(solid\)/, 'context masses are visible by default');
assert.match(ar, /option value="outlines">Outlines \(align to street\)/, 'context outlines are available for street alignment');
assert.match(ar, /@media \(max-width: 520px\)[\s\S]*#panel \{ max-height: min\(50vh, 520px\); \}/, 'phone panel keeps half the camera view clear');
includesAll(app, ['buildArInteriorPayload', 'interior: buildArInteriorPayload(config)'], 'AR interior payload');

console.log('AR fidelity contract checks passed.');
