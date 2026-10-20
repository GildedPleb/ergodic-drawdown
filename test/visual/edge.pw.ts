import { expect, test, type Page } from "@playwright/test";

// V32-BUILD §1L.6: the sheet is edge to edge at every size. The bottom sheet sits flush with the
// viewport's left, right and bottom edges (its bevelled corners touch them); the phone-landscape
// right panel sits flush with the top, right and bottom edges. 0px gap, both themes, closed and open.
const SIZES = ["390x844", "844x390", "1440x900"] as const;
const THEMES = ["dark", "linen"] as const;

test.beforeEach(({ browserName }, info) => {
  test.skip(
    !SIZES.some((s) => info.project.name === `${browserName}-${s}`),
    "edge geometry runs at 390x844, 844x390 and 1440x900",
  );
});

type Edges = { left: number; right: number; top: number; bottom: number; corner: number };

const edges = async (page: Page): Promise<Edges> =>
  page.evaluate(() => {
    const r = document.getElementById("models-sheet")?.getBoundingClientRect();
    const corner = document.querySelector("#models-sheet > svg")?.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    return {
      left: r?.left ?? Number.NaN,
      right: vw - (r?.right ?? Number.NaN),
      top: r?.top ?? Number.NaN,
      bottom: vh - (r?.bottom ?? Number.NaN),
      corner: corner?.left ?? Number.NaN,
    };
  });

for (const theme of THEMES) {
  for (const state of ["closed", "open"] as const) {
    test(`1L.6 edge to edge (${theme}, ${state})`, async ({ page }, info) => {
      await page.goto("/");
      await page.evaluate((t) => {
        document.documentElement.dataset["theme"] = t;
      }, theme);
      if (state === "open") {
        const tab = page.locator("#tab-models");
        // Phones show the dock row only once open: the grab point opens the sheet there.
        if (await tab.isVisible()) await tab.click();
        else await page.locator('[aria-controls="models-sheet"]:not([role="tab"])').click();
        await expect(page.locator("#tab-models")).toHaveAttribute("aria-expanded", "true");
        await page.waitForTimeout(500); // the spring / panel slide settles
      }
      const e = await edges(page);
      const side = info.project.name.endsWith("844x390");
      expect(Math.abs(e.right)).toBeLessThan(0.5);
      expect(Math.abs(e.bottom)).toBeLessThan(0.5);
      if (side) expect(Math.abs(e.top)).toBeLessThan(0.5);
      else {
        expect(Math.abs(e.left)).toBeLessThan(0.5);
        // The bevel's start diagonal begins at the screen's left edge.
        expect(Math.abs(e.corner)).toBeLessThan(0.5);
      }
      const dir = process.env["EDGE_SHOTS"];
      if (dir !== undefined) {
        const size = info.project.name.replace(/^\w+-/, "");
        await page.screenshot({ path: `${dir}/edge-${size}-${theme}-${state}.png` });
      }
    });
  }
}
