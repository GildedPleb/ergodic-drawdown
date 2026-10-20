import { mkdirSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

// V32-BUILD §1T: wheel-out spam, pan past the end and pinch-out never break the window's bounds
// (inside Today … the last sample, no wider, 8 samples at the least).
const SHOTS = process.env["ZOOM_SHOTS"];
const PLOT = '[data-layer="front"]';

type Window = { from: number; to: number; last: number };

const windowOf = async (page: Page): Promise<Window> => {
  const raw = (await page.locator(PLOT).getAttribute("data-view")) ?? "";
  const [from = Number.NaN, to = Number.NaN, last = Number.NaN] = raw.split(" ").map(Number);
  return { from, to, last };
};

const expectBounded = (w: Window): void => {
  expect(w.last).toBeGreaterThan(8);
  expect(w.from).toBeGreaterThanOrEqual(0);
  expect(w.to).toBeLessThanOrEqual(w.last);
  expect(w.to - w.from).toBeGreaterThanOrEqual(7 - 1e-3);
  expect(w.to - w.from).toBeLessThanOrEqual(w.last);
};

const ready = async (page: Page): Promise<{ x: number; y: number; w: number }> => {
  await page.goto("/");
  await expect
    .poll(async () => (await page.locator(PLOT).getAttribute("aria-label")) ?? "", {
      timeout: 60_000,
    })
    .toMatch(/reaches|grows past/);
  await expect
    .poll(async () => (await windowOf(page)).last, { timeout: 30_000 })
    .toBeGreaterThan(8);
  const box = await page.locator(PLOT).boundingBox();
  if (box === null) throw new Error("no plot");
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.4, w: box.width };
};

const shot = async (page: Page, name: string): Promise<void> => {
  if (SHOTS === undefined) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(400); // past the 150ms Y ease
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

const reset = (page: Page) => page.getByRole("button", { name: "Reset zoom" });

test.beforeEach(({ browserName }, info) => {
  test.skip(
    info.project.name !== `${browserName}-1440x900` &&
      info.project.name !== `${browserName}-390x844`,
    "zoom runs at 1440 and 390",
  );
});

test("1T: wheel-out spam never widens past the data; wheel-in stops at 8 samples", async ({
  page,
}, info) => {
  test.skip(!info.project.name.endsWith("1440x900"), "mouse wheel at 1440");
  const at = await ready(page);
  const full = await windowOf(page);
  expect(full.from).toBe(0);
  expect(full.to).toBe(full.last);
  await page.mouse.move(at.x, at.y);
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 800);
    expectBounded(await windowOf(page));
  }
  expect(await windowOf(page)).toEqual(full);
  await expect(reset(page)).toHaveCount(0);
  for (let i = 0; i < 60; i++) {
    await page.mouse.move(at.x + (i % 7) * 60 - 180, at.y);
    await page.mouse.wheel(0, -600);
  }
  const deep = await windowOf(page);
  expectBounded(deep);
  expect(deep.to - deep.from).toBeCloseTo(7, 3);
  await expect(reset(page)).toBeVisible();
  await page.mouse.move(at.x - at.w * 0.3, at.y);
  for (let i = 0; i < 25; i++) {
    await page.mouse.wheel(0, 1200);
    expectBounded(await windowOf(page));
  }
  expect(await windowOf(page)).toEqual(full);
  await expect(reset(page)).toHaveCount(0);
});

test("1T: pan past either end stops hard at the end; the page shows grabbing while it pans", async ({
  page,
}, info) => {
  test.skip(!info.project.name.endsWith("1440x900"), "mouse drag at 1440");
  const at = await ready(page);
  await page.mouse.move(at.x, at.y);
  for (let i = 0; i < 2; i++) await page.mouse.wheel(0, -100);
  const zoomed = await windowOf(page);
  const span = zoomed.to - zoomed.from;
  expect(span).toBeLessThan(zoomed.last);
  await shot(page, "1440-zoomed");
  // Drag left (later in time), far past the end, in several strokes.
  for (let stroke = 0; stroke < 4; stroke++) {
    await page.mouse.move(at.x + 400, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x - 300, at.y, { steps: 6 });
    if (stroke === 0)
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).cursor)).toBe(
        "grabbing",
      );
    await page.mouse.move(at.x - 600, at.y, { steps: 4 });
    await page.mouse.up();
    expectBounded(await windowOf(page));
  }
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).cursor)).toBe("auto");
  let w = await windowOf(page);
  expect(w.to).toBeCloseTo(w.last, 3);
  expect(w.to - w.from).toBeCloseTo(span, 3);
  await shot(page, "1440-panned-to-end");
  // Shift+wheel and → keep pushing: nothing moves past the end.
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 2000);
  await page.keyboard.down("Shift");
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 2000);
  await page.keyboard.up("Shift");
  // (plain wheel zooms out: that's fine, still bounded)
  expectBounded(await windowOf(page));
  // Back in, then ← spam and a drag the other way past Today.
  await page.locator(PLOT).focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("+");
  for (let i = 0; i < 80; i++) await page.keyboard.press("ArrowLeft");
  w = await windowOf(page);
  expectBounded(w);
  expect(w.from).toBe(0);
  for (let i = 0; i < 80; i++) await page.keyboard.press("ArrowRight");
  w = await windowOf(page);
  expect(w.to).toBeCloseTo(w.last, 3);
  // 0 resets; so does double-click; so does the Reset zoom button.
  await page.keyboard.press("0");
  expect((await windowOf(page)).to - (await windowOf(page)).from).toBe(w.last);
  await page.keyboard.press("+");
  await page.mouse.dblclick(at.x, at.y);
  await expect(reset(page)).toHaveCount(0);
  await page.keyboard.press("+");
  await reset(page).click();
  await expect(reset(page)).toHaveCount(0);
  expect(await windowOf(page)).toEqual({ from: 0, to: w.last, last: w.last });
});

/** Two touch pointers on the plot, from `a` apart to `b` apart, about the plot's centre. */
const pinch = async (page: Page, a: number, b: number): Promise<void> => {
  await page.evaluate(
    ({ sel, a: start, b: end }) => {
      const el = document.querySelector(sel);
      if (el === null) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.4;
      const fire = (type: string, id: number, x: number): void => {
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id,
            pointerType: "touch",
            isPrimary: id === 11,
            clientX: x,
            clientY: cy,
            button: 0,
            bubbles: true,
            cancelable: true,
          }),
        );
      };
      fire("pointerdown", 11, cx - start / 2);
      fire("pointerdown", 12, cx + start / 2);
      for (let k = 1; k <= 8; k++) {
        const d = start + ((end - start) * k) / 8;
        fire("pointermove", 11, cx - d / 2);
        fire("pointermove", 12, cx + d / 2);
      }
      fire("pointerup", 11, cx - end / 2);
      fire("pointerup", 12, cx + end / 2);
    },
    { sel: PLOT, a, b },
  );
};

test("1T: two-finger pinch zooms in; pinch-out spam never widens past the data", async ({
  page,
}) => {
  const at = await ready(page);
  const full = await windowOf(page);
  await pinch(page, at.w * 0.1, at.w * 0.6);
  const zin = await windowOf(page);
  expectBounded(zin);
  expect(zin.to - zin.from).toBeLessThan(full.last * 0.5);
  await expect(reset(page)).toBeVisible();
  await shot(page, `${String(page.viewportSize()?.width ?? 0)}-pinched-in`);
  for (let i = 0; i < 12; i++) {
    await pinch(page, at.w * 0.8, at.w * 0.02);
    expectBounded(await windowOf(page));
  }
  expect(await windowOf(page)).toEqual(full);
  await expect(reset(page)).toHaveCount(0);
  await shot(page, `${String(page.viewportSize()?.width ?? 0)}-full`);
});
