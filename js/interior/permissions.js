/** Each permission is independent; gesture-gated requests start before any await. */
export function mountPermissionSheet({ camera, location, orientationGranted }) {
  const host = document.createElement("div");
  host.id = "permissionSheet";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-labelledby", "permissionTitle");
  host.innerHTML =
    '<section><h2 id="permissionTitle">Enter your building</h2><p>Camera imagery stays on this device and is used for the live view and lighting. Motion helps align the view; location places the building near its real site.</p><button type="button" data-enable>Enable Camera &amp; Motion</button><button type="button" data-preview>Continue with preview</button><p id="permissionResults" role="status" aria-live="polite">Camera, orientation, motion and location will be requested separately. You can use the virtual walkthrough without them.</p><p>If access is denied, change this site’s browser permissions before retrying.</p></section>';
  document.body.append(host);
  const button = host.querySelector("[data-enable]"),
    results = host.querySelector("[role=status]"),
    states = {};
  const run = (name, promise) =>
    Promise.resolve(promise)
      .then(
        () => {
          states[name] = "granted";
        },
        (error) => {
          states[name] =
            error?.name === "NotSupportedError" ? "unavailable" : "denied";
        },
      )
      .finally(() => {
        results.textContent = Object.entries(states)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
      });
  button.onclick = () => {
    button.disabled = true;
    const orientation =
      typeof DeviceOrientationEvent === "undefined"
        ? Promise.reject(new DOMException("Unavailable", "NotSupportedError"))
        : typeof DeviceOrientationEvent.requestPermission === "function"
          ? DeviceOrientationEvent.requestPermission()
          : Promise.resolve("granted");
    const motion =
      typeof DeviceMotionEvent === "undefined"
        ? Promise.reject(new DOMException("Unavailable", "NotSupportedError"))
        : typeof DeviceMotionEvent.requestPermission === "function"
          ? DeviceMotionEvent.requestPermission()
          : Promise.resolve("granted");
    const granted = (p) =>
      p.then((value) => {
        if (value !== "granted") throw new Error("Denied");
      });
    // Call all four in the original click gesture, independently of each other's outcome.
    const jobs = [
      run("Camera", camera()),
      run("Location", location()),
      run("Orientation", granted(orientation).then(orientationGranted)),
      run("Motion", granted(motion)),
    ];
    void Promise.allSettled(jobs).then(() => {
      button.disabled = false;
      button.textContent = "Retry permissions";
    });
  };
  host.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      host.hidden = true;
      return;
    }
    if (event.key === "Tab") {
      const buttons = [...host.querySelectorAll("button:not(:disabled)")];
      const first = buttons[0],
        last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  button.focus();
  host.querySelector("[data-preview]").onclick = () => {
    host.hidden = true;
  };
  return {
    open() {
      host.hidden = false;
      button.focus();
    },
    dispose() {
      host.remove();
    },
    states,
  };
}
