import { expect, test, type Page } from "@playwright/test";

// V32-BUILD §1MP items 11–12 (replaces pane-scroll.pw.ts's §1Y checks): no edge lines; the zone's content fades over 1.5rem at the top only
// while scrolled away from it (from the pinned header's foot) and at the foot only while more is
// below. The fades never cover the tab bar or the scrollbar.
const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';
const ZONE = '[data-pane="models"]';

test.beforeEach(({ browserName }, info) => {
  test.skip(
    !["390x844", "1440x900"].some((s) => info.project.name === `${browserName}-${s}`),
    "scroll fade checks run at 390x844 and 1440x900",
  );
});

const openBitcoin = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.locator(LOGO).focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("[data-sheet]")).toHaveAttribute("data-sheet", "half");
  if ((await page.locator("#asset-bitcoin").getAttribute("aria-expanded")) !== "true") {
    await page.locator("#asset-bitcoin").click();
  }
  await page.waitForTimeout(300);
};

/** Scrolls the zone to a share of its range; reads its cue flags and fade lengths in px. */
const at = async (page: Page, share: number) => {
  await page.locator(ZONE).evaluate((el, s) => {
    el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * s);
  }, share);
  await page.waitForTimeout(150);
  return page.locator(ZONE).evaluate((zone) => {
    const px = (name: string): number => {
      const probe = document.createElement("div");
      probe.style.blockSize = getComputedStyle(zone).getPropertyValue(name) || "0px";
      zone.append(probe);
      const h = probe.getBoundingClientRect().height;
      probe.remove();
      return h;
    };
    const s = getComputedStyle(zone);
    return {
      range: zone.scrollHeight - zone.clientHeight,
      top: zone.getAttribute("data-top"),
      more: zone.getAttribute("data-more"),
      ft: px("--_ft"),
      fb: px("--_fb"),
      mask: s.maskImage || s.getPropertyValue("-webkit-mask-image"),
      rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
      tabsInZone: zone.querySelector('[role="tablist"]') !== null,
      barInZone: zone.parentElement?.querySelector('[aria-hidden="true"]')?.parentElement === zone,
    };
  });
};

test("§1MP 11: the top fade only while scrolled, the foot fade only while more is below", async ({
  page,
}) => {
  await openBitcoin(page);
  const top = await at(page, 0);
  expect(top.range).toBeGreaterThan(40);
  expect(top.mask).toMatch(/gradient/);
  expect(top.tabsInZone).toBe(false);
  expect(top.barInZone).toBe(false);
  expect([top.top, top.more]).toEqual(["false", "true"]);
  expect([top.ft, top.fb]).toEqual([0, 1.5 * top.rem]);

  const mid = await at(page, 0.5);
  expect([mid.top, mid.more]).toEqual(["true", "true"]);
  expect([mid.ft, mid.fb]).toEqual([1.5 * mid.rem, 1.5 * mid.rem]);

  const end = await at(page, 1);
  expect([end.top, end.more]).toEqual(["true", "false"]);
  expect([end.ft, end.fb]).toEqual([1.5 * end.rem, 0]);
});

test("§1MP 12: every live dock pane zone carries the same fade mask", async ({ page }) => {
  await openBitcoin(page);
  const masks = await page.evaluate(() =>
    [...document.querySelectorAll('[data-pane]:not([aria-hidden="true"])')].map((el) => {
      const s = getComputedStyle(el);
      return s.maskImage || s.getPropertyValue("-webkit-mask-image");
    }),
  );
  expect(masks.length).toBeGreaterThan(0);
  for (const m of masks) expect(m).toMatch(/gradient/);
});
