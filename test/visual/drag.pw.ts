import { mkdirSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

// §1L item 5 (Form, ships first): press the logo and drag. The sheet's top edge follows the
// pointer 1:1 and opens; dragging down hides it. One pointer-events path for mouse and touch,
// phone and desktop (desktop closes too now: closed / half = the cap / full = up to the header).
const SIZES = ["390x844", "1440x900"] as const;

test.beforeEach(({ browserName }, info) => {
  test.skip(
    !SIZES.some((s) => info.project.name === `${browserName}-${s}`),
    "logo drag runs at 390x844 and 1440x900",
  );
});

const top = async (page: Page): Promise<number> =>
  page.evaluate(() => document.getElementById("models-sheet")?.getBoundingClientRect().top ?? 0);
const stop = async (page: Page): Promise<string> =>
  page.evaluate(() => document.querySelector<HTMLElement>("[data-sheet]")?.dataset["sheet"] ?? "");

/** The headline (the chart's accessible name) once the engine has drawn the fan. */
const DRAWN = /reaches|grows past/;
const headline = async (page: Page): Promise<string> =>
  (await page.locator('[data-layer="front"]').getAttribute("aria-label")) ?? "";

/**
 * How much of the chart is drawn: the share of canvas pixels that differ from the ground (the
 * top-left pixel), and the canvas height in CSS px. A blanked or cleared canvas reads 0.
 */
const ink = async (page: Page): Promise<{ share: number; h: number }> =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('[data-layer="front"] canvas');
    const ctx = c?.getContext("2d");
    if (c === null || c === undefined || ctx === null || ctx === undefined)
      return { share: 0, h: 0 };
    if (c.width === 0 || c.height === 0) return { share: 0, h: 0 };
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const [r, g, b, a] = [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const off =
        Math.abs((d[i] ?? 0) - r) +
        Math.abs((d[i + 1] ?? 0) - g) +
        Math.abs((d[i + 2] ?? 0) - b) +
        Math.abs((d[i + 3] ?? 0) - a);
      if (off > 24) n += 1;
    }
    return { share: n / (d.length / 4), h: c.getBoundingClientRect().height };
  });

/** Opens the app and waits until the chart has drawn: headline sentence, fan on the canvas. */
const ready = async (page: Page): Promise<number> => {
  await page.goto("/");
  await expect.poll(async () => DRAWN.test(await headline(page)), { timeout: 60_000 }).toBe(true);
  await page.waitForTimeout(300);
  const { share } = await ink(page);
  expect(share).toBeGreaterThan(0.02);
  return share;
};

/** At every step of a drag the chart keeps its last drawing: headline there, canvas not blank. */
const kept = async (page: Page, base: number): Promise<void> => {
  expect(DRAWN.test(await headline(page))).toBe(true);
  const { share, h } = await ink(page);
  if (h >= 40) expect(share).toBeGreaterThan(base * 0.3);
};

test("item 5: a slow logo drag up opens 1:1, a slow drag down hides it", async ({ page }, info) => {
  const base = await ready(page);
  const logo = page.locator('[aria-controls="models-sheet"]:not([role="tab"])');
  await expect(logo).toHaveAttribute("aria-expanded", "false");
  const dir = process.env["DRAG_FRAMES"];
  const size = info.project.name.replace(/^\w+-/, "");
  const shot = async (name: string): Promise<void> => {
    if (dir === undefined) return;
    mkdirSync(`${dir}/drag-${size.split("x")[0] ?? size}`, { recursive: true });
    await page.screenshot({ path: `${dir}/drag-${size.split("x")[0] ?? size}/${name}.png` });
  };
  const box = await logo.boundingBox();
  if (box === null) throw new Error("no logo");
  const x = box.x + box.width / 2;
  const y0 = box.y + box.height / 2;
  const t0 = await top(page);
  await shot("up-00");
  await page.mouse.move(x, y0);
  await page.mouse.down();
  const vh = page.viewportSize()?.height ?? 800;
  const travel = Math.round(vh * 0.3); // ends between half and full: nearest stop decides
  let worst = 0;
  for (let i = 1; i <= 10; i++) {
    const y = y0 - (travel * i) / 10;
    await page.mouse.move(x, y);
    await page.waitForTimeout(60);
    if (i > 1) worst = Math.max(worst, Math.abs((await top(page)) - (t0 + (y - y0))));
    await kept(page, base);
    await shot(`up-${String(i).padStart(2, "0")}`);
  }
  await page.waitForTimeout(200); // held still: no flick
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(worst).toBeLessThanOrEqual(2);
  expect(await stop(page)).not.toBe("closed");
  await expect(logo).toHaveAttribute("aria-expanded", "true");
  await kept(page, base);
  await shot("up-released");

  // Slow drag down from wherever it rests to below the closed position: it hides.
  const b2 = await logo.boundingBox();
  if (b2 === null) throw new Error("no logo");
  const y1 = b2.y + b2.height / 2;
  const t1 = await top(page);
  await page.mouse.move(x, y1);
  await page.mouse.down();
  const down = vh - y1 - 20;
  worst = 0;
  for (let i = 1; i <= 10; i++) {
    const y = y1 + (down * i) / 10;
    await page.mouse.move(x, y);
    await page.waitForTimeout(60);
    const want = t1 + (y - y1);
    const got = await top(page);
    // Past closed the sheet rubber-bands (a third), so 1:1 is checked until it gets there.
    if (i > 1 && i < 6) worst = Math.max(worst, Math.abs(got - want));
    await kept(page, base);
    await shot(`down-${String(i).padStart(2, "0")}`);
  }
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(worst).toBeLessThanOrEqual(2);
  expect(await stop(page)).toBe("closed");
  await expect(logo).toHaveAttribute("aria-expanded", "false");
  await kept(page, base);
  await shot("down-released");
});

const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';
const said = async (page: Page): Promise<string> =>
  (await page.locator('[role="status"]').textContent()) ?? "";

const tapLogo = async (page: Page): Promise<string> => {
  const b = await page.locator(LOGO).boundingBox();
  if (b === null) throw new Error("no logo");
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(350);
  return stop(page);
};

test("item 5 + §1R: a flick snaps in its direction; the next tap and Enter carry on", async ({
  page,
}) => {
  await ready(page);
  const logo = page.locator(LOGO);
  const box = await logo.boundingBox();
  if (box === null) throw new Error("no logo");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // A fast 60px flick up from closed passes half's nearest-stop zone only by velocity.
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 3; i++) await page.mouse.move(x, y - i * 20);
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(await stop(page)).toBe("half");
  // §1R: the drag went up, so the tap carries on up to full; then it comes back down.
  expect(await tapLogo(page)).toBe("full");
  expect(await said(page)).toBe("Sheet full");
  // Enter and Space act as taps.
  await logo.focus();
  await page.keyboard.press("Enter");
  await expect(logo).toHaveAttribute("aria-expanded", "true");
  expect(await stop(page)).toBe("half");
  await page.keyboard.press("Space");
  await expect(logo).toHaveAttribute("aria-expanded", "false");
  expect(await stop(page)).toBe("closed");
});

test("§1R: five taps from closed visit half, full, half, closed, half (390)", async ({
  page,
}, info) => {
  test.skip(!info.project.name.endsWith("390x844"), "phone check");
  await ready(page);
  const seen: string[] = [];
  const heard: string[] = [];
  for (let i = 0; i < 5; i++) {
    seen.push(await tapLogo(page));
    heard.push(await said(page));
  }
  expect(seen).toEqual(["half", "full", "half", "closed", "half"]);
  expect(heard).toEqual([
    "Sheet half open",
    "Sheet full",
    "Sheet half open",
    "Sheet closed",
    "Sheet half open",
  ]);
});

test("§1P: the grab point's keys: ↑/↓ one stop, Home full, End closed", async ({ page }) => {
  await ready(page);
  const logo = page.locator(LOGO);
  await logo.focus();
  const press = async (key: string): Promise<string> => {
    await page.keyboard.press(key);
    await page.waitForTimeout(50);
    return stop(page);
  };
  expect([
    await press("ArrowUp"),
    await press("ArrowUp"),
    await press("ArrowUp"),
    await press("ArrowDown"),
    await press("End"),
    await press("Home"),
  ]).toEqual(["half", "full", "full", "half", "closed", "full"]);
  // The page doesn't scroll under the keys; focus stays on the point.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(logo).toBeFocused();
});
