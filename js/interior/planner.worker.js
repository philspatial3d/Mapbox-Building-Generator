/* Same pinned Turf runtime as the editor. No DOM, Mapbox instance or tracking state. */
importScripts(
  "https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js",
  "./planner-runtime.js",
);
self.addEventListener("message", ({ data: { id, floor, config } }) => {
  try {
    self.postMessage({ id, plan: self.planInteriorFloor(floor, config) });
  } catch (error) {
    self.postMessage({
      id,
      error: error?.message || "Interior floor planning failed.",
    });
  }
});
