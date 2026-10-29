import { expect, type Locator, type Page, test } from "@playwright/test";

import { gotoStory } from "./checks";

// V32-BUILD K2: the AssetRow key and the TickToggle mark are one CheckMark, pixel-identical at
// the same size and colour. Chromium only; each theme, at 1440 and the 200% zoom project.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    browserName !== "chromium" ||
      !["chromium-1440x900", "chromium-zoom200"].includes(info.project.name),
    "K2 mark parity runs at 1440 and 200% zoom",
  );
});

/** The mark inside a parent: its wrapper's only child. */
const markOf = (parent: Locator): Locator => parent.locator("span > span").first();

/** One colour and one backdrop on both marks, so only geometry can differ. */
const flatten = async (page: Page, marks: Locator[]): Promise<void> => {
  for (const m of marks) {
    await m.evaluate((el: HTMLElement) => {
      el.style.color = "rgb(255, 0, 0)";
      el.style.boxShadow = "0 0 0 0.5rem rgb(0, 0, 0)";
      if (el.parentElement !== null) el.parentElement.style.background = "rgb(0, 0, 0)";
    });
  }
  await page.mouse.move(0, 0);
};

/**
 * The mark's red pixels as rows of # and ., trimmed to their bounding box: device-pixel snapping
 * may shift a mark by a pixel inside its screenshot, which is placement, not geometry.
 */
const maskOf = async (page: Page, png: Buffer): Promise<string> =>
  page.evaluate(
    async (src: string) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx === null) return "";
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const red = (x: number, y: number): boolean => {
        const i = (y * img.width + x) * 4;
        return data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0;
      };
      const rows: string[] = [];
      for (let y = 0; y < img.height; y += 1) {
        let row = "";
        for (let x = 0; x < img.width; x += 1) row += red(x, y) ? "#" : ".";
        rows.push(row);
      }
      const lit = rows.filter((r) => r.includes("#"));
      const lo = Math.min(...lit.map((r) => r.indexOf("#")));
      const hi = Math.max(...lit.map((r) => r.lastIndexOf("#")));
      const first = rows.findIndex((r) => r.includes("#"));
      const last = rows.length - 1 - [...rows].reverse().findIndex((r) => r.includes("#"));
      return rows
        .slice(first, last + 1)
        .map((r) => r.slice(lo, hi + 1))
        .join("\n");
    },
    `data:image/png;base64,${png.toString("base64")}`,
  );

for (const theme of ["dark", "linen"] as const) {
  test(`K2 ${theme}: the key and the tick mark are pixel-identical, on and off`, async ({
    page,
  }) => {
    await gotoStory(page, "models-sheet/default", { theme });
    const tick = page.getByRole("switch", { name: "Clamp maximum price" });
    const key = page.getByRole("listitem").first().locator("button[aria-pressed]");
    for (const on of [true, false]) {
      if ((await tick.getAttribute("aria-checked")) !== String(on)) await tick.click();
      if ((await key.getAttribute("aria-pressed")) !== String(on)) await key.click();
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
      const a = markOf(key);
      const b = markOf(tick);
      await flatten(page, [a, b]);
      const [ka, kb] = [await a.boundingBox(), await b.boundingBox()];
      expect([ka?.width, ka?.height]).toEqual([kb?.width, kb?.height]);
      const [pa, pb] = [await a.screenshot(), await b.screenshot()];
      const [ma, mb] = [await maskOf(page, pa), await maskOf(page, pb)];
      expect(ma.length > 0).toBe(true);
      expect(ma).toBe(mb);
    }
  });
}
