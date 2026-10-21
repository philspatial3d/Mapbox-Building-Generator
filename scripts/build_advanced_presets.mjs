#!/usr/bin/env node
/* Curated preset library: 37 buildings, written as direct, named typologies rather
   than abstract variations, and balanced toward the city that actually exists (low-rise
   and masonry first, glass towers as the minority), plus ultra-modern, office and
   contemporary residential types after Foster + Partners, SOM and the Gulf. Each spec overrides BASE, which
   carries the complete configuration contract so every preset populates every field.
   Run: node scripts/build_advanced_presets.mjs  ->  presets/defaults.json */
import fs from 'node:fs';

const BASE = {
  "buildingType": "masonry-midrise",
  "facadeType": "masonry-punched",
  "viewTransparency": "balanced",
  "floors": 11,
  "F": 3.5,
  "taperMode": "none",
  "taper": 0,
  "stepEvery": 6,
  "stepFactor": 0,
  "windowStyle": "bay",
  "windowSpacing": 1.9,
  "windowWidth": 1.35,
  "windowProportion": "tall",
  "facadeAlpha": 1,
  "wallColor": "#d6cbb5",
  "wallTex": "wall-limestone",
  "windowAlpha": 1,
  "windowColor": "#54666c",
  "wnw": 1,
  "bW": 0.16,
  "bCol": "#e6dece",
  "mullionV": 1,
  "mullionH": 0,
  "mullionThick": 0.035,
  "mullionCol": "#5a4938",
  "facadeArticulation": "none",
  "facadeArticulationDensity": 1,
  "panelModuleWidth": 1.8,
  "facadeArticulationDepth": 0.12,
  "facadeArticulationWidth": 0.08,
  "facadeArticulationColor": "#b9aa8f",
  "facadePatternMode": "calm",
  "facadeSeed": 2145,
  "facadeClimateMode": "temperate-office",
  "facadeLightMode": "crisp-tectonic",
  "enablePanelization": false,
  "panelModuleFamily": "balanced",
  "panelOrientationMode": "auto",
  "panelJointMm": 13,
  "separatorStyle": "belt-course",
  "separatorEvery": 3,
  "sH": 0.3,
  "sW": 0.16,
  "sCol": "#c8bca4",
  "balD": 0,
  "balN": 4,
  "balCol": "#e0d7c6",
  "balWidthRatio": 0.55,
  "balSlabH": 0.22,
  "railH": 1.05,
  "railThick": 0.07,
  "railCol": "#5a4938",
  "podF": 2,
  "podOut": 0.6,
  "podCol": "#c5b79e",
  "podA": 0.92,
  "podiumStyle": "stone-portal",
  "podiumSpecialGroundFloor": true,
  "podiumGroundFlrHt": 5.2,
  "podiumUpperFloorHt": 3.8,
  "podiumBaseHeight": 0.55,
  "podiumWinRatio": 0.6,
  "podiumBayWidth": 4.2,
  "podiumPierWidth": 0.62,
  "podiumGlassColor": "#54666c",
  "podiumFrameColor": "#5a4938",
  "podiumCapDepth": 0.5,
  "podiumCapColor": "#b9aa8f",
  "podiumEntranceSide": "auto",
  "podiumEntranceStyle": "framed",
  "podiumEntranceWidth": 6.2,
  "podiumEntranceHeight": 4.5,
  "podiumEntranceOffset": 0,
  "podiumEntranceRecess": 1.5,
  "podiumDoorStyle": "revolving",
  "podiumDoorCount": 4,
  "podiumDoorHeight": 2.8,
  "podiumDoorColor": "#54666c",
  "podiumDoorFrameColor": "#5a4938",
  "podiumCanopyStyle": "framed",
  "podiumCanopyDepth": 1.5,
  "podiumCanopyThickness": 0.26,
  "podiumCanopyColor": "#b9aa8f",
  "podiumLobbyDepth": 8,
  "podiumLobbyFloorColor": "#e6dece",
  "podiumLobbyWallColor": "#b9aa8f",
  "roofProfile": "standard",
  "roofTaperStartFloor": 32,
  "roofTaperStep": -0.025,
  "roofSlabH": 0.42,
  "roofCol": "#3f3c38",
  "roofTex": "roof-bitumen-dark",
  "roofAccentCol": "#b9aa8f",
  "parapetH": 1,
  "parapetThick": 0.4,
  "parapetCol": "#cdc2ab",
  "penthouseF": 1,
  "penthouseScale": 0.74,
  "penthouseCol": "#cfc6b3",
  "corniceH": 0.95,
  "corniceOut": 0.7,
  "corniceCol": "#b9aa8f",
  "enableSpire": false,
  "spireHeight": 28,
  "spireWidth": 1.8,
  "spireColor": "#5a4938",
  "enableRibs": false,
  "ribCount": 0,
  "ribDepth": 0.12,
  "ribWidth": 0.08,
  "ribColor": "#b9aa8f",
  "enableSlabs": false,
  "slabThick": 0.24,
  "slabColor": "#d6cbb5",
  "enablePillars": false,
  "pillarSize": 0.55,
  "pillarRows": 3,
  "pillarCols": 3,
  "pillarColor": "#5a4938",
  "enableStairs": false,
  "stairType": "U",
  "stairWidth": 2.2,
  "stairPosition": "central",
  "stairColor": "#8b6a4c",
  "enableStairRailings": false,
  "stairRailingHeight": 1.1,
  "stairRailingColor": "#4e504d",
  "cutStairwell": true,
  "enableElevators": false,
  "elevatorType": "double-bank",
  "elevatorCount": 2,
  "elevatorBanking": "clustered",
  "elevatorCarWidth": 2.1,
  "elevatorCarDepth": 2,
  "elevatorColor": "#687f8c",
  "elevatorShaftColor": "#4e504d",
  "cutElevatorShafts": true,
  "enableFloorplans": false,
  "floorplanStyle": "corridor",
  "intWallThick": 0.18,
  "intWallColor": "#525d63",
  "corridorWidth": 2,
  "overallRoundness": 0,
  "exoType": "none",
  "exoSize": 0.08,
  "exoOffset": 0,
  "exoDensity": 1,
  "exoColor": "#b9aa8f",
  "weaveEnable": false,
  "weaveCount": 0,
  "weaveWidth": 0,
  "weaveSpan": 0,
  "weaveTwist": 0,
  "weaveWave": 0,
  "weaveCycles": 0,
  "weaveInset": 0,
  "weaveAlpha": 0,
  "weaveColor": "#b9aa8f",
  "balType": "none",
  "sb1Floor": 0,
  "sb1Depth": 3,
  "sb1Faces": "all",
  "sb2Floor": 0,
  "sb2Depth": 2.5,
  "sb2Faces": "all",
  "sb3Floor": 0,
  "sb3Depth": 2,
  "sb3Faces": "all",
  "setbackTerraces": true,
  "bayGrid": true,
  "bayWidth": 2.9,
  "pierWidth": 0.6,
  "pierProjection": 0.14,
  "glassRecess": 0.24,
  "lightsPerBay": 3,
  "transomHeight": 2.1,
  "groupFloors": 1,
  "pierColor": "#d6cbb5",
  "zoneEnable": false,
  "zoneBaseFloors": 2,
  "zoneBaseColor": "#9a9282",
  "zoneBaseTex": "none",
  "zoneBaseFrame": "#5a4938",
  "zoneTopFloors": 3,
  "zoneTopColor": "#ddd3c1",
  "zoneTopTex": "none",
  "zoneTopFrame": "#5a4938",
  "volumeCount": "none",
  "volumeColorB": "#7c7669",
  "volumeTexB": "none",
  "volumeColorC": "#ded5c4",
  "volumeTexC": "none",
  "slotWidth": 1.8,
  "slotDepth": 0.9,
  "slotColor": "#5a4938",
  "accentPanels": "none",
  "accentColor": "#8b8476",
  "accentDensity": 0.35,
  "crownStyle": "crenellated",
  "crownFloors": 2,
  "terraceRail": "glass",
  "groundFloorHt": 0,
  "raisedGround": 0,
  "planTwist": 0,
  "planSway": 0,
  "swayPeriod": 40,
  "muntinPattern": "none",
  "windowHead": "none",
  "archFloors": 0,
  "rusticFloors": 0,
  "quoins": false,
  "trimColor": "#d9d0bd",
  "orielType": "none",
  "orielEvery": 2,
  "orielDepth": 0.7,
  "orielFaces": "street",
  "orielFrom": 1,
  "orielTo": 0,
  "entryType": "none",
  "entryEvery": 2,
  "doorColor": "#2f2a26",
  "roofPitch": 35,
  "roofOverhang": 0.35,
  "dormers": false,
  "chimneyCount": 0,
  "waterTower": false,
  "bandWave": 0.9,
  "tierEvery": 0,
  "tierStart": 20,
  "tierDepth": 2,
  "tierCount": 4,
  "tierFaces": "all",
  "mechEvery": 0
};

/* Generated by hand from the previous library: kept glass presets, as overrides of BASE. */
const KEPT = {
  "Setback Crown Office Tower": {
    "description": "A vertically ordered commercial tower in champagne metal and glass. The street face steps back at the 27th floor, two more all-round setbacks follow with planted terraces behind glass rails, and stepped piers rise two storeys past the roof to screen the plant, over a three-level mineral podium.",
    "materialSystem": "champagne-smoked",
    "config": {
      "buildingType": "office",
      "facadeType": "panelized-office",
      "floors": 38,
      "F": 3.9,
      "stepEvery": 7,
      "windowStyle": "ribbon",
      "windowSpacing": 3.2,
      "windowWidth": 1.45,
      "wallColor": "#d5ccb8",
      "wallTex": "wall-metal-brushed",
      "windowColor": "#55666d",
      "bW": 0.06,
      "bCol": "#e8e1d2",
      "mullionV": 3,
      "mullionH": 1,
      "mullionCol": "#a4967a",
      "facadeArticulation": "panel-grid",
      "facadeArticulationDensity": 2,
      "panelModuleWidth": 2.2,
      "facadeArticulationWidth": 0.07,
      "facadeArticulationColor": "#bcae92",
      "enablePanelization": true,
      "panelJointMm": 11,
      "separatorStyle": "slab-edge",
      "separatorEvery": 2,
      "sH": 0.18,
      "sW": 0.11,
      "sCol": "#a4967a",
      "balCol": "#e2dbcc",
      "railCol": "#a4967a",
      "podF": 3,
      "podOut": 1.8,
      "podCol": "#c3b69c",
      "podA": 0.82,
      "podiumGroundFlrHt": 5.6,
      "podiumWinRatio": 0.68,
      "podiumGlassColor": "#55666d",
      "podiumFrameColor": "#a4967a",
      "podiumCapColor": "#bcae92",
      "podiumDoorColor": "#55666d",
      "podiumDoorFrameColor": "#a4967a",
      "podiumCanopyColor": "#bcae92",
      "podiumLobbyFloorColor": "#e8e1d2",
      "podiumLobbyWallColor": "#bcae92",
      "roofProfile": "crown",
      "roofCol": "#3d3b37",
      "roofTex": "roof-sheet-metal",
      "roofAccentCol": "#bcae92",
      "parapetH": 1.2,
      "parapetThick": 0.3,
      "parapetCol": "#a4967a",
      "penthouseScale": 0.5,
      "penthouseCol": "#a4967a",
      "corniceH": 0.25,
      "corniceOut": 0.18,
      "corniceCol": "#bcae92",
      "spireColor": "#a4967a",
      "ribWidth": 0.07,
      "ribColor": "#bcae92",
      "slabColor": "#d5ccb8",
      "pillarColor": "#a4967a",
      "stairWidth": 2.5,
      "stairRailingColor": "#655f55",
      "elevatorCount": 5,
      "elevatorBanking": "split",
      "elevatorColor": "#7694a3",
      "elevatorShaftColor": "#655f55",
      "floorplanStyle": "open",
      "corridorWidth": 2.5,
      "overallRoundness": 0.15,
      "exoSize": 0.07,
      "exoColor": "#bcae92",
      "weaveColor": "#bcae92",
      "sb1Floor": 27,
      "sb1Depth": 3.5,
      "sb1Faces": "street",
      "sb2Floor": 32,
      "sb2Depth": 3,
      "sb3Floor": 36,
      "sb3Depth": 2.5,
      "bayWidth": 3,
      "pierWidth": 0.5,
      "pierProjection": 0.2,
      "glassRecess": 0.3,
      "lightsPerBay": 2,
      "transomHeight": 2.2,
      "pierColor": "#d5ccb8",
      "zoneBaseColor": "#999384",
      "zoneBaseFrame": "#a4967a",
      "zoneTopColor": "#dcd4c3",
      "zoneTopFrame": "#a4967a",
      "volumeColorB": "#7c766b",
      "volumeColorC": "#ddd6c6",
      "slotColor": "#a4967a",
      "accentColor": "#8a8578",
      "crownStyle": "stepped"
    }
  },
  "Fluted Crystal Spire": {
    "description": "A softly radiused glass shaft whose corners are truly rounded on every floor, fluted by close white fins and a fine two-transom mullion grid. The plan contracts continuously toward a tapered crown, and a drummed spire with a slender mast finishes the silhouette.",
    "materialSystem": "blue-green-silver",
    "config": {
      "buildingType": "glass-landmark",
      "facadeType": "curtain-wall",
      "floors": 46,
      "F": 4.1,
      "taperMode": "cont",
      "taper": -0.2,
      "stepEvery": 8,
      "windowStyle": "ribbon",
      "windowSpacing": 3.2,
      "windowWidth": 1.45,
      "wallColor": "#9fb0b6",
      "wallTex": "facade-glass-grid",
      "windowColor": "#4e6e7a",
      "bW": 0.05,
      "bCol": "#d2d9dc",
      "mullionV": 5,
      "mullionH": 2,
      "mullionThick": 0.03,
      "mullionCol": "#a8afb2",
      "facadeArticulation": "vertical-fins",
      "facadeArticulationDensity": 5,
      "facadeArticulationDepth": 0.34,
      "facadeArticulationWidth": 0.07,
      "facadeArticulationColor": "#c2c8ca",
      "panelJointMm": 11,
      "separatorStyle": "recessed-joint",
      "separatorEvery": 1,
      "sH": 0.1,
      "sW": 0.05,
      "sCol": "#a8afb2",
      "balCol": "#d4dadc",
      "railCol": "#a8afb2",
      "podF": 3,
      "podOut": 2.4,
      "podCol": "#8fa0a6",
      "podA": 0.8,
      "podiumStyle": "sculpted-glass",
      "podiumGroundFlrHt": 6.4,
      "podiumUpperFloorHt": 4.4,
      "podiumBaseHeight": 0.3,
      "podiumWinRatio": 0.88,
      "podiumBayWidth": 5.6,
      "podiumPierWidth": 0.2,
      "podiumGlassColor": "#4e6e7a",
      "podiumFrameColor": "#a8afb2",
      "podiumCapDepth": 0.28,
      "podiumCapColor": "#c2c8ca",
      "podiumEntranceStyle": "sculpted",
      "podiumEntranceWidth": 9,
      "podiumEntranceHeight": 5.2,
      "podiumEntranceRecess": 0.8,
      "podiumDoorHeight": 3,
      "podiumDoorColor": "#4e6e7a",
      "podiumDoorFrameColor": "#a8afb2",
      "podiumCanopyStyle": "blade",
      "podiumCanopyDepth": 2.5,
      "podiumCanopyThickness": 0.16,
      "podiumCanopyColor": "#c2c8ca",
      "podiumLobbyDepth": 10,
      "podiumLobbyFloorColor": "#d2d9dc",
      "podiumLobbyWallColor": "#c2c8ca",
      "roofProfile": "tapered",
      "roofTaperStartFloor": 38,
      "roofTaperStep": -0.05,
      "roofCol": "#2f3c42",
      "roofTex": "roof-sheet-metal",
      "roofAccentCol": "#c2c8ca",
      "parapetH": 0.9,
      "parapetThick": 0.3,
      "parapetCol": "#a8afb2",
      "penthouseScale": 0.5,
      "penthouseCol": "#a8afb2",
      "corniceH": 0.16,
      "corniceOut": 0.12,
      "corniceCol": "#c2c8ca",
      "enableSpire": true,
      "spireHeight": 42,
      "spireWidth": 3.2,
      "spireColor": "#a8afb2",
      "enableRibs": true,
      "ribCount": 5,
      "ribDepth": 0.34,
      "ribWidth": 0.07,
      "ribColor": "#c2c8ca",
      "slabColor": "#9fb0b6",
      "pillarColor": "#a8afb2",
      "stairWidth": 2.5,
      "stairRailingColor": "#475862",
      "elevatorCount": 7,
      "elevatorBanking": "split",
      "elevatorColor": "#6c98ae",
      "elevatorShaftColor": "#475862",
      "floorplanStyle": "open",
      "corridorWidth": 2.5,
      "overallRoundness": 3.2,
      "exoSize": 0.07,
      "exoColor": "#c2c8ca",
      "weaveColor": "#c2c8ca",
      "bayGrid": false,
      "bayWidth": 3.3,
      "pierWidth": 0.7,
      "pierProjection": 0.2,
      "glassRecess": 0.3,
      "lightsPerBay": 2,
      "transomHeight": 2.2,
      "pierColor": "#9fb0b6",
      "zoneBaseColor": "#727f83",
      "zoneBaseFrame": "#a8afb2",
      "zoneTopColor": "#aebdc2",
      "zoneTopFrame": "#a8afb2",
      "volumeColorB": "#5c666a",
      "volumeColorC": "#b2c0c5",
      "slotColor": "#a8afb2",
      "accentColor": "#677276"
    }
  },
  "Bronze Rainscreen Exchange": {
    "description": "Patinated bronze rainscreen panels clad the spandrels in equal modules that close cleanly on every facade run, while full-height joints read as mullion caps across deeply recessed ribbon glazing. Measured setbacks every eight floors lead to a screened plant deck with cooling cells.",
    "materialSystem": "bronze-green-glass",
    "config": {
      "buildingType": "office",
      "facadeType": "panelized-office",
      "floors": 32,
      "F": 4,
      "stepEvery": 8,
      "windowStyle": "ribbon",
      "windowSpacing": 3.2,
      "windowWidth": 1.45,
      "wallColor": "#6b5947",
      "wallTex": "wall-metal-brushed",
      "windowColor": "#566c69",
      "bW": 0.07,
      "bCol": "#8a7863",
      "mullionV": 3,
      "mullionH": 1,
      "mullionCol": "#43352a",
      "facadeArticulation": "panel-grid",
      "facadeArticulationDensity": 2,
      "panelModuleWidth": 1.5,
      "facadeArticulationDepth": 0.16,
      "facadeArticulationWidth": 0.06,
      "facadeArticulationColor": "#5c4b3b",
      "enablePanelization": true,
      "panelJointMm": 10,
      "separatorStyle": "recessed-joint",
      "separatorEvery": 1,
      "sH": 0.08,
      "sW": 0.05,
      "sCol": "#43352a",
      "balCol": "#d6cebf",
      "railCol": "#43352a",
      "podF": 3,
      "podOut": 1.4,
      "podCol": "#5f4f40",
      "podA": 0.88,
      "podiumStyle": "transparent-retail",
      "podiumGroundFlrHt": 5.8,
      "podiumUpperFloorHt": 4,
      "podiumBaseHeight": 0.4,
      "podiumWinRatio": 0.74,
      "podiumBayWidth": 4.4,
      "podiumPierWidth": 0.28,
      "podiumGlassColor": "#566c69",
      "podiumFrameColor": "#43352a",
      "podiumCapDepth": 0.3,
      "podiumCapColor": "#5c4b3b",
      "podiumEntranceStyle": "recessed",
      "podiumEntranceWidth": 7.2,
      "podiumEntranceHeight": 4.4,
      "podiumEntranceRecess": 1.2,
      "podiumDoorStyle": "double",
      "podiumDoorColor": "#566c69",
      "podiumDoorFrameColor": "#43352a",
      "podiumCanopyStyle": "blade",
      "podiumCanopyDepth": 1.8,
      "podiumCanopyThickness": 0.2,
      "podiumCanopyColor": "#5c4b3b",
      "podiumLobbyDepth": 7,
      "podiumLobbyFloorColor": "#8a7863",
      "podiumLobbyWallColor": "#5c4b3b",
      "roofProfile": "mechanical",
      "roofCol": "#2f2a25",
      "roofTex": "roof-sheet-metal",
      "roofAccentCol": "#5c4b3b",
      "parapetH": 1.25,
      "parapetThick": 0.3,
      "parapetCol": "#43352a",
      "penthouseScale": 0.5,
      "penthouseCol": "#43352a",
      "corniceH": 0.3,
      "corniceOut": 0.2,
      "corniceCol": "#5c4b3b",
      "spireColor": "#43352a",
      "ribDepth": 0.16,
      "ribWidth": 0.06,
      "ribColor": "#5c4b3b",
      "slabColor": "#6b5947",
      "pillarColor": "#43352a",
      "stairWidth": 2.5,
      "stairRailingColor": "#3e3932",
      "elevatorCount": 5,
      "elevatorBanking": "split",
      "elevatorColor": "#56788a",
      "elevatorShaftColor": "#3e3932",
      "floorplanStyle": "open",
      "corridorWidth": 2.5,
      "overallRoundness": 0.4,
      "exoSize": 0.06,
      "exoColor": "#5c4b3b",
      "weaveColor": "#5c4b3b",
      "sb1Floor": 21,
      "sb1Depth": 2.1,
      "sb2Floor": 25,
      "sb2Depth": 1.7,
      "sb3Floor": 28,
      "sb3Depth": 1.4,
      "bayGrid": false,
      "bayWidth": 3.3,
      "pierWidth": 0.7,
      "pierProjection": 0.2,
      "glassRecess": 0.3,
      "lightsPerBay": 2,
      "transomHeight": 2.2,
      "pierColor": "#6b5947",
      "zoneBaseColor": "#4d4033",
      "zoneBaseFrame": "#43352a",
      "zoneTopColor": "#837464",
      "zoneTopFrame": "#43352a",
      "volumeColorB": "#3e3429",
      "volumeColorC": "#897a6c",
      "slotColor": "#43352a",
      "accentColor": "#463a2e"
    }
  }
};

/* Colour roles -> every colour control, so a preset is specified the way a facade is:
   wall, glass, frame, stone trim, roof and one accent. Glass always reads darker than
   the wall (25-40 L* in daylight), the single strongest cue that masonry is masonry. */
const palette = ({ wall, glass, frame, trim, roof, accent = frame, pier = wall, base = trim, top = wall, door = '#2f2a26', bal = trim }) => ({
  wallColor: wall, windowColor: glass, bCol: frame, mullionCol: frame, trimColor: trim, sCol: trim, corniceCol: trim,
  parapetCol: wall, penthouseCol: wall, roofCol: roof, roofAccentCol: accent, pierColor: pier,
  facadeArticulationColor: accent, ribColor: accent, exoColor: accent, spireColor: accent, railCol: frame, balCol: bal,
  podCol: base, podiumGlassColor: glass, podiumFrameColor: frame, podiumCapColor: trim, podiumDoorColor: glass,
  podiumDoorFrameColor: frame, podiumCanopyColor: frame, podiumLobbyFloorColor: trim, podiumLobbyWallColor: accent,
  zoneBaseColor: base, zoneBaseFrame: frame, zoneTopColor: top, zoneTopFrame: frame, slotColor: frame,
  slabColor: wall, pillarColor: frame, doorColor: door, weaveColor: accent
});

/* No podium: the tower floors meet the ground directly (low-rise and masonry types). */
const NO_PODIUM = { podF: 0, podOut: 0 };
const MASONRY = { facadeType: 'masonry-punched', windowStyle: 'bay', bayGrid: true, facadeArticulation: 'none', enablePanelization: false, balType: 'none', balD: 0 };

const SPECS = [
  /* ---------------- Townhouses & low-rise ---------------- */
  {
    name: 'Brooklyn Brick Two-Storey Condos',
    category: 'Townhouses & low-rise',
    description: 'Two storeys of stacked condominium flats over a raised stone basement, for a mixed-density street. Red brick bays with limestone sills, lintels and keystones, white two-over-two sashes and canted bay windows on alternate units. Every second bay has a brownstone stoop under a stone hood, and a white corbelled cornice runs above the parapet.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'masonry-midrise', floors: 2, F: 3.15, raisedGround: 0.95,
      ...palette({ wall: '#8e4b3a', glass: '#2c3338', frame: '#f1efe9', trim: '#d8ccb2', roof: '#3b3d3f', accent: '#f1efe9', door: '#24302b' }),
      wallTex: 'wall-brick-red', roofTex: 'roof-bitumen-dark',
      bayWidth: 2.6, pierWidth: 0.5, pierProjection: 0.06, glassRecess: 0.22, lightsPerBay: 1, transomHeight: 0, groupFloors: 1,
      muntinPattern: 'two-over-two', windowHead: 'keystone', orielType: 'canted', orielEvery: 2, orielDepth: 0.62, orielFaces: 'street', orielFrom: 1, orielTo: 2,
      entryType: 'stoop', entryEvery: 2, separatorStyle: 'belt-course', separatorEvery: 1, sH: 0.2, sW: 0.06,
      volumeCount: 'auto', volumeColorB: '#7a3b33', volumeColorC: '#9a5a44', volumeTexB: 'wall-brick-red', volumeTexC: 'wall-brick-red', slotWidth: 0.35, slotDepth: 0.12,
      roofProfile: 'standard', parapetH: 0.75, parapetThick: 0.3, corniceH: 0.55, corniceOut: 0.42, penthouseF: 0, chimneyCount: 0
    }
  },
  {
    name: 'Gabled Stacked Townhouses',
    category: 'Townhouses & low-rise',
    description: 'Three-storey stacked townhouses in the Toronto and Vancouver missing-middle idiom. A grey-brick ground storey carries charcoal fibre-cement upper floors with black casement pairs. Each unit has a deep timber porch, and a 40 degree standing-seam gable with dormers aligned to the window bays, so the row reads as individual homes under one roofline.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'residential', facadeType: 'residential-balcony', floors: 3, F: 2.95, raisedGround: 0.45,
      ...palette({ wall: '#6b6862', glass: '#262c31', frame: '#1e1e1e', trim: '#d9d4c8', roof: '#5a5f62', accent: '#a57c52', base: '#9a958e', door: '#a57c52' }),
      wallTex: 'facade-ceramic-panel', roofTex: 'roof-sheet-metal', zoneEnable: true, zoneBaseFloors: 1, zoneTopFloors: 0, zoneBaseTex: 'wall-brick-charcoal',
      bayWidth: 3.0, pierWidth: 0.4, pierProjection: 0.05, glassRecess: 0.2, lightsPerBay: 2, transomHeight: 0,
      muntinPattern: 'casement-pair', entryType: 'porch', entryEvery: 2, separatorStyle: 'slab-edge', separatorEvery: 1, sH: 0.12, sW: 0.05,
      roofProfile: 'gable', roofPitch: 40, roofOverhang: 0.45, dormers: true, chimneyCount: 0, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Toronto Bay-and-Gable Row',
    category: 'Townhouses & low-rise',
    description: 'A row of Victorian bay-and-gable houses, Toronto\'s signature house form. Two storeys of red and buff polychrome brick carry a canted bay window up both floors of every house, and each has its own front door and porch. Stone lintels with keystones head one-over-one sashes, and a steep 50 degree slate gable with dormers and paired brick chimneys runs over the attic.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'masonry-midrise', floors: 2, F: 3.2, raisedGround: 0.6,
      ...palette({ wall: '#a0523f', glass: '#2a3035', frame: '#f1efe9', trim: '#d9c9a3', roof: '#4c5257', accent: '#f1efe9', base: '#8e4b3a', door: '#5a2e24' }),
      wallTex: 'wall-brick-red', roofTex: 'roof-sheet-metal',
      bayWidth: 2.7, pierWidth: 0.45, pierProjection: 0.05, glassRecess: 0.22, lightsPerBay: 1, transomHeight: 0,
      muntinPattern: 'one-over-one', windowHead: 'keystone', quoins: true, orielType: 'canted', orielEvery: 2, orielDepth: 0.75, orielFaces: 'street', orielFrom: 1, orielTo: 2,
      entryType: 'porch', entryEvery: 2, separatorStyle: 'belt-course', separatorEvery: 1, sH: 0.16, sW: 0.05,
      volumeCount: 'auto', volumeColorB: '#b98e6a', volumeColorC: '#8e4b3a', volumeTexB: 'wall-brick-red', volumeTexC: 'wall-brick-red', slotWidth: 0.3, slotDepth: 0.1,
      roofProfile: 'gable', roofPitch: 50, roofOverhang: 0.35, dormers: true, chimneyCount: 4, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },

  {
    name: 'Garden Apartment Courtyard',
    category: 'Townhouses & low-rise',
    description: 'A standard four-storey garden apartment block. Buff brick with a darker soldier-course base, white one-over-one vinyl windows in measured bays, and stacked steel balconies with picket rails. A gabled entrance porch marks the lobby on the street face. The hipped asphalt roof has a broad eave and flattens to a deck over the deep plan, the way suburban rental blocks are actually built.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'residential', facadeType: 'residential-balcony', floors: 4, F: 3.0, raisedGround: 0.3,
      ...palette({ wall: '#b98e6a', glass: '#2e363c', frame: '#f1efe9', trim: '#d9d0bd', roof: '#5a554e', accent: '#3a3d40', base: '#8f6a4e', door: '#3a3d40', bal: '#3a3d40' }),
      wallTex: 'wall-brick-red', roofTex: 'roof-bitumen-dark', zoneEnable: true, zoneBaseFloors: 1, zoneTopFloors: 0, zoneBaseTex: 'wall-brick-red',
      bayWidth: 3.2, pierWidth: 0.6, pierProjection: 0.04, glassRecess: 0.14, lightsPerBay: 2, transomHeight: 0,
      muntinPattern: 'one-over-one', windowHead: 'lintel', entryType: 'porch', entryEvery: 7,
      balType: 'projecting', balD: 1.4, balN: 1, balWidthRatio: 0.34, balSlabH: 0.18, railH: 1.07, railThick: 0.05,
      separatorStyle: 'belt-course', separatorEvery: 4, sH: 0.22, sW: 0.06,
      roofProfile: 'hip', roofPitch: 24, roofOverhang: 0.6, chimneyCount: 0, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Avenue Mid-Rise Rental (5-over-1)',
    category: 'Mid-rise & apartments',
    description: 'A six-storey avenue rental: a 5.2 m glazed retail storey with a steel canopy, then five storeys in three colour-blocked fibre-cement volumes (warm white, charcoal and a wood-look bay) joined by recessed slots. Punched windows sit in a regular bay grid, box bays project from the street face every third bay, and a set-back top floor keeps the cornice line at the streetwall.',
    config: {
      ...MASONRY, buildingType: 'mixed-use', facadeType: 'residential-balcony', windowStyle: 'punched', floors: 5, F: 3.05,
      ...palette({ wall: '#d9d6cf', glass: '#2e363c', frame: '#3a3d40', trim: '#e4e0d6', roof: '#3f4245', accent: '#5c5f62', base: '#3a3d40' }),
      wallTex: 'facade-ceramic-panel', roofTex: 'roof-membrane-light',
      podF: 1, podOut: 0, podiumStyle: 'transparent-retail', podiumSpecialGroundFloor: true, podiumGroundFlrHt: 5.2, podiumWinRatio: 0.78, podiumCanopyStyle: 'blade', podiumCanopyDepth: 1.5, podiumEntranceStyle: 'recessed', podiumDoorStyle: 'double',
      bayWidth: 2.9, pierWidth: 0.55, lightsPerBay: 1, glassRecess: 0.12,
      volumeCount: 'auto', volumeColorB: '#5c5f62', volumeColorC: '#a3714e', volumeTexB: 'facade-ceramic-panel', volumeTexC: 'none', slotWidth: 1.2, slotDepth: 0.6,
      sb1Floor: 5, sb1Depth: 2.6, sb1Faces: 'street', terraceRail: 'iron',
      separatorStyle: 'none', roofProfile: 'mechanical', parapetH: 1.1, corniceH: 0.25, corniceOut: 0.2, penthouseF: 0
    }
  },
  {
    name: 'Scandinavian Brick Courtyard Block',
    category: 'Mid-rise & apartments',
    description: 'A six-storey perimeter block in deep red-brown brick after Stockholm Royal Seaport: a 4.2 m ground storey with round-arched openings, then tall French windows with Juliet rails in deep 0.3 m reveals. Recessed courses band the upper floors, and a steep 45 degree gabled roof with dormers runs the length of the block, with brick chimneys.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'residential', floors: 6, F: 3.1, groundFloorHt: 4.2,
      ...palette({ wall: '#6e3b2e', glass: '#262c31', frame: '#3a3d40', trim: '#7d4a3b', roof: '#8a4632', accent: '#3a3d40', base: '#6e3b2e' }),
      wallTex: 'wall-brick-red', roofTex: 'none',
      bayWidth: 2.7, pierWidth: 0.9, pierProjection: 0, glassRecess: 0.3, lightsPerBay: 1, transomHeight: 0,
      muntinPattern: 'casement-pair', archFloors: 1, separatorStyle: 'recessed-joint', separatorEvery: 1, sH: 0.06, sW: 0.03,
      roofProfile: 'gable', roofPitch: 45, roofOverhang: 0.2, dormers: true, chimneyCount: 3, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Mass Timber Mixed-Use',
    category: 'Mid-rise & apartments',
    description: 'A nine-storey mass-timber building after The Arbour and Brock Commons. A curtain-glass ground storey with timber soffits supports prefabricated façade panels in warm wood tones. Corner-wrapping windows sit in an expressed timber frame on a 2.7 m grid. Two planted setbacks step the top floors back, and the roof is a green roof.',
    config: {
      ...MASONRY, buildingType: 'mixed-use', facadeType: 'panelized-office', floors: 8, F: 3.3,
      ...palette({ wall: '#8c6a4a', glass: '#2f383f', frame: '#3a3d40', trim: '#c49a6c', roof: '#5b6a52', accent: '#c49a6c', base: '#5f6f6a' }),
      wallTex: 'none', roofTex: 'roof-membrane-light',
      podF: 1, podOut: 0, podiumStyle: 'transparent-retail', podiumGroundFlrHt: 4.8, podiumWinRatio: 0.82, podiumCanopyStyle: 'deep-soffit', podiumCanopyDepth: 2.2,
      bayWidth: 2.7, pierWidth: 0.4, pierProjection: 0.1, glassRecess: 0.18, lightsPerBay: 1, transomHeight: 0,
      facadeArticulation: 'expressed-frame', facadeArticulationDensity: 3, facadeArticulationDepth: 0.2, facadeArticulationWidth: 0.24,
      sb1Floor: 7, sb1Depth: 2.4, sb1Faces: 'all', sb2Floor: 8, sb2Depth: 2.2, sb2Faces: 'street', terraceRail: 'glass',
      separatorStyle: 'slab-edge', separatorEvery: 1, sH: 0.32, sW: 0.08, roofProfile: 'green', roofAccentCol: '#66835f', parapetH: 0.6, corniceH: 0, penthouseF: 0
    }
  },

  /* ---------------- Pre-war & heritage ---------------- */
  {
    name: 'Upper East Side Pre-War Co-op',
    category: 'Pre-war & heritage',
    description: 'A fifteen-storey Rosario Candela-type co-op. A rusticated limestone base three storeys tall with a belt course carries a red-tan brick shaft of paired six-over-six sashes with stone sills and lintels. Brick quoins frame the corners. The avenue face sets back at the thirteenth floor behind an iron rail, and a cedar water tank stands on the roof.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'masonry-midrise', floors: 15, F: 3.3, groundFloorHt: 4.6,
      ...palette({ wall: '#9c5b45', glass: '#2a3036', frame: '#f1efe9', trim: '#d6cbb4', roof: '#3a3a38', accent: '#d6cbb4', base: '#d6cbb4' }),
      wallTex: 'wall-brick-red', roofTex: 'roof-bitumen-dark', zoneEnable: true, zoneBaseFloors: 3, zoneTopFloors: 0, zoneBaseTex: 'wall-limestone',
      bayWidth: 2.8, pierWidth: 0.55, pierProjection: 0.04, glassRecess: 0.27, lightsPerBay: 2, transomHeight: 0,
      muntinPattern: 'six-over-six', windowHead: 'lintel', rusticFloors: 3, quoins: true, entryType: 'porch', entryEvery: 9,
      separatorStyle: 'belt-course', separatorEvery: 3, sH: 0.45, sW: 0.15,
      sb1Floor: 13, sb1Depth: 3.6, sb1Faces: 'street', terraceRail: 'iron',
      roofProfile: 'standard', parapetH: 1.1, parapetThick: 0.35, corniceH: 0.6, corniceOut: 0.6, penthouseF: 1, penthouseScale: 0.6, waterTower: true
    }
  },
  {
    name: 'Haussmann Limestone Block',
    category: 'Pre-war & heritage',
    description: 'A Parisian Haussmann immeuble: a rusticated limestone ground storey with tall arched shopfronts and an entresol, then five storeys of tall French casements with transoms and stone lintels. Continuous wrought-iron balconies run at the second and fifth floors. Above the cornice sits a 74 degree zinc mansard with a dormer over every bay and a row of chimney stacks.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'masonry-midrise', floors: 6, F: 3.25, groundFloorHt: 4.8,
      ...palette({ wall: '#d8ccb2', glass: '#2a3036', frame: '#3a3d40', trim: '#e0d6c0', roof: '#6f7478', accent: '#2b2d2f', base: '#cfc3aa', bal: '#d2c7ae' }),
      wallTex: 'wall-limestone', roofTex: 'roof-sheet-metal', zoneEnable: true, zoneBaseFloors: 1, zoneTopFloors: 0, zoneBaseTex: 'wall-limestone',
      bayWidth: 2.6, pierWidth: 0.85, pierProjection: 0.03, glassRecess: 0.25, lightsPerBay: 1, transomHeight: 2.3,
      muntinPattern: 'casement-pair', windowHead: 'keystone', rusticFloors: 1, archFloors: 1,
      balType: 'wrap', balD: 0.7, balN: 3, balWidthRatio: 1, balSlabH: 0.16, railH: 1.0, railThick: 0.04, terraceRail: 'iron',
      separatorStyle: 'belt-course', separatorEvery: 1, sH: 0.18, sW: 0.08,
      roofProfile: 'mansard', dormers: true, chimneyCount: 4, corniceH: 0.7, corniceOut: 0.55, penthouseF: 0
    }
  },
  {
    name: 'Limestone Mansion Block',
    category: 'Pre-war & heritage',
    description: 'A pre-war mansion block in warm Portland limestone. Shallow piers frame triple-light bays with transoms, deep reveals and keystoned heads. A rusticated two-storey base sits on a granite water table, and belt courses mark every third floor. A two-tier cornice runs under a coped parapet, and a uniformly set-back attic storey sits quietly above the street wall.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'masonry-midrise', floors: 11, F: 3.5, groundFloorHt: 4.8,
      ...palette({ wall: '#d6cbb5', glass: '#2c3338', frame: '#5a4938', trim: '#cdc2ab', roof: '#3f3c38', accent: '#b9aa8f', base: '#cfc3aa' }),
      wallTex: 'wall-limestone', roofTex: 'roof-bitumen-dark',
      bayWidth: 2.9, pierWidth: 0.6, pierProjection: 0.14, glassRecess: 0.26, lightsPerBay: 3, transomHeight: 2.1,
      muntinPattern: 'one-over-one', windowHead: 'keystone', rusticFloors: 2, archFloors: 1, entryType: 'porch', entryEvery: 8,
      separatorStyle: 'belt-course', separatorEvery: 3, sH: 0.3, sW: 0.16,
      roofProfile: 'standard', parapetH: 1.0, parapetThick: 0.4, corniceH: 0.95, corniceOut: 0.7, penthouseF: 1, penthouseScale: 0.74
    }
  },
  {
    name: 'Chicago School Terracotta Office',
    category: 'Pre-war & heritage',
    description: 'A fourteen-storey Chicago School office after the Reliance Building. White glazed terracotta piers frame wide Chicago windows: a fixed centre light between two narrow sashes. Projecting box oriels run up every third bay from the third floor. The base is two storeys of dark granite, and the top is a thin flat cornice projecting 1.3 m, giving a crisp base, shaft and capital.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'office', facadeType: 'panelized-office', floors: 14, F: 3.8, groundFloorHt: 5.6,
      ...palette({ wall: '#ece8dd', glass: '#2e363c', frame: '#3a3d40', trim: '#ece8dd', roof: '#3a3b3b', accent: '#ece8dd', base: '#5e5c58' }),
      wallTex: 'facade-ceramic-panel', roofTex: 'roof-bitumen-dark', zoneEnable: true, zoneBaseFloors: 2, zoneTopFloors: 0, zoneBaseTex: 'wall-concrete-cast',
      bayWidth: 3.4, pierWidth: 0.45, pierProjection: 0.12, glassRecess: 0.2, lightsPerBay: 3, transomHeight: 0,
      orielType: 'box', orielEvery: 3, orielDepth: 0.9, orielFaces: 'all', orielFrom: 3, orielTo: 13,
      separatorStyle: 'spandrel-band', separatorEvery: 1, sH: 0.6, sW: 0.06,
      roofProfile: 'standard', parapetH: 0.5, parapetThick: 0.3, corniceH: 0.5, corniceOut: 1.3, penthouseF: 0
    }
  },
  {
    name: 'Brick Warehouse Loft Conversion',
    category: 'Pre-war & heritage',
    description: 'An eight-storey brick warehouse converted to lofts. Heavy brick piers on a wide 4.2 m structural bay hold black steel windows divided into small panes, with segmental stone heads. A corbelled brick cornice tops the building. Above it, a recessed glass penthouse is a contemporary addition, and a timber water tank on a steel stand finishes the roof.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'industrial-loft', facadeType: 'heavy-concrete', floors: 8, F: 3.9, groundFloorHt: 4.4,
      ...palette({ wall: '#8e4b3a', glass: '#262d33', frame: '#1e1e1e', trim: '#b4a58a', roof: '#33383b', accent: '#1e1e1e', base: '#7a3b33' }),
      wallTex: 'wall-brick-red', roofTex: 'roof-bitumen-dark',
      bayWidth: 4.2, pierWidth: 0.9, pierProjection: 0.1, glassRecess: 0.3, lightsPerBay: 2, transomHeight: 0,
      muntinPattern: 'deco-grid', windowHead: 'lintel', separatorStyle: 'belt-course', separatorEvery: 8, sH: 0.3, sW: 0.08,
      roofProfile: 'standard', parapetH: 1.2, parapetThick: 0.45, corniceH: 0.5, corniceOut: 0.3, corniceCol: '#7a3b33',
      penthouseF: 1, penthouseScale: 0.62, penthouseCol: '#2b3035', waterTower: true
    }
  },

  /* ---------------- Masonry & stone towers ---------------- */
  {
    name: 'Limestone Art Deco Tower (RAMSA style)',
    category: 'Masonry & stone towers',
    description: 'A 38-storey limestone residential tower in the RAMSA manner of 15 Central Park West and 220 Central Park South. A rusticated four-storey base has arched openings and a belt course. The shaft has 0.85 m piers framing paired casements under transom lights in bronze frames. Four wedding-cake setbacks carry stone balustrades, and an octagonal lantern crown with corner finials tops the tower.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'masonry-midrise', floors: 38, F: 3.6, groundFloorHt: 6.4,
      ...palette({ wall: '#d8ccb2', glass: '#2c343a', frame: '#4a3b2c', trim: '#cdbf9f', roof: '#3f3c38', accent: '#7fa493', base: '#cfc3aa' }),
      wallTex: 'wall-limestone', roofTex: 'roof-sheet-metal', zoneEnable: true, zoneBaseFloors: 4, zoneTopFloors: 0, zoneBaseTex: 'wall-limestone',
      bayWidth: 3.9, pierWidth: 0.85, pierProjection: 0.15, glassRecess: 0.3, lightsPerBay: 2, transomHeight: 0,
      muntinPattern: 'transom-light', rusticFloors: 4, archFloors: 1, windowHead: 'none',
      separatorStyle: 'belt-course', separatorEvery: 4, sH: 0.45, sW: 0.2,
      sb1Floor: 24, sb1Depth: 3.6, sb1Faces: 'all', sb2Floor: 30, sb2Depth: 3.2, sb2Faces: 'all', sb3Floor: 34, sb3Depth: 2.8, sb3Faces: 'all', terraceRail: 'stone',
      roofProfile: 'crown', crownStyle: 'lantern', corniceH: 0.6, corniceOut: 0.45, penthouseF: 0,
      enableSpire: true, spireHeight: 10, spireWidth: 1.0, spireColor: '#7fa493'
    }
  },
  {
    name: 'Art Deco Brick Setback Tower',
    category: 'Masonry & stone towers',
    description: 'A 1930s Manhattan setback tower in buff brick. Unbroken piers run the full height and dark cast-metal spandrels sit recessed between the windows, so the shaft reads as pure vertical lines. Five wedding-cake setbacks follow the zoning envelope. The top is a stepped pier crown with a slender spire, over a two-storey granite and limestone base.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'office', floors: 40, F: 3.7, groundFloorHt: 6.0,
      ...palette({ wall: '#b98e6a', glass: '#2a3035', frame: '#3a3d40', trim: '#d8ccb2', roof: '#3a3b3b', accent: '#c9a882', pier: '#c4a07c', base: '#5e5c58' }),
      wallTex: 'wall-brick-red', roofTex: 'roof-bitumen-dark', zoneEnable: true, zoneBaseFloors: 2, zoneTopFloors: 0, zoneBaseTex: 'wall-limestone',
      bayWidth: 2.4, pierWidth: 0.55, pierProjection: 0.25, glassRecess: 0.28, lightsPerBay: 1, transomHeight: 0,
      muntinPattern: 'one-over-one', accentPanels: 'spandrel', accentDensity: 1, accentColor: '#3a3d40',
      separatorStyle: 'none',
      sb1Floor: 18, sb1Depth: 3.5, sb1Faces: 'all', sb2Floor: 26, sb2Depth: 3.2, sb2Faces: 'all', sb3Floor: 32, sb3Depth: 3.0, sb3Faces: 'all', terraceRail: 'stone',
      roofProfile: 'crown', crownStyle: 'stepped', crownFloors: 3, corniceH: 0, corniceOut: 0, penthouseF: 0,
      enableSpire: true, spireHeight: 22, spireWidth: 1.6, spireColor: '#9aa3a5'
    }
  },
  {
    name: 'Gothic Terracotta Spire',
    category: 'Masonry & stone towers',
    description: 'A Woolworth-style tower in cream terracotta. Slim piers rise 0.3 m proud past decorated gold-tone spandrels. A full-width base block sets back hard at the 26th floor into a narrower tower, which is topped by a steep 60 degree copper pyramid and a lantern spire. The base, shaft and crown divisions are strongly drawn.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'office', floors: 48, F: 3.9, groundFloorHt: 6.5,
      ...palette({ wall: '#e6dcc3', glass: '#2c3339', frame: '#3a3d40', trim: '#e6dcc3', roof: '#7fa493', accent: '#7fa493', pier: '#ece4cf', base: '#d6cbb4' }),
      wallTex: 'facade-ceramic-panel', roofTex: 'none', zoneEnable: true, zoneBaseFloors: 3, zoneTopFloors: 0, zoneBaseTex: 'wall-limestone',
      bayWidth: 2.4, pierWidth: 0.45, pierProjection: 0.3, glassRecess: 0.25, lightsPerBay: 2, transomHeight: 0,
      muntinPattern: 'one-over-one', accentPanels: 'spandrel', accentDensity: 1, accentColor: '#c9a64c', archFloors: 2,
      separatorStyle: 'belt-course', separatorEvery: 26, sH: 0.6, sW: 0.25,
      sb1Floor: 27, sb1Depth: 7.5, sb1Faces: 'all', sb2Floor: 42, sb2Depth: 2.2, sb2Faces: 'all', terraceRail: 'stone',
      roofProfile: 'hip', roofPitch: 60, roofOverhang: 0.1, corniceH: 0.8, corniceOut: 0.5, penthouseF: 0,
      enableSpire: true, spireHeight: 16, spireWidth: 1.8, spireColor: '#7fa493'
    }
  },
  {
    name: 'Brick-Carried Point Tower (Toronto)',
    category: 'Masonry & stone towers',
    description: 'A Toronto podium-and-point tower, built the way the better Hariri Pontarini projects are. A six-storey crimson-brick podium meets the street with deep 0.2 m reveals, and the brick piers carry on up the tower every 3.2 m. Black window-wall infill and black spandrels sit between them, Juliet rails replace slab balconies, and a picture-frame crown hides the plant.',
    config: {
      ...MASONRY, buildingType: 'residential', facadeType: 'residential-balcony', floors: 44, F: 3.0,
      ...palette({ wall: '#26292b', glass: '#1f262b', frame: '#1e1e1e', trim: '#7a3b33', roof: '#2f3335', accent: '#7a3b33', pier: '#7a3b33', base: '#7a3b33' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', zoneEnable: true, zoneBaseFloors: 6, zoneTopFloors: 0, zoneBaseTex: 'wall-brick-red',
      podF: 1, podOut: 0, podiumStyle: 'bronze-residential', podiumGroundFlrHt: 5.5, podiumWinRatio: 0.7, podiumCanopyStyle: 'framed',
      bayWidth: 3.2, pierWidth: 0.75, pierProjection: 0.2, glassRecess: 0.2, lightsPerBay: 2, transomHeight: 0,
      sb1Floor: 7, sb1Depth: 5.5, sb1Faces: 'all', terraceRail: 'glass',
      separatorStyle: 'none', roofProfile: 'crown', crownStyle: 'picture-frame', crownFloors: 2, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Arched Concrete Tower (130 William style)',
    category: 'Masonry & stone towers',
    description: 'A 50-storey tower in hand-troweled tinted concrete after Adjaye\'s 130 William. Deep 0.4 m reveals and bronze-framed loft windows sit in a 2.7 m grid of projecting piers. Round arches open the lowest four floors as a colonnade. Two loggia setbacks cut into the upper floors, and a picture-frame crown keeps the plant out of sight.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'residential', facadeType: 'heavy-concrete', floors: 50, F: 3.5, groundFloorHt: 6.2,
      ...palette({ wall: '#8f857a', glass: '#262d33', frame: '#5c4632', trim: '#9c9184', roof: '#3a3b3b', accent: '#5c4632', base: '#857b70' }),
      wallTex: 'wall-concrete-cast', roofTex: 'roof-bitumen-dark',
      bayWidth: 2.7, pierWidth: 0.75, pierProjection: 0.3, glassRecess: 0.4, lightsPerBay: 2, transomHeight: 2.4, groupFloors: 1,
      muntinPattern: 'none', archFloors: 4, separatorStyle: 'recessed-joint', separatorEvery: 1, sH: 0.06, sW: 0.04,
      sb1Floor: 44, sb1Depth: 2.4, sb1Faces: 'street', sb2Floor: 48, sb2Depth: 2.2, sb2Faces: 'all', terraceRail: 'iron',
      roofProfile: 'crown', crownStyle: 'picture-frame', crownFloors: 2, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Green Terracotta Loft (Fitzroy style)',
    category: 'Masonry & stone towers',
    description: 'A ten-storey Chelsea condominium after Roman and Williams\' Fitzroy. Glazed green terracotta is cast into deep fluted piers and copper-framed windows sit back in shadowed reveals. Soldier bands mark each floor. Two set-back penthouse floors behind iron rails and a stepped crown complete a symmetrical elevation that reads as crafted, not glazed.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'residential', floors: 10, F: 3.66, groundFloorHt: 5.0,
      ...palette({ wall: '#4e6b55', glass: '#262d33', frame: '#9a6b45', trim: '#5f7d66', roof: '#2f3335', accent: '#9a6b45', pier: '#567560', base: '#3f5646' }),
      wallTex: 'facade-ceramic-panel', roofTex: 'roof-bitumen-dark',
      bayWidth: 2.5, pierWidth: 0.55, pierProjection: 0.25, glassRecess: 0.34, lightsPerBay: 2, transomHeight: 2.3,
      muntinPattern: 'casement-pair', archFloors: 1, separatorStyle: 'belt-course', separatorEvery: 1, sH: 0.16, sW: 0.05,
      sb1Floor: 9, sb1Depth: 2.4, sb1Faces: 'street', sb2Floor: 10, sb2Depth: 2.0, sb2Faces: 'all', terraceRail: 'iron',
      roofProfile: 'crown', crownStyle: 'stepped', crownFloors: 1, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Brutalist Concrete Slab',
    category: 'Masonry & stone towers',
    description: 'A 31-storey brutalist slab after Trellick Tower. Bush-hammered sandy concrete is expressed as a frame of cross-walls and deep floor-edge bands, which double as solid balcony upstands. Wide recessed windows and red accent panels sit inside the grid. The top is a cantilevered plant box on a picture-frame crown, with no curtain wall or applied ornament anywhere.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'residential', facadeType: 'heavy-concrete', windowStyle: 'punched', floors: 31, F: 3.1, groundFloorHt: 5.0,
      ...palette({ wall: '#a39c8e', glass: '#262c31', frame: '#3b3530', trim: '#a39c8e', roof: '#3a3b3b', accent: '#a39c8e', base: '#8e8b84' }),
      wallTex: 'wall-concrete-boardform', roofTex: 'roof-bitumen-dark',
      bayWidth: 4.6, pierWidth: 0.45, lightsPerBay: 1, accentPanels: 'beside', accentDensity: 0.45, accentColor: '#9e3b2e',
      facadeArticulation: 'expressed-frame', facadeArticulationDensity: 4, facadeArticulationDepth: 0.9, facadeArticulationWidth: 0.4,
      separatorStyle: 'spandrel-band', separatorEvery: 1, sH: 0.95, sW: 0.55,
      roofProfile: 'crown', crownStyle: 'picture-frame', crownFloors: 2, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },

  /* ---------------- Sculptural & landmark ---------------- */
  {
    name: 'Fluid Band Residences (Hadid style)',
    category: 'Sculptural & landmark',
    description: 'A fourteen-storey residence after Zaha Hadid Architects\' 520 West 28th. The plan is rounded at every corner, and hand-brushed steel bands at each slab swell from 0.3 m to nearly 2 m, drifting around the plan from floor to floor, so they read as continuous sculpted ribbons. Floor-to-ceiling glass sits between them, over a 5.2 m glazed ground storey.',
    config: {
      ...NO_PODIUM, buildingType: 'residential', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 14, F: 3.6, groundFloorHt: 5.2,
      ...palette({ wall: '#3e4c56', glass: '#3e4c56', frame: '#a7a9a8', trim: '#b4b6b5', roof: '#8f9192', accent: '#a7a9a8' }),
      wallTex: 'none', roofTex: 'roof-sheet-metal', facadeArticulation: 'none', enablePanelization: false, balType: 'none', balD: 0,
      mullionV: 2, mullionH: 0, mullionThick: 0.03, bW: 0.04, overallRoundness: 4.5, taperMode: 'rounded', taper: 0.1,
      separatorStyle: 'flowing-band', separatorEvery: 1, sH: 0.55, sW: 0.3, bandWave: 2.0,
      roofProfile: 'standard', parapetH: 0.6, parapetThick: 0.25, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Twisting White-Band Tower',
    category: 'Sculptural & landmark',
    description: 'A 45-storey residential tower in the Leeza SOHO and Cayan idiom. Each rounded floor plate turns one degree on the one below, so white aluminium slab bands 0.7 m deep spiral through 45 degrees from base to crown. Dark low-iron glass sits between them, mullions are kept to a minimum, and the corners are softened so the twist reads as one continuous movement.',
    config: {
      ...NO_PODIUM, buildingType: 'glass-landmark', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 45, F: 3.5, groundFloorHt: 6.0,
      ...palette({ wall: '#e6e6e3', glass: '#405260', frame: '#e6e6e3', trim: '#e6e6e3', roof: '#c9cac6', accent: '#e6e6e3' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', facadeArticulation: 'none', enablePanelization: false, balType: 'none', balD: 0,
      mullionV: 2, mullionH: 0, mullionThick: 0.03, bW: 0.04, overallRoundness: 2.5, planTwist: 45,
      separatorStyle: 'slab-edge', separatorEvery: 1, sH: 0.7, sW: 0.55,
      roofProfile: 'standard', parapetH: 1.2, parapetThick: 0.3, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Curved Exoskeleton Residences',
    category: 'Sculptural & landmark',
    description: 'A 50-storey residence after One Thousand Museum. White glass-fibre-concrete frame members, 1.2 m wide and 0.5 m proud of the glass, follow the plate as the plan bows gently through the height. The corners are rounded, slab bands are kept slim and dark glass sits deep within the frame, so the structure itself becomes the facade.',
    config: {
      ...NO_PODIUM, buildingType: 'glass-landmark', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 50, F: 3.6, groundFloorHt: 7.0,
      ...palette({ wall: '#405260', glass: '#405260', frame: '#d6d4cf', trim: '#eceae4', roof: '#d6d4cf', accent: '#eceae4' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', balType: 'none', balD: 0, enablePanelization: false,
      facadeArticulation: 'expressed-frame', facadeArticulationDensity: 4, facadeArticulationDepth: 0.45, facadeArticulationWidth: 1.2,
      mullionV: 2, mullionH: 0, overallRoundness: 3.0, planSway: 2.4, swayPeriod: 100,
      separatorStyle: 'slab-edge', separatorEvery: 1, sH: 0.3, sW: 0.2,
      roofProfile: 'crown', crownStyle: 'picture-frame', crownFloors: 2, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  }
];

/* Ultra-modern, office and contemporary residential presets, after Foster + Partners,
   SOM and the Gulf. Proportions follow the built references: 4.0-4.2 m office storeys,
   3.3-3.5 m residential, 6-7 m lobbies, spires about a quarter of roof height. */
const MODERN = [
  /* ---------------- Ultra-modern & supertall ---------------- */
  {
    name: 'Diagrid Cigar Tower (30 St Mary Axe style)',
    category: 'Ultra-modern & supertall',
    description: 'A 40-storey office tower after Foster + Partners\' 30 St Mary Axe. The rounded plan swells from the street to its widest at mid-height, then draws in to a glazed dome over the top six floors. A white steel diagrid laces the whole surface in diamonds three storeys tall, standing 0.5 m proud of blue-grey glass, with no slab bands to interrupt it.',
    config: {
      ...NO_PODIUM, buildingType: 'glass-landmark', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 40, F: 4.15, groundFloorHt: 6.5,
      ...palette({ wall: '#3b4f5c', glass: '#4a6474', frame: '#d9dcdc', trim: '#d9dcdc', roof: '#2c3a42', accent: '#e4e6e5' }),
      wallTex: 'none', roofTex: 'roof-sheet-metal', balType: 'none', balD: 0,
      facadeArticulation: 'lattice', facadeArticulationDensity: 4, facadeArticulationDepth: 0.5, facadeArticulationWidth: 0.55,
      mullionV: 3, mullionH: 1, mullionThick: 0.03, bW: 0.04, overallRoundness: 5,
      taperMode: 'rounded', taper: 0.18, roofProfile: 'tapered', roofTaperStartFloor: 34, roofTaperStep: -0.08,
      separatorStyle: 'recessed-joint', separatorEvery: 1, sH: 0.08, sW: 0.04,
      parapetH: 0.4, parapetThick: 0.25, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Chamfered Obelisk Supertall (One World Trade style)',
    category: 'Ultra-modern & supertall',
    description: 'A 94-storey office supertall after SOM\'s One World Trade Center. The square plan\'s corners chamfer away as it rises, so eight tall triangular facets meet at an octagonal mid-section and the roof plate is the base square turned 45 degrees. A silver glass-fin base 18 storeys tall carries reflective blue glass, a 2.5 m parapet and a 120 m spire.',
    config: {
      ...NO_PODIUM, buildingType: 'office', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 94, F: 4.0, groundFloorHt: 7.0,
      ...palette({ wall: '#5f7682', glass: '#56707d', frame: '#c9cfd2', trim: '#c9cfd2', roof: '#3a4247', accent: '#c9cfd2', base: '#a7b0b4', top: '#5f7682' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', balType: 'none', balD: 0, facadeArticulation: 'none',
      zoneEnable: true, zoneBaseFloors: 18, zoneTopFloors: 0, zoneBaseTex: 'none',
      mullionV: 3, mullionH: 0, mullionThick: 0.03, bW: 0.04, overallRoundness: 0, taperMode: 'obelisk', taper: 0.5,
      separatorStyle: 'recessed-joint', separatorEvery: 1, sH: 0.06, sW: 0.03,
      roofProfile: 'standard', parapetH: 2.5, parapetThick: 0.4, corniceH: 0, corniceOut: 0, penthouseF: 0,
      enableSpire: true, spireHeight: 120, spireWidth: 4.0, spireColor: '#d6dadc'
    }
  },
  {
    name: 'Spiral Setback Supertall (Burj Khalifa style)',
    category: 'Ultra-modern & supertall',
    description: 'A 110-storey supertall after SOM\'s Burj Khalifa. Rounded wings step back nine times on a spiral, one face every nine floors, each step a planted terrace behind glass, while the shaft draws in gently. Stainless vertical fins over silver-blue reflective glass, louvred mechanical floors every thirty storeys and a 120 m stepped spire complete the needle silhouette.',
    config: {
      ...NO_PODIUM, buildingType: 'glass-landmark', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 110, F: 3.9, groundFloorHt: 7.0,
      ...palette({ wall: '#7f9099', glass: '#5d7380', frame: '#cfd5d8', trim: '#cfd5d8', roof: '#3a4247', accent: '#d8dddf' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', balType: 'none', balD: 0,
      facadeArticulation: 'vertical-fins', facadeArticulationDensity: 6, facadeArticulationDepth: 0.35, facadeArticulationWidth: 0.08,
      mullionV: 3, mullionH: 0, mullionThick: 0.03, bW: 0.04, overallRoundness: 3.5, taperMode: 'cont', taper: -0.12,
      tierEvery: 9, tierStart: 28, tierDepth: 2.6, tierCount: 9, tierFaces: 'spiral', terraceRail: 'glass', mechEvery: 30,
      separatorStyle: 'slab-edge', separatorEvery: 1, sH: 0.12, sW: 0.08,
      roofProfile: 'standard', parapetH: 1.2, parapetThick: 0.3, corniceH: 0, corniceOut: 0, penthouseF: 0,
      enableSpire: true, spireHeight: 120, spireWidth: 6.0, spireColor: '#d8dddf'
    }
  },
  {
    name: 'Gold Sail Tower (Dubai Marina style)',
    category: 'Ultra-modern & supertall',
    description: 'A 60-storey Dubai hotel and residence tower. Warm gold reflective glass sits behind a crisp white aluminium grid of deep slab bands and vertical fins on a softly rounded, gently tapering plan. A three-storey sculpted glass podium meets the promenade, and at the top a glazed screen and an open white sail blade sweep up 40 m in a quarter arc.',
    config: {
      buildingType: 'glass-landmark', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 60, F: 3.5, groundFloorHt: 0,
      ...palette({ wall: '#7a6745', glass: '#6e5c3a', frame: '#efece4', trim: '#efece4', roof: '#d8d4ca', accent: '#f4f2ec', base: '#efece4' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', balType: 'none', balD: 0,
      podF: 3, podOut: 1.5, podiumStyle: 'sculpted-glass', podiumGroundFlrHt: 7.0, podiumUpperFloorHt: 4.6, podiumWinRatio: 0.88, podiumCanopyStyle: 'blade', podiumCanopyDepth: 3.0, podiumEntranceStyle: 'sculpted',
      facadeArticulation: 'vertical-fins', facadeArticulationDensity: 3, facadeArticulationDepth: 0.6, facadeArticulationWidth: 0.25,
      mullionV: 2, mullionH: 0, mullionThick: 0.03, bW: 0.04, overallRoundness: 4.0, taperMode: 'cont', taper: -0.1,
      separatorStyle: 'slab-edge', separatorEvery: 1, sH: 0.5, sW: 0.35,
      roofProfile: 'crown', crownStyle: 'blade', crownFloors: 2, corniceH: 0, corniceOut: 0, penthouseF: 0, spireColor: '#f4f2ec'
    }
  },
  {
    name: 'Sun-Shaded Slab Tower (Index Tower Dubai style)',
    category: 'Ultra-modern & supertall',
    description: 'A 72-storey office and residential slab after Foster + Partners\' Index Tower in Dubai. A deep white egg-crate of 0.55 m vertical fins and 0.85 m horizontal sunshades on every floor shades recessed dark glass from the desert sun. Louvred plant floors mark every 24 storeys. A four-storey colonnaded base carries the slab, and an open frame crown screens the roof.',
    config: {
      ...MASONRY, buildingType: 'office', facadeType: 'panelized-office', floors: 72, F: 4.0,
      ...palette({ wall: '#e9e8e3', glass: '#30404a', frame: '#8f979a', trim: '#efeee9', roof: '#3a3d40', accent: '#efeee9', pier: '#efeee9', base: '#d9d7d0' }),
      wallTex: 'none', roofTex: 'roof-membrane-light',
      podF: 4, podOut: 1.2, podiumStyle: 'civic-colonnade', podiumGroundFlrHt: 7.0, podiumUpperFloorHt: 4.4, podiumWinRatio: 0.7, podiumCanopyStyle: 'deep-soffit', podiumCanopyDepth: 2.4,
      bayWidth: 3.0, pierWidth: 0.45, pierProjection: 0.55, glassRecess: 0.25, lightsPerBay: 2, transomHeight: 0,
      mechEvery: 24, separatorStyle: 'slab-edge', separatorEvery: 1, sH: 0.35, sW: 0.85,
      roofProfile: 'crown', crownStyle: 'picture-frame', crownFloors: 2, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },

  /* ---------------- Office buildings ---------------- */
  {
    name: 'Bundled-Tube Black Tower (Willis style)',
    category: 'Office buildings',
    description: 'A 100-storey office tower after SOM\'s Willis (Sears) Tower. Black anodised aluminium and bronze-tinted glass are ribbed by continuous black mullion fins. The bundled tubes drop away at the 50th, 66th and 90th floors on alternating faces, black louvre bands mark the plant floors every 32 storeys, and twin-scale antennas rise 80 m from the roof.',
    config: {
      ...NO_PODIUM, buildingType: 'office', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 100, F: 4.2, groundFloorHt: 7.0,
      ...palette({ wall: '#1d1f21', glass: '#3a3128', frame: '#151617', trim: '#2a2c2e', roof: '#2a2c2e', accent: '#111213' }),
      wallTex: 'none', roofTex: 'roof-bitumen-dark', balType: 'none', balD: 0,
      facadeArticulation: 'vertical-fins', facadeArticulationDensity: 5, facadeArticulationDepth: 0.22, facadeArticulationWidth: 0.1,
      mullionV: 2, mullionH: 0, mullionThick: 0.04, bW: 0.05,
      sb1Floor: 50, sb1Depth: 9, sb1Faces: 'street', sb2Floor: 66, sb2Depth: 7, sb2Faces: 'sides', sb3Floor: 90, sb3Depth: 6, sb3Faces: 'street-rear', setbackTerraces: false,
      mechEvery: 32, separatorStyle: 'recessed-joint', separatorEvery: 1, sH: 0.06, sW: 0.03,
      roofProfile: 'standard', parapetH: 1.5, parapetThick: 0.35, corniceH: 0, corniceOut: 0, penthouseF: 0,
      enableSpire: true, spireHeight: 80, spireWidth: 3.0, spireColor: '#d0d3d4'
    }
  },
  {
    name: 'Sandstone and Bronze Headquarters (Bloomberg London style)',
    category: 'Office buildings',
    description: 'A ten-storey headquarters after Foster + Partners\' Bloomberg London. A load-bearing frame of warm Derbyshire sandstone, piers 0.3 m proud on a 3.2 m grid with a stone spandrel at every floor, holds four-light bronze-framed glazing. The 6 m ground storey is a glazed arcade with framed doors, and the top floor steps back behind a bronze rail.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'office', facadeType: 'panelized-office', floors: 10, F: 4.3, groundFloorHt: 6.0,
      ...palette({ wall: '#c9b593', glass: '#2b3439', frame: '#6b4f33', trim: '#d2bf9d', roof: '#3a3b3b', accent: '#6b4f33', pier: '#cdb997', base: '#bfa984', door: '#6b4f33' }),
      wallTex: 'wall-limestone', roofTex: 'roof-membrane-light',
      bayWidth: 3.2, pierWidth: 0.5, pierProjection: 0.3, glassRecess: 0.32, lightsPerBay: 4, transomHeight: 0,
      entryType: 'door', entryEvery: 6,
      separatorStyle: 'spandrel-band', separatorEvery: 1, sH: 0.55, sW: 0.22,
      sb1Floor: 10, sb1Depth: 3.0, sb1Faces: 'all', terraceRail: 'iron',
      roofProfile: 'green', roofAccentCol: '#66835f', parapetH: 0.9, parapetThick: 0.35, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Diagrid on Landmark Base (Hearst style)',
    category: 'Office buildings',
    description: 'A 40-storey glass and stainless diagrid tower after Foster + Partners\' Hearst Tower, rising from a preserved six-storey cast-stone base. The diagonal steel lattice forms triangles three storeys tall, 0.6 m proud of the glass, with no slab bands so the diamonds read cleanly. The tower is held back from the base edge, so the old cornice line still meets the street.',
    config: {
      buildingType: 'office', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 40, F: 4.0,
      ...palette({ wall: '#617582', glass: '#5a6e78', frame: '#c7ccce', trim: '#cfc5ae', roof: '#3a3d40', accent: '#d5d9da', base: '#cbbfa5' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', balType: 'none', balD: 0,
      podF: 6, podOut: 2.5, podiumStyle: 'stone-portal', podiumGroundFlrHt: 6.0, podiumUpperFloorHt: 4.2, podiumWinRatio: 0.5, podiumBayWidth: 3.6, podiumPierWidth: 0.9,
      podiumCanopyStyle: 'framed', podiumEntranceStyle: 'framed', podiumFrameColor: '#a89a7c',
      facadeArticulation: 'lattice', facadeArticulationDensity: 3, facadeArticulationDepth: 0.6, facadeArticulationWidth: 0.7,
      mullionV: 3, mullionH: 1, mullionThick: 0.03, bW: 0.04,
      separatorStyle: 'none', roofProfile: 'standard', parapetH: 1.5, parapetThick: 0.35, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Modernist Glass Slab on Pilotis (Lever House style)',
    category: 'Office buildings',
    description: 'A 24-storey International Style office after SOM\'s Lever House. A two-storey horizontal base on stainless pilotis and a recessed glass lobby holds up a thin slab set back from the street. The slab is wrapped in blue-green vision glass and dark green spandrel glass in a fine stainless-steel grid, under a slatted mechanical penthouse.',
    config: {
      buildingType: 'office', facadeType: 'curtain-wall', windowStyle: 'ribbon', bayGrid: false, floors: 24, F: 3.7,
      ...palette({ wall: '#2f4b4d', glass: '#4f7a78', frame: '#c8cdcd', trim: '#d5d9d8', roof: '#3a3d40', accent: '#c8cdcd', base: '#cfd3cf' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', balType: 'none', balD: 0, facadeArticulation: 'none',
      podF: 2, podOut: 2.5, podiumStyle: 'civic-colonnade', podiumGroundFlrHt: 5.0, podiumUpperFloorHt: 4.0, podiumWinRatio: 0.82, podiumCanopyStyle: 'none', podiumEntranceStyle: 'colonnade',
      mullionV: 4, mullionH: 1, mullionThick: 0.035, bW: 0.05,
      sb1Floor: 2, sb1Depth: 6, sb1Faces: 'street-rear', setbackTerraces: false,
      separatorStyle: 'recessed-joint', separatorEvery: 1, sH: 0.05, sW: 0.03,
      roofProfile: 'mechanical', parapetH: 0.9, parapetThick: 0.3, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Precast Ribbon-Window Office Park',
    category: 'Office buildings',
    description: 'The four-storey suburban office everyone actually works in. Long bands of white acid-etched precast spandrel alternate with continuous dark-tinted ribbon windows in slim grey frames, over a taller 4.6 m lobby storey with a single framed entrance. A set-back screened plant enclosure and cooling cells sit on the roof.',
    config: {
      ...NO_PODIUM, buildingType: 'office', facadeType: 'heavy-concrete', windowStyle: 'ribbon', bayGrid: false, floors: 4, F: 4.0, groundFloorHt: 4.6,
      ...palette({ wall: '#d9d6ce', glass: '#2c3840', frame: '#5c6366', trim: '#e2dfd7', roof: '#8d8f8c', accent: '#5c6366', door: '#2c3840' }),
      wallTex: 'wall-concrete-cast', roofTex: 'roof-membrane-light', balType: 'none', balD: 0, facadeArticulation: 'none',
      mullionV: 2, mullionH: 0, mullionThick: 0.04, bW: 0.06, entryType: 'door', entryEvery: 14,
      separatorStyle: 'recessed-joint', separatorEvery: 1, sH: 0.05, sW: 0.03,
      roofProfile: 'mechanical', parapetH: 0.9, parapetThick: 0.3, corniceH: 0.2, corniceOut: 0.12, penthouseF: 0
    }
  },

  /* ---------------- Contemporary residential ---------------- */
  {
    name: 'Wraparound Balcony Residences (Dubai Marina style)',
    category: 'Contemporary residential',
    description: 'A 48-storey Gulf residential tower. Continuous 1.8 m wraparound balconies with white slab edges and frameless glass balustrades ring every floor of a fully rounded plan, so the tower reads as a stack of white lines over deep-set blue-grey glass. A three-storey sculpted podium holds the lobby and amenity floors, and a raked glass crown tops the tower.',
    config: {
      buildingType: 'residential', facadeType: 'residential-balcony', windowStyle: 'ribbon', bayGrid: false, floors: 48, F: 3.3,
      ...palette({ wall: '#efede7', glass: '#3d5562', frame: '#c9ccc9', trim: '#f3f1ec', roof: '#d6d4cf', accent: '#f3f1ec', base: '#e4e1da', bal: '#f3f1ec' }),
      wallTex: 'none', roofTex: 'roof-membrane-light', facadeArticulation: 'none',
      podF: 3, podOut: 1.5, podiumStyle: 'sculpted-glass', podiumGroundFlrHt: 6.5, podiumUpperFloorHt: 4.4, podiumWinRatio: 0.86, podiumCanopyStyle: 'blade', podiumCanopyDepth: 2.6,
      balType: 'wrap', balD: 1.8, balN: 1, balWidthRatio: 1, balSlabH: 0.3, railH: 1.1, railThick: 0.04, terraceRail: 'glass',
      mullionV: 2, mullionH: 0, mullionThick: 0.03, bW: 0.04, overallRoundness: 5,
      separatorStyle: 'none', roofProfile: 'crown', crownStyle: 'raked', roofPitch: 25, crownFloors: 2, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  },
  {
    name: 'Stepped Garden Terraces (8 House style)',
    category: 'Contemporary residential',
    description: 'A nine-storey apartment block that steps back 2.4 m at every floor from the third up on its street face, after BIG\'s 8 House and Bosco Verticale. Every unit gets a planted terrace behind a glass balustrade. White render with timber slab soffits and dark aluminium windows in two-light bays sits over a 4.2 m ground storey, under a green roof.',
    config: {
      ...NO_PODIUM, ...MASONRY, buildingType: 'residential', floors: 9, F: 3.15, groundFloorHt: 4.2,
      ...palette({ wall: '#ebe7df', glass: '#2c353b', frame: '#3a3d40', trim: '#b08a62', roof: '#5b6a52', accent: '#b08a62', door: '#3a3d40' }),
      wallTex: 'wall-stucco-fine', roofTex: 'roof-membrane-light',
      bayWidth: 3.0, pierWidth: 0.5, pierProjection: 0.04, glassRecess: 0.18, lightsPerBay: 2, transomHeight: 0,
      tierEvery: 1, tierStart: 3, tierDepth: 2.4, tierCount: 7, tierFaces: 'street', terraceRail: 'glass', setbackTerraces: true,
      entryType: 'door', entryEvery: 6, separatorStyle: 'slab-edge', separatorEvery: 1, sH: 0.25, sW: 0.12,
      roofProfile: 'green', roofAccentCol: '#66835f', parapetH: 0.6, parapetThick: 0.25, corniceH: 0, corniceOut: 0, penthouseF: 0
    }
  }
];

const GLASS_CATEGORY = 'Glass & metal towers';
const kept = Object.entries(KEPT).map(([name, spec]) => ({
  name, category: GLASS_CATEGORY, description: spec.description, config: spec.config
}));

const ALL = [...SPECS, ...MODERN, ...kept];
if (ALL.length !== 37) throw new Error(`Expected 37 presets, got ${ALL.length}`);

const makePreset = spec => {
  const config = { ...BASE, ...spec.config, viewTransparency: 'balanced', facadeAlpha: 1, windowAlpha: 1 };
  /* Panelization follows the articulation choice, as cfg() derives it in the editor. */
  config.enablePanelization = config.facadeArticulation === 'panel-grid';
  config.enableRibs = config.facadeArticulation === 'vertical-fins';
  /* Fin and structure members follow the articulation controls, as cfg() derives them. */
  const structure = ['expressed-frame', 'lattice'].includes(config.facadeArticulation);
  config.ribCount = config.enableRibs ? config.facadeArticulationDensity : 0;
  config.ribDepth = config.facadeArticulationDepth;
  config.ribWidth = config.facadeArticulationWidth;
  config.ribColor = config.facadeArticulationColor;
  config.exoType = config.facadeArticulation === 'lattice' ? 'lattice' : (config.facadeArticulation === 'expressed-frame' ? 'vertical' : 'none');
  config.exoSize = config.facadeArticulationWidth;
  config.exoOffset = structure ? config.facadeArticulationDepth : 0;
  config.exoDensity = structure ? config.facadeArticulationDensity : 0;
  config.exoColor = config.facadeArticulationColor;
  const unknown = Object.keys(spec.config).filter(key => !(key in BASE));
  if (unknown.length) throw new Error(`${spec.name}: unknown config keys ${unknown.join(', ')}`);
  return { name: spec.name, category: spec.category, description: spec.description, config };
};

const payload = { schema: 1, presets: ALL.map(makePreset) };
const outputUrl = new URL(process.argv[2] ? `file://${process.argv[2]}` : '../presets/defaults.json', import.meta.url);
fs.writeFileSync(outputUrl, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${payload.presets.length} presets to ${outputUrl.pathname}`);
