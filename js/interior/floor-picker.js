import { floorLabel } from "./state.js";
/** Native select provides a scrollable accessible picker even for 120 floors. */
export function mountFloorPicker(host, store, onSettled = () => {}) {
  host.classList.add("interior-picker");
  host.innerHTML =
    '<label>Floor <select aria-label="Active floor"></select></label><button type="button" data-jump="0">Ground</button><button type="button" data-jump="top">Top</button><span role="status" aria-live="polite"></span>';
  const select = host.querySelector("select"),
    status = host.querySelector("[role=status]");
  store.floors.forEach((floor, i) =>
    select.add(new Option(floorLabel(floor), String(i))),
  );
  const sync = () => {
    select.value = String(store.index);
    select.setAttribute(
      "aria-valuetext",
      `Floor ${store.current.roof ? "Roof" : store.current.index} of ${store.floors.filter((f) => !f.roof).length}`,
    );
  };
  select.addEventListener("change", () => store.select(select.value));
  select.addEventListener("keydown", (event) => {
    const jumps = {
      Home: 0,
      End: store.floors.length - 1,
      PageUp: store.index + 10,
      PageDown: store.index - 10,
    };
    if (event.key in jumps) {
      event.preventDefault();
      store.select(jumps[event.key]);
    }
  });
  host.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    const previous=store.index;
    store.select(button.dataset.jump==='top'?Math.max(0,store.floors.findLastIndex(f=>!f.roof)):0);
    if(store.index===previous)onSettled(store.index);
  }));
  const tiers = store.floors.filter((f) => f.setback);
  if (tiers.length) {
    const jump = document.createElement("select");
    jump.setAttribute("aria-label", "Jump to setback");
    jump.add(new Option("Setback…", ""));
    tiers.forEach((f) =>
      jump.add(new Option(floorLabel(f), String(store.floors.indexOf(f)))),
    );
    jump.addEventListener("change", () => {
      if (jump.value !== "") store.select(jump.value);
    });
    host.append(jump);
  }
  const unsub = store.subscribe(() => {
    sync();
    onSettled(store.index);
  });
  sync();
  return {
    busy(value, message = "Loading floor…") {
      host.setAttribute("aria-busy", String(value));
      status.textContent = message;
    },
    dispose: unsub,
  };
}
