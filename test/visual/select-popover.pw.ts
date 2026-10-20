import { mkdirSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";

// V32-BUILD §1U: the open Select list lives in the top layer, flush to its field, every row shown.
const SIZES = ["390x844", "1440x900"] as const;
const SHOTS = "/workspace/forge-slice1/1P";
const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';

test.beforeEach(({ browserName }, info) => {
  test.skip(
    !SIZES.some((s) => info.project.name === `${browserName}-${s}`),
    "Select list checks run at 390x844 and 1440x900",
  );
});

const stop = async (page: Page): Promise<string> =>
  page.evaluate(() => document.querySelector<HTMLElement>("[data-sheet]")?.dataset["sheet"] ?? "");

/** Opens the sheet to `to` with the grab point (§1R: closed → half → full). */
const openSheet = async (page: Page, to: "half" | "full"): Promise<void> => {
  await page.goto("/");
  await page.locator("#v2-model").waitFor({ state: "attached" });
  const logo = page.locator(LOGO);
  await logo.focus();
  await page.keyboard.press(to === "full" ? "Home" : "ArrowUp");
  await expect.poll(async () => stop(page)).toBe(to);
  await page.waitForTimeout(350);
};

type Geometry = {
  open: boolean;
  inViewport: boolean;
  innerScroll: boolean;
  rows: number;
  visibleRows: number;
  flush: number;
  up: boolean;
  scrollbars: number;
};

/** The open list's geometry: every row hit-tested at its top and bottom edge (nothing clips it). */
const geometry = async (page: Page, id: string): Promise<Geometry> =>
  page.evaluate((sel) => {
    const list = document.getElementById(`${sel}-list`);
    const field = document.getElementById(sel);
    if (list === null || field === null) throw new Error("no select");
    const l = list.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    const up = l.bottom <= f.top + 1;
    const opts = [...list.querySelectorAll("li")];
    const seen = (li: Element): boolean => {
      const r = li.getBoundingClientRect();
      const x = r.left + r.width / 2;
      return [r.top + 2, r.bottom - 2].every((y) => {
        const hit = document.elementFromPoint(x, y);
        return hit !== null && li.contains(hit);
      });
    };
    const scrollbars = [...document.querySelectorAll("*")].filter((el) => {
      const s = getComputedStyle(el);
      const scrolls = s.overflowY === "auto" || s.overflowY === "scroll";
      const r = el.getBoundingClientRect();
      return scrolls && el.scrollHeight > el.clientHeight + 1 && r.height > 0 && r.width > 0;
    }).length;
    return {
      open: list.matches(":popover-open"),
      inViewport:
        l.top >= -0.5 &&
        l.left >= -0.5 &&
        l.bottom <= window.innerHeight + 0.5 &&
        l.right <= window.innerWidth + 0.5,
      innerScroll: list.scrollHeight > list.clientHeight + 1,
      rows: opts.length,
      visibleRows: opts.filter(seen).length,
      flush: up ? Math.abs(l.bottom - f.top) : Math.abs(l.top - f.bottom),
      up,
      scrollbars,
    };
  }, id);

const cases = [
  ["390x844", "half"],
  ["390x844", "full"],
  ["1440x900", "half"],
] as const;

for (const [size, at] of cases) {
  for (const id of ["v2-model", "v2-walk"]) {
    test(`§1U ${id} at ${size} (${at} sheet): every row shown, in the viewport, flush, no inner scroll`, async ({
      page,
    }, info) => {
      test.skip(!info.project.name.endsWith(size), size);
      await openSheet(page, at);
      const combo = page.locator(`#${id}`);
      await combo.scrollIntoViewIfNeeded();
      await combo.click();
      await expect(combo).toHaveAttribute("aria-expanded", "true");
      await expect(combo).toBeFocused();
      const g = await geometry(page, id);
      expect(g.open).toBe(true);
      expect(g.inViewport).toBe(true);
      expect(g.rows).toBeLessThanOrEqual(9);
      if (g.rows <= 8) expect(g.innerScroll).toBe(false);
      if (!g.innerScroll) expect(g.visibleRows).toBe(g.rows);
      expect(g.flush).toBeLessThanOrEqual(1);
      expect(g.scrollbars).toBeLessThanOrEqual(1);
      if (info.project.name.startsWith("chromium")) {
        mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({ path: `${SHOTS}/select-${id}-${size}-${at}.png` });
      }
    });
  }
}

test("§1U: the sheet doesn't scroll while the list is open; a wheel outside closes it, no change", async ({
  page,
}) => {
  await openSheet(page, "half");
  const combo = page.locator("#v2-model");
  const before = await combo.textContent();
  await combo.click();
  const col = page.locator('[data-pane="models"]');
  const top = await col.evaluate((el) => el.scrollTop);
  const b = await col.boundingBox();
  if (b === null) throw new Error("no column");
  await page.mouse.move(b.x + b.width / 2, b.y + b.height - 10);
  await page.mouse.wheel(0, 200);
  await expect(combo).toHaveAttribute("aria-expanded", "false");
  expect(await col.evaluate((el) => el.scrollTop)).toBe(top);
  expect(await combo.textContent()).toBe(before);
});

test("§1U: a resize closes the list", async ({ page }, info) => {
  await openSheet(page, "half");
  const combo = page.locator("#v2-model");
  await combo.click();
  await expect(combo).toHaveAttribute("aria-expanded", "true");
  const [w, h] = info.project.name.endsWith("390x844") ? [400, 844] : [1400, 900];
  await page.setViewportSize({ width: w, height: h });
  await expect(combo).toHaveAttribute("aria-expanded", "false");
});

test("§1U: moving the sheet closes the list", async ({ page }, info) => {
  // At 390 the half sheet's grab strips sit under the list (it opens up over them); use the full
  // sheet there, where the logo stays clear of it.
  const phone = info.project.name.endsWith("390x844");
  await openSheet(page, phone ? "full" : "half");
  const combo = page.locator(phone ? "#v2-walk" : "#v2-model");
  await combo.click();
  await expect(combo).toHaveAttribute("aria-expanded", "true");
  const logo = await page.locator(LOGO).boundingBox();
  if (logo === null) throw new Error("no logo");
  const x = logo.x + logo.width / 2;
  const y = logo.y + logo.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 40, { steps: 4 });
  await expect(combo).toHaveAttribute("aria-expanded", "false");
  await page.mouse.up();
});

test("§1U: a Select near the bottom edge opens above, flush, every row shown", async ({ page }) => {
  // The half sheet puts How Prices Move near the bottom edge: no room below for its rows.
  await openSheet(page, "half");
  const combo = page.locator("#v2-walk");
  await combo.click();
  const g = await geometry(page, "v2-walk");
  expect(g.up).toBe(true);
  expect(g.inViewport).toBe(true);
  expect(g.flush).toBeLessThanOrEqual(1);
  expect(g.innerScroll).toBe(false);
  expect(g.visibleRows).toBe(g.rows);
});
