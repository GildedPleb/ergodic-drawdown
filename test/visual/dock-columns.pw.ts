import { expect, test } from "@playwright/test";

// V32-BUILD §1S: in desktop dock mode each tab heads its own column of the sheet.
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== `${browserName}-1440x900`, "desktop dock mode at 1440x900");
});

test("§1S: each tab's centre is within 1px of its column's centre; 🔍 far left, ⚙ far right", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#tab-models").click();
  await expect(page.locator("#tab-models")).toHaveAttribute("aria-expanded", "true");
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const mid = (el: Element | null): number => {
      const r = el?.getBoundingClientRect();
      return r === undefined ? Number.NaN : r.left + r.width / 2;
    };
    const edge = (el: Element | null): [number, number] => {
      const r = el?.getBoundingClientRect();
      return r === undefined ? [Number.NaN, Number.NaN] : [r.left, r.right];
    };
    const panes = ["models", "plans", "stats"];
    const tabs = document.querySelectorAll('[role="tab"]');
    return {
      tabs: panes.map((p) => mid(document.getElementById(`tab-${p}`))),
      cols: panes.map((p) => mid(document.querySelector(`[data-pane="${p}"]`))),
      count: tabs.length,
      row: edge(document.querySelector('[role="tablist"]')?.parentElement ?? null),
      mag: edge(document.querySelector('[aria-label="Search"]')),
      gear: edge(document.querySelector('[aria-label="Settings"]')),
      models: edge(document.querySelector('[data-pane="models"]')),
    };
  });
  expect(m.count).toBe(3);
  for (let i = 0; i < 3; i++) {
    expect(Math.abs((m.tabs[i] ?? 0) - (m.cols[i] ?? 0))).toBeLessThanOrEqual(1);
  }
  // The dock row spans the same width as the columns; 🔍 and ⚙ sit at its two ends.
  expect(Math.abs(m.row[0] - m.models[0])).toBeLessThanOrEqual(1);
  // 🔍 keeps its designed 4px shift back to v32's box centre (--dock-icon-shift).
  expect(Math.abs(m.mag[0] - m.row[0])).toBeLessThanOrEqual(4.5);
  expect(Math.abs(m.gear[1] - m.row[1])).toBeLessThanOrEqual(1);
});
