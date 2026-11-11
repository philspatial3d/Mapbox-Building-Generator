/** Interior state is deliberately independent of camera, calibration and heading. */
export const INTERIOR_SCHEMA = 2;
/* Each style is a designed scheme, not just a tint: a quiet base (wall, ceiling,
 * floor, joinery), one feature colour for a single wall per room, two accent
 * textiles that recur on cushions/throws/art, and a carpet for workplaces. */
export const STYLES = {
  warm: {
    name: "Warm Contemporary",
    wall: "#ece5da",
    ceiling: "#f7f4ef",
    floor: "#b48c68",
    wood: "#7d5a3f",
    textile: "#cbbba2",
    linen: "#f1ebe1",
    stone: "#e4dacd",
    metal: "#2f2c29",
    accent: "#b07a5e",
    soft: "#c0633f",
    soft2: "#6e7b5f",
    throw: "#d9c6a5",
    brass: "#b08d57",
    carpet: "#8c8a85",
    felt: "#7e8a78",
    art: ["#c0633f", "#e6cfaa", "#6e7b5f", "#2f3a40", "#f2ead9", "#d79a6b"],
  },
  quiet: {
    name: "Quiet Minimal",
    wall: "#f1f0eb",
    ceiling: "#f9f9f7",
    floor: "#d3c4aa",
    wood: "#c7b293",
    textile: "#d8d4cb",
    linen: "#f4f2ed",
    stone: "#e8e6e1",
    metal: "#35393b",
    accent: "#cbc5b9",
    soft: "#8c9b9e",
    soft2: "#30363a",
    throw: "#e6e0d4",
    brass: "#a99a80",
    carpet: "#a19d96",
    felt: "#9aa29f",
    art: ["#30363a", "#d8d4cb", "#8c9b9e", "#c7b293", "#f4f2ee", "#6d7a80"],
  },
  classic: {
    name: "Classic Residential",
    wall: "#e8e0d1",
    ceiling: "#f4f0e8",
    floor: "#7a573d",
    wood: "#5d402d",
    textile: "#4d5e54",
    linen: "#efe8da",
    stone: "#ddd2bc",
    metal: "#a88a52",
    accent: "#3e4e48",
    soft: "#a8783d",
    soft2: "#7a3030",
    throw: "#c9b48a",
    brass: "#b8964f",
    carpet: "#6e6458",
    felt: "#6a6f5c",
    art: ["#3e4e48", "#a8783d", "#7a3030", "#e6dcc6", "#2b2b28", "#8c9a86"],
  },
  workplace: {
    name: "Contemporary Workplace",
    wall: "#eceeec",
    ceiling: "#f5f6f5",
    floor: "#b39570",
    wood: "#b39570",
    textile: "#3e4648",
    linen: "#eef0ee",
    stone: "#dcdbd5",
    metal: "#2c3133",
    accent: "#2f5d62",
    soft: "#d08c45",
    soft2: "#8aa08c",
    throw: "#c9cfc9",
    brass: "#a9927a",
    carpet: "#6b706f",
    felt: "#5d6e6a",
    art: ["#2f5d62", "#d08c45", "#8aa08c", "#e9ece8", "#24292b", "#b9c8c4"],
  },
};
export function interiorStorageKey(site) {
  return Number.isFinite(site?.lng) && Number.isFinite(site?.lat)
    ? `mbg.interior.v2.${site.lng.toFixed(6)}.${site.lat.toFixed(6)}`
    : null;
}
export function migrateSettings(value = {}) {
  return {
    schema: INTERIOR_SCHEMA,
    style: STYLES[value.style] ? value.style : "warm",
    rooms: Object.fromEntries(
      Object.entries(value.rooms || {}).filter(([, v]) => STYLES[v]),
    ),
    furnishing: Object.fromEntries(
      Object.entries(value.furnishing || {}).filter(([, v]) => v === "clear"),
    ),
    cubicles: value.cubicles === true,
    // Until someone picks a style, the viewer chooses one to suit the building.
    styleChosen: value.styleChosen === true,
    activeFloor: Math.max(0, Math.floor(Number(value.activeFloor) || 0)),
  };
}
export function floorLabel(floor, count) {
  return floor.roof
    ? "Roof / Crown"
    : `${floor.index === 0 ? "G" : floor.index}${floor.podium ? " · Podium" : ""}${floor.setback ? " · Setback" : ""}${floor.plant ? " · Plant" : ""}`;
}
export function createFloorState(floors, initial = 0) {
  if (!Array.isArray(floors) || !floors.length)
    throw new TypeError("At least one floor is required");
  let index = Math.max(0, Math.min(floors.length - 1, initial));
  const listeners = new Set();
  return {
    floors,
    get index() {
      return index;
    },
    get current() {
      return floors[index];
    },
    select(next) {
      const n = Math.max(
        0,
        Math.min(floors.length - 1, Math.round(Number(next) || 0)),
      );
      if (n === index) return;
      index = n;
      listeners.forEach((fn) => fn(index));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
/** Debounced, cancellable build transactions; at most active floor and its neighbours. */
export function createFloorStream(build, dispose, onReady, delay = 120) {
  let generation = 0,
    timer,
    controller;
  let current = [];
  return {
    select(index, count) {
      const g = ++generation;
      clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      timer = setTimeout(async () => {
        const next = [];
        try {
          for (const i of [index, index - 1, index + 1].filter(
            (i) => i >= 0 && i < count,
          )) {
            const result = await build(i, signal);
            if (result) next.push(result);
            if (signal.aborted || g !== generation) {
              next.forEach(dispose);
              return;
            }
          }
          current.forEach(dispose);
          current = next;
          onReady(next, index);
        } catch (error) {
          next.forEach(dispose);
          if (!signal.aborted) {
            current.forEach(dispose);
            current = [];
            onReady([], index, error);
          }
        }
      }, delay);
    },
    dispose() {
      generation++;
      clearTimeout(timer);
      controller?.abort();
      current.forEach(dispose);
      current = [];
    },
  };
}
const NEXT = {
  idle: "called",
  called: "arriving",
  arriving: "opening",
  opening: "boarding",
  boarding: "closing",
  closing: "travelling",
  travelling: "arrived",
  arrived: "idle",
};
export function createElevator(onChange = () => {}) {
  let state = "idle",
    elapsed = 0,
    origin = 0,
    destination = 0;
  return {
    get state() {
      return state;
    },
    get origin() {
      return origin;
    },
    get destination() {
      return destination;
    },
    call(from, to) {
      if (state !== "idle" || from === to) return false;
      origin = from;
      destination = to;
      state = "called";
      elapsed = 0;
      onChange(state);
      return true;
    },
    board() {
      if (state !== "boarding") return false;
      state = "closing";
      elapsed = 0;
      onChange(state);
      return true;
    },
    tick(dt) {
      if (state === "idle" || state === "boarding" || state === "arrived")
        return;
      elapsed += Math.max(0, Math.min(dt, 0.1));
      const duration =
        state === "boarding"
          ? 1.5
          : state === "travelling"
            ? Math.max(1, Math.abs(destination - origin) * 0.3)
            : 0.65;
      if (elapsed >= duration) {
        elapsed = 0;
        state = NEXT[state];
        onChange(state);
      }
    },
    exit() {
      if (state !== "arrived") return false;
      state = "idle";
      elapsed = 0;
      onChange(state);
      return true;
    },
    progress() {
      return state === "travelling"
        ? Math.min(
            1,
            elapsed / Math.max(1, Math.abs(destination - origin) * 0.3),
          )
        : 0;
    },
    cancel() {
      state = "idle";
      elapsed = 0;
      onChange(state);
    },
  };
}
/** XZ polygon containment with courtyard holes, used only by the virtual camera. */
export function insideRing(x, z, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit;
  }
  return hit;
}
export function insidePolygon(x, z, rings) {
  if (!rings?.[0]?.length) return false;
  return (
    insideRing(x, z, rings[0]) &&
    !rings.slice(1).some((r) => insideRing(x, z, r))
  );
}
