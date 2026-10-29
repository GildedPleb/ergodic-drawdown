import { existsSync } from "node:fs";

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

const openBitcoin = async (page: Page, path = "/"): Promise<void> => {
  await page.goto(path);
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

// Form "Fade at a pinned header's exit" (V32-BUILD, 2026-10-29): the open header counts as pinned
// only while it is stuck at the zone's top. Pushed out by its asset's foot, it takes the standard
// top fade at once. Baselines: stuck mid-section, and pushed out with its foot 20px below the top.
const themed = async (page: Page, theme: "dark" | "linen"): Promise<void> => {
  await openBitcoin(page, theme === "linen" ? "/?theme=linen" : "/");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
};

/** Scrolls the zone so Bitcoin's section ends `foot` px below its top; reads the header and cue. */
const bitcoinFoot = async (page: Page, foot: number) => {
  await page.locator(ZONE).evaluate((zone, f) => {
    const asset = zone.querySelector('[data-asset="bitcoin"]');
    if (asset === null) throw new Error("no bitcoin asset");
    zone.scrollTop += asset.getBoundingClientRect().bottom - zone.getBoundingClientRect().top - f;
  }, foot);
  await page.waitForTimeout(150);
  return page.locator(ZONE).evaluate((zone) => {
    const head = zone.querySelector('[data-asset="bitcoin"] > [data-pin]');
    const name = head?.querySelector('[class*="name"]');
    if (!head || !name) throw new Error("no pinned bitcoin header");
    const z = zone.getBoundingClientRect();
    const h = head.getBoundingClientRect();
    const n = name.getBoundingClientRect();
    return {
      zone: { x: z.left, y: z.top, width: z.width },
      headTop: h.top,
      headHeight: h.height,
      name: { left: n.left, right: n.right },
      hh: zone.style.getPropertyValue("--dyn-hh"),
    };
  });
};

/** Largest channel step from the row's median colour along the zone's first pixel row of the name. */
const edgeContrast = async (page: Page, y: number, left: number, right: number) => {
  const shot = await page.screenshot({ clip: { x: left, y, width: right - left, height: 1 } });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = 1;
    const ctx = c.getContext("2d");
    if (ctx === null) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, 1).data;
    const px: number[][] = [];
    for (let i = 0; i < d.length; i += 4) px.push([d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0]);
    const med = [0, 1, 2].map(
      (k) => px.map((p) => p[k] ?? 0).sort((a, b) => a - b)[px.length >> 1] ?? 0,
    );
    return Math.max(...px.map((p) => Math.max(...p.map((v, k) => Math.abs(v - (med[k] ?? 0))))));
  }, shot.toString("base64"));
};

for (const theme of ["dark", "linen"] as const) {
  test(`Form pinned-header exit (${theme}): pinned only while stuck; pushed out, it fades like any row`, async ({
    page,
  }, info) => {
    await themed(page, theme);
    const shoot = async (name: string, zone: { x: number; y: number; width: number }) => {
      if (!existsSync(info.snapshotPath(name))) {
        info.annotations.push({
          type: "baseline-pending",
          description: `${info.project.name}/${name}`,
        });
        if (process.env["VISUAL_UPDATE"] !== "1") return;
      }
      await expect(page).toHaveScreenshot(name, {
        clip: { x: zone.x, y: zone.y - 40, width: Math.min(zone.width, 720), height: 200 },
      });
    };

    // Stuck mid-section: the fade starts at the header's foot, the header itself at full strength.
    const stuck = await bitcoinFoot(page, 200);
    expect(Math.abs(stuck.headTop - stuck.zone.y)).toBeLessThanOrEqual(0.5);
    expect(Number.parseFloat(stuck.hh)).toBeCloseTo(stuck.headHeight, 1);
    await shoot(`models-pane--btc-stuck--${theme}.png`, stuck.zone);

    // Pushed out by its asset's foot: no longer pinned, so no offset.
    const pushed = await bitcoinFoot(page, 40);
    expect(pushed.headTop).toBeLessThan(pushed.zone.y - 0.5);
    expect(pushed.hh).toBe("0.00px");

    // Foot 20px below the top: the name's cut edge sits in the top fade (no full-strength strip).
    const exit = await bitcoinFoot(page, 20);
    expect(exit.hh).toBe("0.00px");
    const edge = await edgeContrast(page, Math.ceil(exit.zone.y), exit.name.left, exit.name.right);
    expect(edge).toBeLessThan(24);
    await shoot(`models-pane--btc-pushed--${theme}.png`, exit.zone);
  });
}
