#!/usr/bin/env node
/* Famous-building presets: 25 uploadable files (10 skyscrapers, 15 low- and mid-rise),
   each "in the style of" a real building. Every spec starts from the closest preset in
   presets/defaults.json, so each file carries the complete configuration contract, then
   applies a palette and the overrides that make the silhouette and facade recognisable.
   The footprint still comes from the map, so proportions follow the site you pick.
   Run: node scripts/build_famous_presets.mjs  ->  presets/famous/*.json
   Load one with Editor menu > Presets > Import preset. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'presets/defaults.json'), 'utf8')).presets;
const OUT = path.join(ROOT, 'presets/famous');

const baseConfig = name => {
  const found = library.find(p => p.name === name);
  if (!found) throw new Error(`base preset not found: ${name}`);
  return structuredClone(found.config);
};

/* One palette sets every colour key, so frames, trim and podium stay in one material family. */
function palette({ wall, trim, glass, frame, base, roof, accent }) {
  const out = {};
  const set = (keys, value) => { if (value) keys.forEach(k => { out[k] = value; }); };
  set(['wallColor', 'pierColor', 'slabColor', 'zoneTopColor', 'volumeColorC'], wall);
  set(['bCol', 'sCol', 'trimColor', 'corniceCol', 'parapetCol', 'podiumCapColor', 'podiumCanopyColor',
    'podiumLobbyWallColor', 'facadeArticulationColor', 'ribColor', 'balCol', 'penthouseCol', 'roofAccentCol',
    'exoColor', 'weaveColor'], trim);
  set(['windowColor', 'podiumGlassColor', 'podiumDoorColor'], glass);
  set(['mullionCol', 'podiumFrameColor', 'podiumDoorFrameColor', 'railCol', 'slotColor', 'spireColor',
    'pillarColor', 'zoneBaseFrame', 'zoneTopFrame', 'stairRailingColor'], frame);
  set(['podCol', 'zoneBaseColor'], base);
  set(['roofCol'], roof);
  set(['accentColor', 'volumeColorB'], accent);
  return out;
}

const SKY = 'Famous skyscrapers';
const LOW = 'Famous low- and mid-rise';

const SPECS = [
  /* ---------------- skyscrapers ---------------- */
  {
    name: 'Art Deco Setback Supertall (Empire State style)', category: SKY, base: 'Art Deco Brick Setback Tower',
    description: 'Indiana limestone piers with aluminium spandrels rising 86 floors through the classic setback sequence: a five-storey base, steps at the 26th and 31st floors, two more near the top, then a lantern crown and a mooring mast. Best on a near-square site of about 55 x 55 m.',
    palette: { wall: '#cfc7b6', trim: '#bdb4a1', glass: '#36424b', frame: '#a9aba6', base: '#c9c0ac', roof: '#4b4a46', accent: '#8f9294' },
    config: {
      floors: 86, F: 3.73, wallTex: 'wall-limestone', windowStyle: 'bay', muntinPattern: 'one-over-one',
      bayGrid: true, bayWidth: 1.9, pierWidth: 0.45, pierProjection: 0.18, glassRecess: 0.2, lightsPerBay: 1,
      accentPanels: 'spandrel', accentDensity: 0.6,
      podF: 5, podOut: 0.4, podiumStyle: 'stone-portal', podiumGroundFlrHt: 6,
      sb1Floor: 6, sb1Depth: 8, sb1Faces: 'all', sb2Floor: 26, sb2Depth: 3.5, sb2Faces: 'all', sb3Floor: 31, sb3Depth: 3, sb3Faces: 'all',
      tierEvery: 9, tierStart: 72, tierCount: 2, tierDepth: 3, tierFaces: 'all',
      roofProfile: 'crown', crownStyle: 'lantern', crownFloors: 3,
      enableSpire: true, spireHeight: 62, spireWidth: 3.2, spireColor: '#c9cbc8',
      corniceH: 0.4, corniceOut: 0.25, mechEvery: 0
    }
  },
  {
    name: 'Stainless Crown Deco Tower (Chrysler style)', category: SKY, base: 'Art Deco Brick Setback Tower',
    description: 'White and grey brick with dark spandrel stripes, setbacks at the 16th, 24th and 31st floors, and a crown that steps in tight terraces before a needle spire in polished stainless steel. Best on a 60 x 50 m corner site.',
    palette: { wall: '#dedad1', trim: '#c9c5bb', glass: '#2c343a', frame: '#9ea3a6', base: '#d0cbc0', roof: '#5b5f62', accent: '#2f3236' },
    config: {
      floors: 77, F: 3.6, wallTex: 'wall-brick-charcoal', windowStyle: 'bay', muntinPattern: 'one-over-one',
      accentPanels: 'spandrel', accentDensity: 0.55,
      podF: 4, podiumStyle: 'stone-portal', podiumGroundFlrHt: 6.5,
      sb1Floor: 16, sb1Depth: 6, sb1Faces: 'all', sb2Floor: 24, sb2Depth: 3, sb2Faces: 'all', sb3Floor: 31, sb3Depth: 2.5, sb3Faces: 'all',
      tierEvery: 2, tierStart: 63, tierCount: 6, tierDepth: 1.3, tierFaces: 'all',
      roofProfile: 'crown', crownStyle: 'stepped', crownFloors: 4,
      enableSpire: true, spireHeight: 56, spireWidth: 1.2, spireColor: '#dde1e3',
      ribColor: '#dde1e3', corniceH: 0.3, corniceOut: 0.2
    }
  },
  {
    name: 'Bronze I-Beam Tower on a Plaza (Seagram style)', category: SKY, base: 'Bronze Rainscreen Exchange',
    description: "Mies van der Rohe's bronze tower: 38 floors of topaz-tinted glass framed by bronze I-beam mullions, set behind a deep plaza on a colonnade of bronze-clad columns, with a louvred plant floor as the cap. No setbacks. Best on a 45 x 27 m slab.",
    palette: { wall: '#4d3e31', trim: '#5c4a39', glass: '#6a6158', frame: '#42342a', base: '#d8cfbf', roof: '#3a332d', accent: '#4d3e31' },
    config: {
      floors: 38, F: 4.1, windowStyle: 'ribbon', facadeArticulation: 'vertical-fins', facadeArticulationDensity: 4,
      facadeArticulationDepth: 0.22, facadeArticulationWidth: 0.07, enableRibs: true, ribCount: 4, ribDepth: 0.22, ribWidth: 0.07,
      mullionV: 3, mullionH: 1, separatorStyle: 'spandrel-band', separatorEvery: 1,
      podF: 1, podOut: 0, podiumStyle: 'civic-colonnade', podiumGroundFlrHt: 7.2, podiumWinRatio: 0.9,
      sb1Floor: 0, sb2Floor: 0, sb3Floor: 0,
      roofProfile: 'mechanical', penthouseScale: 0.8, parapetH: 1.4, overallRoundness: 0
    }
  },
  {
    name: 'Stacked Pagoda Supertall (Taipei 101 style)', category: SKY, base: 'Spiral Setback Supertall (Burj Khalifa style)',
    description: 'Blue-green glass in eight-floor modules stacked like pagoda segments above a tall base, each joint marked by a dark band, finished with a stepped lantern and a long pinnacle. Square plan with notched corners. Best on a 60 x 60 m site.',
    palette: { wall: '#4f7c72', trim: '#6f948a', glass: '#2d5650', frame: '#3b5e57', base: '#8a958c', roof: '#2b3a37', accent: '#22312e' },
    config: {
      floors: 101, F: 4.2, taperMode: 'none', taper: 0, overallRoundness: 0.6, facadeArticulation: 'none', enableRibs: false,
      windowStyle: 'ribbon', separatorStyle: 'slab-edge', separatorEvery: 1,
      tierEvery: 8, tierStart: 27, tierCount: 9, tierDepth: 1, tierFaces: 'all',
      mechEvery: 8, podF: 5, podiumStyle: 'civic-colonnade',
      roofProfile: 'crown', crownStyle: 'lantern', crownFloors: 4,
      enableSpire: true, spireHeight: 60, spireWidth: 2.4, spireColor: '#9aa9a4'
    }
  },
  {
    name: 'Twisting Glass Spiral (Shanghai Tower style)', category: SKY, base: 'Twisting White-Band Tower',
    description: 'A rounded glass tower that tapers and rotates as it rises, with sky-lobby bands roughly every 14 floors and a sloped crown. The twist runs to the generator maximum of 90 degrees. Best on a round or triangular site of about 70 m across.',
    palette: { wall: '#b3c7cf', trim: '#d2dde1', glass: '#6d8d9a', frame: '#9fb0b7', base: '#9aaab0', roof: '#4c5d65', accent: '#7f949c' },
    config: {
      floors: 110, F: 4.3, taperMode: 'cont', taper: -0.45, planTwist: 90, overallRoundness: 5,
      windowStyle: 'ribbon', separatorStyle: 'slab-edge', separatorEvery: 1, mechEvery: 14,
      roofProfile: 'tapered', roofTaperStartFloor: 102, roofTaperStep: -0.04,
      podF: 4, podiumStyle: 'sculpted-glass', enableSpire: false
    }
  },
  {
    name: 'Fluted Steel Twin-Tower Half (Petronas style)', category: SKY, base: 'Fluted Crystal Spire',
    description: 'One of the twins: stainless-steel and glass bands wrapped round a lobed, near-circular plan, stepping in six times toward the top before a long pinnacle. Draw two footprints in multi-building mode for the pair. Best on a 50 m round site.',
    palette: { wall: '#c6cacc', trim: '#dadddf', glass: '#5c717c', frame: '#a9aeb1', base: '#b9bec0', roof: '#4a5257', accent: '#8e9599' },
    config: {
      floors: 88, F: 4, taperMode: 'none', taper: 0, overallRoundness: 4, wallTex: 'wall-metal-brushed',
      windowStyle: 'ribbon', separatorStyle: 'spandrel-band', separatorEvery: 1,
      enableRibs: true, ribCount: 8, ribDepth: 0.4, facadeArticulation: 'vertical-fins', facadeArticulationDensity: 6,
      tierEvery: 5, tierStart: 60, tierCount: 6, tierDepth: 1.6, tierFaces: 'all',
      roofProfile: 'tapered', roofTaperStartFloor: 82, roofTaperStep: -0.06,
      enableSpire: true, spireHeight: 73, spireWidth: 2.6, spireColor: '#d4d8da', podF: 4
    }
  },
  {
    name: 'X-Braced Black Tapered Tower (John Hancock Center style)', category: SKY, base: 'Bundled-Tube Black Tower (Willis style)',
    description: 'A 100-floor tower in black anodised aluminium and bronze glass that narrows steadily from base to roof, with giant exposed X-braces on every face and twin masts. Best on a 50 x 80 m rectangle.',
    palette: { wall: '#1e2022', trim: '#26292b', glass: '#3a3e40', frame: '#151718', base: '#2a2d2f', roof: '#141516', accent: '#1e2022' },
    config: {
      floors: 100, F: 3.44, taperMode: 'cont', taper: -0.4, overallRoundness: 0,
      windowStyle: 'ribbon', facadeArticulation: 'lattice', facadeArticulationDensity: 1.5,
      exoType: 'lattice', exoSize: 0.9, exoOffset: 0.5, exoDensity: 1, exoColor: '#191b1c',
      sb1Floor: 0, sb2Floor: 0, sb3Floor: 0, mechEvery: 0,
      roofProfile: 'standard', enableSpire: true, spireHeight: 100, spireWidth: 1.4, spireColor: '#3b3e40', podF: 2
    }
  },
  {
    name: 'White Quartz Pyramid (Transamerica style)', category: SKY, base: 'Precast Ribbon-Window Office Park',
    description: 'A white precast pyramid of 48 floors with tall punched windows, narrowing steadily from the first floor to a slim aluminium-clad spire, on a base of sloping columns. Best on a 50 x 50 m square.',
    palette: { wall: '#ebe8e1', trim: '#f2f0ea', glass: '#3c4850', frame: '#c9c7c0', base: '#dedbd3', roof: '#9a9c9a', accent: '#d8d5cd' },
    config: {
      buildingType: 'office', facadeType: 'heavy-concrete', floors: 48, F: 4.05, wallTex: 'wall-concrete-cast',
      windowStyle: 'punched', windowProportion: 'tall', windowWidth: 1.1, windowSpacing: 1.6,
      roofProfile: 'tapered', roofTaperStartFloor: 1, roofTaperStep: -0.028,
      enableSpire: true, spireHeight: 64, spireWidth: 4, spireColor: '#d7d9d8',
      podF: 1, podiumStyle: 'civic-colonnade', podiumGroundFlrHt: 7
    }
  },
  {
    name: 'Shard of Glass Spire (The Shard style)', category: SKY, base: 'Fluted Crystal Spire',
    description: 'Pale low-iron glass planes leaning inward from the ground floor up to a fractured open spire, about 310 m tall. Best on an irregular 55 x 55 m site.',
    palette: { wall: '#bccbd1', trim: '#dfe7ea', glass: '#7e98a2', frame: '#aab7bc', base: '#a8b6bb', roof: '#6b7c83', accent: '#94a6ad' },
    config: {
      floors: 87, F: 3.55, taperMode: 'none', taper: 0, overallRoundness: 0, enableRibs: false, facadeArticulation: 'none',
      windowStyle: 'ribbon', separatorStyle: 'recessed-joint',
      roofProfile: 'tapered', roofTaperStartFloor: 1, roofTaperStep: -0.019,
      enableSpire: true, spireHeight: 28, spireWidth: 7, spireColor: '#b9c8ce', podF: 2
    }
  },
  {
    name: 'Slender Concrete Grid Tower (432 Park Avenue style)', category: SKY, base: 'Brutalist Concrete Slab',
    description: 'A pencil-thin square tower of white concrete framing a uniform grid of 3 m square windows, with open double-height plant floors every 12 storeys. Flat top, no crown. Best on a 28 x 28 m site.',
    palette: { wall: '#e9e7e2', trim: '#efede8', glass: '#2c3338', frame: '#d9d7d1', base: '#dcd9d2', roof: '#bdbab3', accent: '#e9e7e2' },
    config: {
      buildingType: 'residential', floors: 85, F: 5, wallTex: 'wall-concrete-cast',
      windowStyle: 'punched', windowProportion: 'square', windowWidth: 2.9, windowSpacing: 3.6,
      facadeArticulation: 'expressed-frame', exoType: 'none', mechEvery: 12,
      roofProfile: 'standard', crownStyle: 'picture-frame', parapetH: 1.2, podF: 2, podiumStyle: 'stone-portal'
    }
  },

  /* ---------------- low- and mid-rise ---------------- */
  {
    name: 'Beaux-Arts Wedge (Flatiron style)', category: LOW, base: 'Limestone Mansion Block',
    description: 'Twenty-two floors of rusticated limestone and cream terracotta in three parts: a four-storey base, a shaft with gently projecting bays, and a deep crowning cornice. Draw a sharp triangle for the famous prow.',
    palette: { wall: '#d9cbb0', trim: '#cbbb9c', glass: '#3b4448', frame: '#5a4a3a', base: '#cdbfa3', roof: '#4d4943', accent: '#c4b495' },
    config: {
      floors: 22, F: 3.9, wallTex: 'wall-limestone', windowStyle: 'bay', muntinPattern: 'one-over-one', windowHead: 'keystone',
      rusticFloors: 4, podF: 4, orielType: 'canted', orielFaces: 'all', orielEvery: 3, orielFrom: 5, orielTo: 19, orielDepth: 0.35,
      corniceH: 2.2, corniceOut: 1.6, roofProfile: 'standard', sb1Floor: 0
    }
  },
  {
    name: 'Gabled Mansion Apartments (The Dakota style)', category: LOW, base: 'Haussmann Limestone Block',
    description: 'A German Renaissance apartment block in buff brick with sandstone trim and quoins: seven floors under a steep slate roof bristling with dormers, gables and chimneys. Best on a full city-block square.',
    palette: { wall: '#c8b388', trim: '#a4916e', glass: '#2f3a3c', frame: '#4c3f30', base: '#b8a27a', roof: '#56656a', accent: '#9a8763' },
    config: {
      floors: 7, F: 3.9, wallTex: 'wall-brick-red', windowStyle: 'bay', windowHead: 'lintel', muntinPattern: 'one-over-one',
      quoins: true, rusticFloors: 1, balType: 'none', roofProfile: 'mansard', roofPitch: 62, dormers: true, chimneyCount: 6,
      corniceH: 0.8, corniceOut: 0.5
    }
  },
  {
    name: 'Béton Brut Slab on Pilotis (Unité d\'Habitation style)', category: LOW, base: 'Brutalist Concrete Slab',
    description: "Le Corbusier's vertical village: seventeen floors of board-marked concrete brise-soleil with loggias picked out in red, yellow, green and blue, lifted on massive pilotis, with a roof terrace above. Best on a 135 x 25 m slab.",
    palette: { wall: '#a39f95', trim: '#8f8b82', glass: '#3a4146', frame: '#5c5a55', base: '#7d7a73', roof: '#8a867d', accent: '#c4412c' },
    config: {
      floors: 17, F: 3.2, wallTex: 'wall-concrete-boardform', windowStyle: 'punched',
      facadeArticulation: 'expressed-frame', exoType: 'vertical', exoSize: 0.35, exoDensity: 6, pierProjection: 0.7, glassRecess: 0.9,
      accentPanels: 'beside', accentDensity: 0.3,
      podF: 1, podiumStyle: 'civic-colonnade', podiumGroundFlrHt: 8, podOut: 0,
      roofProfile: 'mechanical', penthouseScale: 0.35
    }
  },
  {
    name: 'Glass Curtain Workshop Wing (Bauhaus Dessau style)', category: LOW, base: 'Precast Ribbon-Window Office Park',
    description: 'White render floor edges and a continuous glass curtain wall in a fine black steel grid, over a dark recessed plinth. Three floors, flat roof, no ornament. Best on a 45 x 20 m block.',
    palette: { wall: '#f2f0ea', trim: '#f4f2ed', glass: '#6c7f88', frame: '#1d1f22', base: '#4f4f4c', roof: '#5f605d', accent: '#f2f0ea' },
    config: {
      floors: 3, F: 4.2, facadeType: 'curtain-wall', wallTex: 'wall-stucco-fine', windowStyle: 'ribbon',
      mullionV: 4, mullionH: 2, mullionThick: 0.03, separatorStyle: 'slab-edge', separatorEvery: 1,
      podF: 1, podOut: 0, podiumGroundFlrHt: 2.6, podiumStyle: 'transparent-retail',
      roofProfile: 'standard', parapetH: 0.5, corniceH: 0.2, corniceOut: 0.05
    }
  },
  {
    name: 'Clinker Brick Prow Block (Chilehaus style)', category: LOW, base: 'Brick Warehouse Loft Conversion',
    description: 'Hamburg brick expressionism: dark purple-brown clinker brick drawn into tight vertical piers, white-framed windows, and three upper floors stepping back in turn. Draw a sharp corner for the ship-like prow.',
    palette: { wall: '#5c2f23', trim: '#6b3a2b', glass: '#2b3134', frame: '#ece8de', base: '#4e281e', roof: '#3a3330', accent: '#4a271e' },
    config: {
      buildingType: 'office', floors: 10, F: 3.3, wallTex: 'wall-brick-charcoal', windowStyle: 'bay', muntinPattern: 'six-over-six',
      bayGrid: true, bayWidth: 1.6, pierWidth: 0.45, pierProjection: 0.3,
      sb1Floor: 8, sb1Depth: 1.8, sb1Faces: 'all', sb2Floor: 9, sb2Depth: 1.8, sb2Faces: 'all', sb3Floor: 10, sb3Depth: 1.8, sb3Faces: 'all',
      podF: 1, podiumStyle: 'arcaded-commercial', archFloors: 1, roofProfile: 'standard', corniceH: 0.3, corniceOut: 0.15, waterTower: false
    }
  },
  {
    name: 'Inside-Out Services Tower (Lloyd\'s Building style)', category: LOW, base: 'Mass Timber Mixed-Use',
    description: "Richard Rogers' high-tech: lift and service cores, ducts and frames worn outside in stainless steel, with textured glass between and floors stepping down from fourteen storeys toward the street. Best on a tight 60 x 45 m site.",
    palette: { wall: '#b8bcbe', trim: '#c9cdcf', glass: '#8b9ca4', frame: '#a6abae', base: '#9da2a5', roof: '#6c7174', accent: '#c3c7ca' },
    config: {
      buildingType: 'office', facadeType: 'curtain-wall', floors: 14, F: 4.6, wallTex: 'wall-metal-ribbed', windowStyle: 'ribbon',
      exoType: 'vertical', exoSize: 0.6, exoOffset: 0.8, exoDensity: 3, facadeArticulation: 'expressed-frame',
      separatorStyle: 'slab-edge', separatorEvery: 1,
      sb1Floor: 8, sb1Depth: 4, sb1Faces: 'street', sb2Floor: 11, sb2Depth: 3, sb2Faces: 'street', sb3Floor: 0,
      podF: 1, podiumStyle: 'transparent-retail', roofProfile: 'mechanical', penthouseScale: 0.5
    }
  },
  {
    name: 'Exposed Frame Culture Centre (Centre Pompidou style)', category: LOW, base: 'Mass Timber Mixed-Use',
    description: 'A glass box held inside a white steel exoskeleton, with the services painted by colour code: blue for air, green for water, yellow for electrics and red for circulation. Six very tall floors. Best on a 165 x 60 m block facing a piazza.',
    palette: { wall: '#9eb0b8', trim: '#e9ebec', glass: '#7d8f98', frame: '#e3e6e7', base: '#8a9ba3', roof: '#babfc1', accent: '#2d63b8' },
    config: {
      buildingType: 'mixed-use', facadeType: 'curtain-wall', floors: 6, F: 6, windowStyle: 'ribbon', wallTex: 'none',
      exoType: 'vertical', exoSize: 0.55, exoOffset: 1.2, exoDensity: 8, facadeArticulation: 'expressed-frame',
      enableRibs: true, ribCount: 3, ribDepth: 0.9, ribWidth: 0.5, ribColor: '#c8352d',
      accentPanels: 'beside', accentDensity: 0.4, sb1Floor: 0,
      podF: 1, podiumStyle: 'transparent-retail', podiumGroundFlrHt: 6, roofProfile: 'mechanical', penthouseScale: 0.3
    }
  },
  {
    name: 'Georgian Crescent Terrace (Royal Crescent style)', category: LOW, base: 'Limestone Mansion Block',
    description: 'Honey-coloured Bath stone over a rusticated ground floor, with giant Ionic columns spanning the two floors above, six-over-six sashes, a balustraded parapet and slate roofs with dormers and chimneys. Draw a long arc of terrace houses.',
    palette: { wall: '#d8c292', trim: '#e2cfa2', glass: '#2e3437', frame: '#f1ede2', base: '#cdb684', roof: '#5a6468', accent: '#c9b17f' },
    config: {
      buildingType: 'residential', floors: 3, F: 3.9, wallTex: 'wall-limestone', windowStyle: 'bay', muntinPattern: 'six-over-six',
      windowHead: 'none', rusticFloors: 1, bayGrid: true, bayWidth: 4.2, pierWidth: 0.75, pierProjection: 0.3,
      entryType: 'door', entryEvery: 3, podF: 1, podOut: 0, roofProfile: 'mansard', roofPitch: 55, dormers: true, chimneyCount: 6,
      parapetH: 1, corniceH: 0.7, corniceOut: 0.45, sb1Floor: 0
    }
  },
  {
    name: 'Gabled Canal House (Herengracht style)', category: LOW, base: 'Gabled Stacked Townhouses',
    description: 'A tall, narrow Amsterdam merchant house of dark brick, with white-framed sashes that grow shorter floor by floor, a stoop to the front door and a steep street-facing gable. Draw a plot 7 m wide by 20 m deep.',
    palette: { wall: '#5a3428', trim: '#f2efe8', glass: '#283033', frame: '#f4f1ea', base: '#4c2c22', roof: '#3c3633', accent: '#5a3428' },
    config: {
      buildingType: 'residential', facadeType: 'masonry-punched', floors: 4, F: 3.4, wallTex: 'wall-brick-red',
      windowStyle: 'bay', windowProportion: 'tall', muntinPattern: 'six-over-six', windowHead: 'lintel',
      entryType: 'stoop', entryEvery: 1, roofProfile: 'gable', roofPitch: 58, dormers: true, chimneyCount: 1,
      corniceH: 0.5, corniceOut: 0.3
    }
  },
  {
    name: 'Undulating Stone Quarry (Casa Milà style)', category: LOW, base: 'Fluid Band Residences (Hadid style)',
    description: "Gaudí's La Pedrera: a rolling cream limestone facade with no straight line, deep openings behind wrought-iron balconies, and a roofscape of sculpted chimneys. Six floors. Best on a chamfered Eixample corner.",
    palette: { wall: '#e3d8c4', trim: '#d8ccb5', glass: '#2d3335', frame: '#3a3a35', base: '#d6cab2', roof: '#cfc3ab', accent: '#bfb39c' },
    config: {
      buildingType: 'residential', facadeType: 'masonry-punched', floors: 6, F: 3.4, wallTex: 'wall-limestone',
      windowStyle: 'punched', taperMode: 'none', taper: 0, overallRoundness: 5, separatorStyle: 'flowing-band', bandWave: 2.6,
      balType: 'projecting', balD: 0.9, terraceRail: 'iron', railCol: '#2f302c',
      roofProfile: 'terraced', chimneyCount: 6, podF: 1
    }
  },
  {
    name: 'Brutalist Terrace Block (Barbican style)', category: LOW, base: 'Brutalist Concrete Slab',
    description: 'Bush-hammered concrete with deep continuous balconies and solid concrete parapets, lifted on columns over podium walkways. Eight floors with a planted edge. Best on a long, gently cranked slab.',
    palette: { wall: '#8e8b83', trim: '#9a968d', glass: '#30383c', frame: '#7c7972', base: '#77746d', roof: '#6f6c66', accent: '#5b6a4f' },
    config: {
      floors: 8, F: 3, wallTex: 'wall-concrete-boardform', windowStyle: 'ribbon', facadeArticulation: 'none', exoType: 'none',
      balType: 'perimeter-segmented', balD: 1.6, terraceRail: 'stone',
      podF: 1, podiumStyle: 'civic-colonnade', podiumGroundFlrHt: 6, podOut: 0, roofProfile: 'green'
    }
  },
  {
    name: 'Red Vienna Superblock (Karl-Marx-Hof style)', category: LOW, base: 'Scandinavian Brick Courtyard Block',
    description: 'Interwar social housing: ochre render with terracotta-red projecting bays and loggias, giant arches through the ground floor, and a low hipped roof. Six floors. Best on a very long block.',
    palette: { wall: '#d8b47a', trim: '#e6c992', glass: '#2e3538', frame: '#f0ebe0', base: '#a5432f', roof: '#7b4a39', accent: '#a5432f' },
    config: {
      floors: 6, F: 3.1, wallTex: 'wall-stucco-fine', windowStyle: 'punched', muntinPattern: 'casement-pair',
      accentPanels: 'beside', accentDensity: 0.35, balType: 'alternating', balD: 1.2,
      podF: 1, podiumStyle: 'arcaded-commercial', archFloors: 1, roofProfile: 'hip', roofPitch: 22, dormers: false
    }
  },
  {
    name: 'Sullivan Brick Skyscraper Block (Wainwright style)', category: LOW, base: 'Chicago School Terracotta Office',
    description: "Louis Sullivan's tall office as a column: a two-storey sandstone base, ten floors of continuous red-brick piers over recessed ornamented spandrels, and a deep terracotta frieze and cornice. Best on a 40 x 35 m corner.",
    palette: { wall: '#9a4530', trim: '#8a3c2a', glass: '#2c3336', frame: '#4a2a20', base: '#b59a7b', roof: '#3f3632', accent: '#7a3828' },
    config: {
      floors: 10, F: 3.9, wallTex: 'wall-brick-red', windowStyle: 'bay', bayGrid: true, bayWidth: 1.9, pierWidth: 0.55, pierProjection: 0.25,
      accentPanels: 'spandrel', accentDensity: 0.7, podF: 2, podiumStyle: 'stone-portal',
      zoneEnable: true, zoneTopFloors: 1, zoneTopColor: '#8c3f2d', zoneTopTex: 'facade-ceramic-panel',
      corniceH: 1.8, corniceOut: 1.2, roofProfile: 'standard'
    }
  },
  {
    name: 'White Villa on Pilotis (Villa Savoye style)', category: LOW, base: 'Precast Ribbon-Window Office Park',
    description: "Le Corbusier's five points in one house: a white box with a continuous ribbon window, raised on slender pilotis over a recessed, dark-green glazed ground floor, with a roof garden behind a curved solarium wall. Best on a 20 x 20 m square.",
    palette: { wall: '#f3f1ec', trim: '#f6f4ef', glass: '#39434a', frame: '#2a2d2f', base: '#3f5a46', roof: '#d9d6cf', accent: '#f3f1ec' },
    config: {
      buildingType: 'residential', facadeType: 'heavy-concrete', floors: 2, F: 3.3, wallTex: 'wall-stucco-fine', windowStyle: 'ribbon',
      podF: 1, podiumStyle: 'civic-colonnade', podiumGroundFlrHt: 3.3, podOut: 0,
      roofProfile: 'mechanical', penthouseScale: 0.4, parapetH: 1, corniceH: 0.15, corniceOut: 0.05
    }
  },
  {
    name: 'Chateau Hotel with Street Arcade (The Ritz London style)', category: LOW, base: 'Haussmann Limestone Block',
    description: 'A French chateau style hotel in pale Portland stone over an arcaded street floor, with balustraded balconies, a strong cornice and a steep green copper mansard full of dormers. Eight floors. Best on a long frontage facing a park.',
    palette: { wall: '#ddd7c8', trim: '#e7e1d3', glass: '#2f383c', frame: '#4b4337', base: '#c9c2b2', roof: '#6d8e80', accent: '#c7c0ae' },
    config: {
      floors: 8, F: 3.5, wallTex: 'wall-limestone', windowStyle: 'bay', windowHead: 'keystone', muntinPattern: 'casement-pair',
      podF: 1, podiumStyle: 'arcaded-commercial', archFloors: 1, rusticFloors: 1, balType: 'wrap',
      roofProfile: 'mansard', roofPitch: 64, dormers: true, chimneyCount: 4, corniceH: 1.2, corniceOut: 0.8
    }
  }
];

const slug = s => s.toLowerCase().replace(/\(([^)]*) style\)/, '$1').normalize('NFKD').replace(/[^\w\s-]/g, '')
  .trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

fs.mkdirSync(OUT, { recursive: true });
let sky = 0;
for (const spec of SPECS) {
  const config = Object.assign(baseConfig(spec.base), palette(spec.palette), spec.config);
  const file = path.join(OUT, `${slug(spec.name)}.json`);
  fs.writeFileSync(file, JSON.stringify({ schema: 1, name: spec.name, category: spec.category, description: spec.description, config }, null, 2) + '\n');
  if (spec.category === SKY) sky++;
}
console.log(`Wrote ${SPECS.length} presets (${sky} skyscrapers) to ${path.relative(ROOT, OUT)}/`);
