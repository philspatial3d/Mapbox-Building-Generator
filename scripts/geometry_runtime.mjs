// Shared source extraction for deterministic checks and the worker build.
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
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
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
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    else if (ch === "[") square++;
    else if (ch === "]") square--;
    else if (ch === "{") curly++;
    else if (ch === "}") curly--;
    else if (ch === ";" && paren === 0 && square === 0 && curly === 0)
      return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed const ${name}`);
}

function extractTopLevelFunctions(source, asMap = false) {
  const functions = [];
  const names = new Set();
  const matcher = /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let match;
  while ((match = matcher.exec(source))) {
    const name = match[1];
    const parenStart = source.indexOf("(", match.index);
    const parenEnd = scanPair(source, parenStart, "(", ")");
    const bodyStart = source.indexOf("{", parenEnd);
    if (bodyStart < 0) throw new Error(`Missing body for ${name}`);
    const bodyEnd = scanPair(source, bodyStart, "{", "}");
    if (!names.has(name)) {
      functions.push([name, source.slice(match.index, bodyEnd + 1)]);
      names.add(name);
    }
    matcher.lastIndex = bodyEnd + 1;
  }
  return asMap
    ? new Map(functions)
    : functions.map(([, code]) => code).join("\n\n");
}

export function extractGeometryRuntime(html, roots = null) {
  const constNames = [
    "safe",
    "safeClone",
    "safeBuf",
    "safeDiff",
    "safeInt",
    "rand",
    "clamp",
    "lightenHex",
    "FACADE_PATTERN_PRESETS",
    "FACADE_LIGHT_PRESETS",
    "FACADE_CLIMATE_PRESETS",
    "EXTERIOR_LAYER_KEYS",
    "envelopeGuardLogCache",
    "PRIMARY_ENVELOPE_LAYERS",
    "SECONDARY_ENVELOPE_LAYERS",
    "ACCENT_ENVELOPE_LAYERS",
    "envelopeProfileCache",
    "TRANSPARENCY_MODE_LABELS",
    "EXPORT_SCHEMA_VERSION",
    "EXPORT_EDGE_RADIUS_M",
    "EXPORT_ROUNDED_ROOF",
    "EXPORT_RADIANCE",
    "EXPORT_SHADOW_INTENSITY",
    "MIN_POLY_AREA",
    "polyArea",
    "isUsablePoly",
    "BUILDING_ARCHETYPE_ORDER",
    "MATERIAL_SYSTEMS",
    "MATERIAL_SYSTEM_TEXTURES",
    "materialSystem",
    "BUILDING_ARCHETYPES",
    "MUNTIN_PATTERNS",
    "MUNTIN_W",
    "muntinPatternFor",
    "trimColorFor",
    "typologyPartCache",
    "pushMerged",
    "planFlowCache",
    "planFlowPivotCache",
    "PODIUM_STYLE_CONFIGS",
    "presetFieldMap",
    "EARTH_M_PER_DEG",
    "pointCoords",
    "unitForBearing",
    "bearingOfVector",
    "facadeGuideCache",
    "primaryBearingCache",
    "plateCorePointCache",
    "shellMemoCache",
    "shellBuf",
    "shellScaleCache",
    "shellFamilyCache",
    "PLAN_REUSE_TOLERANCE",
    "RIBBON_SPANDREL_PROFILES",
    "SETBACK_FACE_MODES",
    "massingContextCache",
    "tierPlateCache",
    "slotPlateCache",
    "bayLayoutCache",
    "zoneSplitCache",
    "MASSING_FEATURE_DEFAULTS",
    "isGableEnd",
    "pitchedRidgeCache",
    "obeliskCache",
    "PITCHED_ROOF_STYLES",
  ];
  /* unit floorplan engine helpers are top-level consts (fpX / FP_X) */
  [...html.matchAll(/^const ((?:fp|FP_)\w+)\s*=/gm)].forEach((match) => {
    if (!constNames.includes(match[1])) constNames.push(match[1]);
  });
  const definitions = new Map([
    ...constNames.map((name) => [name, extractConstStatement(html, name)]),
    ...extractTopLevelFunctions(html, true),
  ]);
  let selected = null;
  if (roots) {
    selected = new Set();
    const queue = [...roots];
    while (queue.length) {
      const name = queue.pop();
      if (selected.has(name)) continue;
      const code = definitions.get(name);
      if (!code) throw new Error("Missing runtime root " + name);
      selected.add(name);
      for (const token of code.match(/\b[A-Za-z_$][\w$]*\b/g) || [])
        if (definitions.has(token) && !selected.has(token)) queue.push(token);
    }
  }
  return [...definitions]
    .filter(([name]) => !selected || selected.has(name))
    .map(([, code]) => code)
    .join("\n\n");
}
