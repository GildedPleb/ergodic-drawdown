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

test("item 5: a slow logo drag up opens 1:1, a slow drag down hides it", async ({ page }, info) => {
  await page.goto("/");
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
    await shot(`up-${String(i).padStart(2, "0")}`);
  }
  await page.waitForTimeout(200); // held still: no flick
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(worst).toBeLessThanOrEqual(2);
  expect(await stop(page)).not.toBe("closed");
  await expect(logo).toHaveAttribute("aria-expanded", "true");
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
    await shot(`down-${String(i).padStart(2, "0")}`);
  }
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(worst).toBeLessThanOrEqual(2);
  expect(await stop(page)).toBe("closed");
  await expect(logo).toHaveAttribute("aria-expanded", "false");
  await shot("down-released");
});

test("item 5: a flick snaps in its direction; a tap and the keyboard still toggle", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator('[aria-controls="models-sheet"]:not([role="tab"])');
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
  // Tap: toggles closed.
  const b2 = await logo.boundingBox();
  if (b2 === null) throw new Error("no logo");
  await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2);
  await page.waitForTimeout(400);
  expect(await stop(page)).toBe("closed");
  // Keyboard: Enter on the focused logo opens; aria-expanded follows.
  await logo.focus();
  await page.keyboard.press("Enter");
  await expect(logo).toHaveAttribute("aria-expanded", "true");
  expect(await stop(page)).toBe("half");
});
