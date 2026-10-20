import { expect, test, type Page } from "@playwright/test";

// V32-BUILD §1Y: the pane scroll zone. The tab bar never scrolls; the zone below the Deco rule is
// the only scroller, hard-clipped at it; ▲ / ▼ cues by scroll position; the open asset's header
// sticks at the rule; focus lands clear of it; no gradient anywhere in the pane.
const SIZES = ["390x844", "1440x900"] as const;
const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';
const ZONE = '[data-pane="models"]';

test.beforeEach(({ browserName }, info) => {
  test.skip(
    !SIZES.some((s) => info.project.name === `${browserName}-${s}`),
    "pane scroll checks run at 390x844 and 1440x900",
  );
});

const openBitcoin = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("stackmath.v2.models");
  });
  await page.reload();
  await page.locator(LOGO).focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("[data-sheet]")).toHaveAttribute("data-sheet", "half");
  await page.locator("#asset-bitcoin").click();
  await expect(page.locator("#asset-bitcoin")).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(1, 1);
  await page.waitForTimeout(300);
};

/** Scrolls the zone to a share of its range and reads back everything the checks need. */
const at = async (page: Page, share: number) => {
  await page.locator(ZONE).evaluate((el, s) => {
    el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * s);
  }, share);
  await page.waitForTimeout(150);
  return page.locator(ZONE).evaluate((zone) => {
    const pane = zone.parentElement;
    const [rule, , foot] = pane === null ? [] : [...pane.children];
    if (rule === undefined || foot === undefined) throw new Error("no rules");
    const up = getComputedStyle(rule, "::before");
    const down = getComputedStyle(foot, "::before");
    const head = document.querySelector('[data-state="open"] > :first-child');
    const tabs = document.querySelector('[role="tablist"]');
    const z = zone.getBoundingClientRect();
    const r = rule.getBoundingClientRect();
    return {
      range: zone.scrollHeight - zone.clientHeight,
      // ▲ replaces the 3rem bar: a clipped 0.5rem square; ▼ is shown by opacity.
      up: up.clipPath !== "none" && up.width === "8px",
      bar: up.clipPath === "none" && up.width === "48px",
      down: down.opacity === "1",
      zoneTop: z.top,
      ruleBottom: r.bottom,
      headTop: head?.getBoundingClientRect().top ?? Number.NaN,
      tabsTop: tabs?.getBoundingClientRect().top ?? Number.NaN,
      noHits: [
        up.pointerEvents,
        getComputedStyle(rule).pointerEvents,
        getComputedStyle(foot).pointerEvents,
      ],
      hidden: [rule.getAttribute("aria-hidden"), foot.getAttribute("aria-hidden")],
      // Just above the rule is the tab bar, never zone content.
      above: zone.contains(document.elementFromPoint(z.left + z.width / 2, r.top - 2)),
    };
  });
};

test("§1Y: cues follow the scroll position; the tab bar never moves; the header sticks at the rule", async ({
  page,
}) => {
  await openBitcoin(page);
  const top = await at(page, 0);
  expect(top.range).toBeGreaterThan(40);
  expect(top.hidden).toEqual(["true", "true"]);
  expect(top.noHits).toEqual(["none", "none", "none"]);
  expect([top.up, top.bar, top.down]).toEqual([false, true, true]);
  // The zone starts at the rule: content is clipped there.
  expect(Math.abs(top.zoneTop - top.ruleBottom)).toBeLessThanOrEqual(0.5);

  const mid = await at(page, 0.5);
  expect([mid.up, mid.bar, mid.down]).toEqual([true, false, true]);
  expect(Math.abs(mid.headTop - mid.zoneTop)).toBeLessThanOrEqual(0.5);
  expect(mid.tabsTop).toBe(top.tabsTop);
  expect(mid.above).toBe(false);
  await expect(page.locator('[data-state="open"]')).toHaveAttribute("data-stuck", "true");

  const end = await at(page, 1);
  expect([end.up, end.bar, end.down]).toEqual([true, false, false]);
  expect(Math.abs(end.headTop - end.zoneTop)).toBeLessThanOrEqual(0.5);
  expect(end.tabsTop).toBe(top.tabsTop);

  // Back at the top: ▲ gone, the bar back, the header no longer stuck.
  const back = await at(page, 0);
  expect([back.up, back.bar]).toEqual([false, true]);
  await expect(page.locator('[data-state="open"]')).not.toHaveAttribute("data-stuck", "true");
  // The summary hides while the row is open.
  const summary = page.locator("#asset-bitcoin > span").nth(2).locator("span").nth(1);
  await expect(summary).toHaveCount(1);
  await expect(summary).toBeHidden();
});

test("§1Y: focus scrolled into view lands clear of the sticky header", async ({ page }) => {
  await openBitcoin(page);
  await at(page, 1);
  // The model Select is above the fold now; Shift+Tab back to it from the walk Select.
  await page.locator("#v2-walk").focus();
  await page.locator(ZONE).evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.keyboard.press("Shift+Tab");
  for (let i = 0; i < 6; i++) {
    if (await page.locator("#v2-model").evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Shift+Tab");
  }
  await expect(page.locator("#v2-model")).toBeFocused();
  await page.waitForTimeout(150);
  const m = await page.evaluate(() => {
    const head = document.querySelector('[data-state="open"] > :first-child');
    const field = document.getElementById("v2-model");
    return {
      head: head?.getBoundingClientRect().bottom ?? Number.NaN,
      field: field?.getBoundingClientRect().top ?? Number.NaN,
    };
  });
  expect(m.field).toBeGreaterThanOrEqual(m.head - 0.5);
});

test("§1Y: no gradient or mask anywhere in the pane's computed styles", async ({ page }) => {
  await openBitcoin(page);
  await at(page, 0.5);
  const found = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll("#models-sheet, #models-sheet *")) {
      for (const pseudo of [null, "::before", "::after"]) {
        const s = getComputedStyle(el, pseudo);
        for (const v of [s.backgroundImage, s.maskImage, s.borderImageSource])
          if (/gradient/.test(v)) out.push(`${el.className}${pseudo ?? ""}: ${v}`);
      }
    }
    return out;
  });
  expect(found).toEqual([]);
});

test("§1Y: a scroll inside the zone never drags the sheet; the drag strip still does", async ({
  page,
}) => {
  await openBitcoin(page);
  const zone = await page.locator(ZONE).boundingBox();
  if (zone === null) throw new Error("no zone");
  const sheetTop = async (): Promise<number> =>
    page.evaluate(() => document.getElementById("models-sheet")?.getBoundingClientRect().top ?? 0);
  const before = await sheetTop();
  await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(200);
  expect(await page.locator(ZONE).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  // A press and drag on the zone's own padding (not a control) doesn't move the sheet either.
  await page.mouse.move(zone.x + 4, zone.y + zone.height / 2);
  await page.mouse.down();
  await page.mouse.move(zone.x + 4, zone.y + zone.height / 2 + 120, { steps: 6 });
  await expect(page.locator("[data-dragging]")).toHaveAttribute("data-dragging", "false");
  await page.mouse.up();
  expect(await sheetTop()).toBe(before);
  await expect(page.locator("[data-sheet]")).toHaveAttribute("data-sheet", "half");
  // The tab row is still a grab strip: dragging it down moves the sheet.
  const strip = await page.locator('[data-grab="strip"]').last().boundingBox();
  if (strip === null) throw new Error("no strip");
  await page.mouse.move(strip.x + strip.width - 8, strip.y + strip.height / 2);
  await page.mouse.down();
  await page.mouse.move(strip.x + strip.width - 8, strip.y + strip.height / 2 + 60, { steps: 6 });
  await expect(page.locator("[data-dragging]")).toHaveAttribute("data-dragging", "true");
  expect(await sheetTop()).toBeGreaterThan(before + 30);
  await page.mouse.up();
});
