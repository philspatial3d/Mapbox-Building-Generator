/** Interior state is deliberately independent of camera, calibration and heading. */
export const INTERIOR_SCHEMA = 2;
export const STYLES = {
  warm: {
    name: "Warm Contemporary",
    wall: "#e9e3d8",
    floor: "#aa8160",
    wood: "#805a3c",
    textile: "#b2a48e",
    stone: "#d6cbb9",
    metal: "#514d46",
  },
  quiet: {
    name: "Quiet Minimal",
    wall: "#eeede7",
    floor: "#c2b8a4",
    wood: "#b8a68a",
    textile: "#c3c5bd",
    stone: "#dadbd5",
    metal: "#484d4b",
  },
  classic: {
    name: "Classic Residential",
    wall: "#e6dfd2",
    floor: "#79563c",
    wood: "#60412f",
    textile: "#788478",
    stone: "#d8cdb7",
    metal: "#a18a58",
  },
  workplace: {
    name: "Contemporary Workplace",
    wall: "#e5e6e2",
    floor: "#92958f",
    wood: "#a78c66",
    textile: "#687c80",
    stone: "#c6c6bc",
    metal: "#464e50",
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
