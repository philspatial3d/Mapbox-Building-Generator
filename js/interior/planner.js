/** One worker per handoff; a pure source-engine fallback supports restricted hosts. */
export function createInteriorPlanner(fallback) {
  let worker = null,
    unavailable = false,
    sequence = 0;
  const pending = new Map();
  try {
    if (typeof Worker === "undefined") throw new Error("Workers unavailable");
    worker = new Worker(new URL("./planner.worker.js", import.meta.url), {
      name: "Interior floor planning",
    });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      pending.delete(data.id);
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data.plan);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      unavailable = true;
      worker.terminate();
      worker = null;
      for (const job of pending.values()) job.retry();
      pending.clear();
    };
  } catch {
    unavailable = true;
  }
  return {
    get backend() {
      return unavailable ? "main-thread-fallback" : "worker";
    },
    plan(floor, config) {
      const retry = () =>
        new Promise((resolve, reject) =>
          setTimeout(() => {
            try {
              resolve(fallback(floor, config));
            } catch (error) {
              reject(error);
            }
          }, 0),
        );
      if (unavailable) return retry();
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, {
          resolve,
          reject,
          retry: () => retry().then(resolve, reject),
        });
        worker.postMessage({ id, floor, config });
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      for (const job of pending.values())
        job.reject(new DOMException("Planning cancelled", "AbortError"));
      pending.clear();
    },
  };
}
