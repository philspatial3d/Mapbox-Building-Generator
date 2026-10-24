#!/usr/bin/env node
// Run against a locally staged AR payload in the Playwright CLI browser.
// node scripts/check_interior_browser.mjs interior-final /tmp/interior-browser.json
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const session = process.argv[2] || "interior-final";
const code = async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  await page.waitForFunction(() => window.__arDebug?.interior);
  if (
    await page
      .getByRole("button", { name: "Continue with preview" })
      .isVisible()
  )
    await page.getByRole("button", { name: "Continue with preview" }).click();
  const control = page.getByRole("button", { name: "Controls", exact: true });
  const open = async () => {
    if ((await control.getAttribute("aria-expanded")) !== "true")
      await control.click();
  };
  const close = async () => {
    if ((await control.getAttribute("aria-expanded")) === "true")
      await page.getByRole("button", { name: "Close controls" }).click();
  };
  const tracking = () =>
    page.evaluate(() => {
      const s = window.__arDebug.state;
      return JSON.stringify({
        heading: s.headingDeg,
        locked: s.headingLocked,
        offset: s.manualOffsetM,
        geo: s.geoRoot.matrix.elements,
        camera: s.camera.position.toArray(),
        quaternion: s.camera.quaternion.toArray(),
      });
    });
  const before = await tracking();
  const layouts = [];
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [320, 640],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await open();
    const layout = await page.evaluate(() => {
      const box = (id) => {
        const b = document.getElementById(id).getBoundingClientRect();
        return {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          right: b.right,
          bottom: b.bottom,
        };
      };
      const small = [
        ...document.querySelectorAll(
          "#panel button,#panel select,#arInteriorControls button,#arInteriorControls select,#toolsToggle,#backToMap,#contextChip",
        ),
      ]
        .filter(
          (e) => e.checkVisibility() && e.getBoundingClientRect().height < 43.5,
        )
        .map((e) => e.id || e.textContent);
      return {
        width: innerWidth,
        height: innerHeight,
        panel: box("panel"),
        dock: box("arInteriorControls"),
        small,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        bodyOverflow:
          document.getElementById("panelBody").scrollWidth >
          document.getElementById("panelBody").clientWidth + 1,
        statusInside: !!document.getElementById("status").closest("#panel"),
        interiorInside: !!document
          .querySelector(".interior-tools")
          .closest("#panel"),
      };
    });
    assert(
      !layout.overflow && !layout.bodyOverflow,
      `Horizontal overflow at ${width}x${height}`,
    );
    assert(!layout.small.length, `Undersized touch controls: ${layout.small}`);
    assert(
      layout.statusInside && layout.interiorInside,
      "Interior and tracking controls must share the panel",
    );
    assert(
      layout.panel.x >= 0 &&
        layout.panel.right <= width + 1 &&
        layout.panel.bottom <= height + 1,
      "Panel outside viewport",
    );
    if (width <= 600)
      assert(
        layout.panel.bottom <= layout.dock.y + 2,
        "Phone panel overlaps the floor/movement dock",
      );
    layouts.push(layout);
    await close();
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  const settle = () =>
    page.waitForFunction(
      () =>
        document
          .querySelector("#arInteriorControls .interior-picker")
          .getAttribute("aria-busy") === "false",
    );
  await page.getByRole("button", { name: "Ground", exact: true }).click();
  await settle();
  await open();
  const room = page.getByLabel("Room override");
  const value = await room
    .locator("option")
    .evaluateAll(
      (options) =>
        options.find((o) => /living|workspace|bedroom/i.test(o.textContent))
          ?.value,
    );
  assert(
    value,
    "A habitable room is required for the browser regression fixture",
  );
  await room.selectOption(value);
  await page.getByLabel("Interior style").selectOption("quiet");
  await page.getByLabel("Interior style").selectOption("warm");
  await page.getByRole("button", { name: "Visit room", exact: true }).click();
  await settle();
  await page.waitForFunction(() => window.__arDebug.interior.walking);
  const geometry = await page.evaluate((value) => {
    const { interior: i, THREE } = window.__arDebug;
    const g = i.root.children.find((g) => g.userData.floor === i.store.current);
    const room = g.userData.rooms.find((r) => r.userData.roomId === value);
    const floorMesh = room.children.find(
      (o) => o.isMesh && !o.userData.furniture && !o.userData.ceiling,
    );
    floorMesh.geometry.computeBoundingBox();
    const b = floorMesh.geometry.boundingBox;
    const furniture = room.children.filter(
      (o) => o.isMesh && o.userData.furniture,
    );
    return {
      visible: room.visible,
      meshes: furniture.length,
      inside: furniture.every((o) => {
        o.geometry.computeBoundingBox();
        const c = o.geometry.boundingBox.getCenter(new THREE.Vector3());
        return (
          c.x >= b.min.x - 0.6 &&
          c.x <= b.max.x + 0.6 &&
          c.z >= b.min.z - 0.6 &&
          c.z <= b.max.z + 0.6
        );
      }),
      telemetry: i.telemetry(),
    };
  }, value);
  assert(
    geometry.visible && geometry.meshes && geometry.inside,
    "Batched imported models must stay in the selected translated room",
  );
  const canvas = page.locator("#xrCanvas");
  const c = await canvas.boundingBox();
  await page.mouse.move(c.width * 0.65, c.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(c.width * 0.7, c.height * 0.4, { steps: 8 });
  await page.mouse.up();
  const after = await tracking();
  assert(
    before === after,
    "UI, style, room and virtual look must not change physical tracking state",
  );
  assert(!errors.length, `Console errors: ${errors.join("; ")}`);
  return { layouts, geometry, trackingUnchanged: true, errors };
};
const output = execFileSync(
  join(homedir(), ".codex/skills/playwright/scripts/playwright_cli.sh"),
  ["-s=" + session, "run-code", code.toString()],
  { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
);
if (process.argv[3]) writeFileSync(process.argv[3], output);
process.stdout.write(output);
