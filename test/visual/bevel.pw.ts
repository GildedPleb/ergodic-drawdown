import { mkdirSync } from "node:fs";

import { expect, test, type Browser } from "@playwright/test";

// V32-BUILD §1X: the bevel's 45° stroke (--bevel-comp) reads as heavy as the 1px run, at 1× and
// 2× DPR, in both themes. Measured on the sheet's top-left corner at 390 and 1440: the peak contrast across
// each line, and its ink per unit length (contrast summed over a band, divided by the band's length).
const CROPS = process.env["BEVEL_CROPS"];

type Weight = { inkRatio: number; peakRatio: number };

const weigh = async (
  browser: Browser,
  baseURL: string,
  theme: "dark" | "linen",
  dpr: number,
  width: number,
): Promise<Weight> => {
  const context = await browser.newContext({
    viewport: { width, height: width > 800 ? 900 : 844 },
    deviceScaleFactor: dpr,
    baseURL,
  });
  const page = await context.newPage();
  await page.goto(theme === "linen" ? "/?theme=linen" : "/");
  const logo = page.locator('[aria-controls="models-sheet"]:not([role="tab"])');
  await logo.click();
  await expect(logo).toHaveAttribute("aria-expanded", "true");
  await page.waitForTimeout(600);
  const at = await page.evaluate(() => {
    const r = document.getElementById("models-sheet")?.getBoundingClientRect();
    return { x: r?.x ?? 0, y: r?.y ?? 0 };
  });
  const png = await page.screenshot({ clip: { x: at.x, y: at.y, width: 48, height: 24 } });
  if (CROPS !== undefined) {
    mkdirSync(CROPS, { recursive: true });
    await page.screenshot({
      clip: { x: at.x, y: at.y, width: 48, height: 24 },
      path: `${CROPS}/raw-${String(width)}-${theme}-${String(dpr)}x.png`,
    });
  }
  const weight = await page.evaluate(
    async ({ b64, scale }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const g = canvas.getContext("2d");
      if (g === null) return { inkRatio: 0, peakRatio: 0 };
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
      const lum = (x: number, y: number): number => {
        const i = (y * canvas.width + x) * 4;
        return 0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0);
      };
      const ground = lum(30 * scale, 12 * scale);
      const ch = 16;
      let run = 0;
      let runPeak = 0;
      for (let x = 24 * scale; x < 40 * scale; x++)
        for (let y = 0; y < 4 * scale; y++) {
          const v = Math.abs(lum(x, y) - ground);
          run += v;
          runPeak = Math.max(runPeak, v);
        }
      let diag = 0;
      let diagPeak = 0;
      for (let x = 0; x < ch * scale; x++)
        for (let y = 0; y < ch * scale; y++) {
          const X = (x + 0.5) / scale;
          const Y = (y + 0.5) / scale;
          const across = (X + Y - ch) / Math.SQRT2;
          const along = (X - Y) / Math.SQRT2;
          if (across < -0.5 || across > 3 || Math.abs(along) > 4) continue;
          const v = Math.abs(lum(x, y) - ground);
          diag += v;
          diagPeak = Math.max(diagPeak, v);
        }
      return { inkRatio: diag / 8 / (run / 16), peakRatio: diagPeak / runPeak };
    },
    { b64: png.toString("base64"), scale: dpr },
  );
  await context.close();
  return weight;
};

test("1X: the diagonal's perpendicular weight matches the run at 1× and 2×, dark and linen", async ({
  browser,
  browserName,
}, info) => {
  test.skip(
    info.project.name !== `${browserName}-390x844` || browserName !== "chromium",
    "pixel check (Chromium; runs both widths itself)",
  );
  const baseURL = info.project.use.baseURL ?? "/";
  for (const width of [390, 1440])
    for (const theme of ["dark", "linen"] as const)
      for (const dpr of [1, 2]) {
        const w = await weigh(browser, baseURL, theme, dpr, width);
        console.log(`1X ${String(width)} ${theme} ${String(dpr)}x ${JSON.stringify(w)}`);
        const name = `${String(width)} ${theme} ${String(dpr)}×: ${JSON.stringify(w)}`;
        expect(w.peakRatio, name).toBeGreaterThanOrEqual(0.95);
        expect(w.peakRatio, name).toBeLessThanOrEqual(1.05);
        expect(w.inkRatio, name).toBeGreaterThanOrEqual(0.98);
        expect(w.inkRatio, name).toBeLessThanOrEqual(1.6);
      }
});
