import { expect, type Page, test } from "@playwright/test";

// V32-BUILD §1MP item 6 / Form ruling 5: in the Models pane a Select opens in place, in the pane's
// flow (no top layer, no sheet lock). The pane scrolls just enough to show the whole list in the
// band clear of the pinned header and both fades; a list taller than that band keeps its pick in
// view. Esc closes with no change; picking a row closes it; focus always returns to the pick.
const SIZES = ["390x844", "1440x900"] as const;
const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';
const ZONE = '[data-pane="models"]';

test.beforeEach(({ browserName }, info) => {
  test.skip(
    !SIZES.some((s) => info.project.name === `${browserName}-${s}`),
    "Select list checks run at 390x844 and 1440x900",
  );
});

const stop = async (page: Page): Promise<string> =>
  page.evaluate(() => document.querySelector<HTMLElement>("[data-sheet]")?.dataset["sheet"] ?? "");

/** Opens the sheet to `to` with the grab point (§1R: closed → half → full), Bitcoin open. */
const openSheet = async (page: Page, to: "half" | "full"): Promise<void> => {
  await page.goto("/");
  await page.locator(LOGO).focus();
  await page.keyboard.press(to === "full" ? "Home" : "ArrowUp");
  await expect.poll(async () => stop(page)).toBe(to);
  if ((await page.locator("#asset-bitcoin").getAttribute("aria-expanded")) !== "true") {
    await page.locator("#asset-bitcoin").click();
  }
  await page.locator("#v2-model").waitFor();
  await page.waitForTimeout(350);
};

const opts = (page: Page, id: string) => page.locator(`#${id} [role="option"]`);

/** Opens the list by pressing its pick and waits for the reveal scroll to settle. */
const openList = async (page: Page, id: string): Promise<void> => {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await opts(page, id).first().click();
  await expect.poll(async () => opts(page, id).count()).toBeGreaterThan(1);
  await page.waitForTimeout(200);
};

type Geometry = {
  inZone: boolean;
  topLayer: boolean;
  rows: number;
  fits: boolean;
  shown: boolean;
  pickShown: boolean;
  pickFocused: boolean;
};

/** The open list against the zone's clear band (below the pinned header + top fade, above the
 *  bottom fade), as pane-cues measures it. */
const geometry = async (page: Page, id: string): Promise<Geometry> =>
  page.evaluate(
    ({ sel, zoneSel }) => {
      const list = document.getElementById(sel);
      const zone = document.querySelector(zoneSel);
      if (list === null || zone === null) throw new Error("no list");
      const fade = 1.5 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const head = list.closest("[data-asset]")?.querySelector("[data-pin]");
      const z = zone.getBoundingClientRect();
      const top = z.top + (head?.getBoundingClientRect().height ?? 0) + fade;
      const bottom = z.bottom - fade;
      const l = list.getBoundingClientRect();
      const pick = list.querySelector('[aria-selected="true"]');
      const p = pick?.getBoundingClientRect();
      const fits = l.height <= bottom - top;
      return {
        inZone: zone.contains(list),
        topLayer: list.matches(":popover-open") || list.closest("[popover], dialog") !== null,
        rows: list.querySelectorAll('[role="option"]').length,
        fits,
        shown: l.top >= top - 1 && l.bottom <= bottom + 1,
        // A pick taller than the band shows its top at the band's top (9a).
        pickShown:
          p !== undefined &&
          p.top >= top - 1 &&
          (p.bottom <= bottom + 1 || p.height > bottom - top),
        pickFocused: pick !== null && pick === document.activeElement,
      };
    },
    { sel: id, zoneSel: ZONE },
  );

const cases = [
  ["390x844", "half"],
  ["390x844", "full"],
  ["1440x900", "half"],
] as const;

for (const [size, at] of cases) {
  for (const id of ["v2-model", "v2-walk"]) {
    test(`§1MP 6 ${id} at ${size} (${at} sheet): opens in place; the pane shows it whole or keeps the pick`, async ({
      page,
    }, info) => {
      test.skip(!info.project.name.endsWith(size), size);
      await openSheet(page, at);
      const closed = await opts(page, id).count();
      expect(closed).toBe(1);
      await openList(page, id);
      const g = await geometry(page, id);
      expect(g.inZone).toBe(true);
      expect(g.topLayer).toBe(false);
      expect(g.rows).toBeGreaterThan(1);
      expect(g.pickFocused).toBe(true);
      if (g.fits) expect(g.shown).toBe(true);
      else expect(g.pickShown).toBe(true);
    });
  }
}

test("§1MP 6: Esc closes with no change and focus returns to the pick", async ({ page }) => {
  await openSheet(page, "half");
  const before = await opts(page, "v2-model").first().textContent();
  await openList(page, "v2-model");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(opts(page, "v2-model")).toHaveCount(1);
  expect(await opts(page, "v2-model").first().textContent()).toBe(before);
  await expect(opts(page, "v2-model").first()).toBeFocused();
  // Esc closed only the list: the asset and the sheet stay open.
  await expect(page.locator("#asset-bitcoin")).toHaveAttribute("aria-expanded", "true");
  expect(await stop(page)).toBe("half");
});

test("§1MP 6: pressing another row picks it, closes the list and focuses the new pick", async ({
  page,
}) => {
  await openSheet(page, "full");
  await openList(page, "v2-walk");
  const other = page.locator('#v2-walk [role="option"][aria-selected="false"]').first();
  const name = (await other.locator("span").first().textContent()) ?? "";
  await other.click();
  await expect(opts(page, "v2-walk")).toHaveCount(1);
  const pick = opts(page, "v2-walk").first();
  await expect(pick).toHaveAttribute("aria-selected", "true");
  expect(await pick.locator("span").first().textContent()).toBe(name);
  await expect(pick).toBeFocused();
});

test("§1MP ruling 5: nothing is locked while a list is open; the pane still scrolls", async ({
  page,
}) => {
  await openSheet(page, "half");
  await openList(page, "v2-model");
  const zone = page.locator(ZONE);
  const before = await zone.evaluate((el) => el.scrollTop);
  const b = await zone.boundingBox();
  if (b === null) throw new Error("no zone");
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.wheel(0, before > 0 ? -200 : 200);
  await expect.poll(async () => zone.evaluate((el) => el.scrollTop)).not.toBe(before);
  // Scrolling the pane leaves the list open, in its place in the flow.
  expect(await opts(page, "v2-model").count()).toBeGreaterThan(1);
  expect(await stop(page)).toBe("half");
});
