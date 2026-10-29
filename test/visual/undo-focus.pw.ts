import { expect, type Page, test } from "@playwright/test";

// V32-BUILD U1 Focus (:854; Probe F-A): an undo or redo never drops focus to the page. The closed
// Select keeps one node for its pick (a); a row both models share is not remounted (b); when the
// focused row leaves with its model, focus goes to the Model Select's pick (c).
const SIZES = ["390x844", "1440x900"] as const;
const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';

test.beforeEach(({ browserName }, info) => {
  test.skip(
    !SIZES.some((s) => info.project.name === `${browserName}-${s}`),
    "focus checks run at 390x844 and 1440x900",
  );
});

const stop = async (page: Page): Promise<string> =>
  page.evaluate(() => document.querySelector<HTMLElement>("[data-sheet]")?.dataset["sheet"] ?? "");

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

const pick = async (page: Page, list: string, name: string): Promise<void> => {
  await page.locator(`#${list}`).scrollIntoViewIfNeeded();
  await page.locator(`#${list} [role="option"]`).first().click();
  await expect
    .poll(async () => page.locator(`#${list} [role="option"]`).count())
    .toBeGreaterThan(1);
  await page.locator(`#${list} [role="option"]`, { hasText: name }).first().click();
  await expect.poll(async () => page.locator(`#${list} [role="option"]`).count()).toBe(1);
  await page.waitForTimeout(100);
};

/** Tags the focused node, so a later check can tell the same node from a remounted twin. */
const tag = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    Object.assign(window, { focusTag: document.activeElement });
  });
};

type Where = { same: boolean; body: boolean; sel: string };
const where = async (page: Page): Promise<Where> =>
  page.evaluate(() => {
    const a = document.activeElement;
    const was: unknown = Reflect.get(window, "focusTag");
    const sel =
      a instanceof HTMLElement
        ? `${a.id}|${a.getAttribute("role") ?? ""}|${a.getAttribute("aria-selected") ?? ""}`
        : "";
    return { same: a === was, body: a === document.body || a === null, sel };
  });

const press = async (page: Page, key: string): Promise<void> => {
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
};

for (const [list, name] of [
  ["v2-model", "Rainbow"],
  ["v2-walk", "Saw"],
] as const) {
  test(`F-A (a) ${list}: undo and redo keep focus on the one closed pick node`, async ({
    page,
  }) => {
    await openSheet(page, "full");
    await pick(page, list, name);
    await tag(page);
    expect((await where(page)).sel).toBe(
      `${list}-opt-${String(await selectedIndex(page, list))}|option|true`,
    );
    await press(page, "ControlOrMeta+z");
    expect(await where(page)).toMatchObject({ same: true, body: false });
    await press(page, "ControlOrMeta+Shift+z");
    expect(await where(page)).toMatchObject({ same: true, body: false });
  });
}

async function selectedIndex(page: Page, list: string): Promise<number> {
  const id = (await page.locator(`#${list} [aria-selected="true"]`).getAttribute("id")) ?? "";
  return Number(id.split("-opt-")[1]);
}

test("F-A (b): Historic ↔ CAGR keeps the shared variable row; focus stays on its slider", async ({
  page,
}) => {
  await openSheet(page, "full");
  await pick(page, "v2-model", "Historic");
  await pick(page, "v2-model", "CAGR");
  await page.locator('#row-variable [role="slider"]').focus();
  await tag(page);
  await press(page, "ControlOrMeta+z");
  expect(await where(page)).toMatchObject({ same: true, body: false });
  await press(page, "ControlOrMeta+Shift+z");
  expect(await where(page)).toMatchObject({ same: true, body: false });
});

test("F-A (c): undo removing the focused row moves focus to the Model Select's pick", async ({
  page,
}) => {
  await openSheet(page, "full");
  await pick(page, "v2-model", "CAGR");
  await page.locator('#row-variable [role="slider"]').focus();
  await press(page, "ControlOrMeta+z");
  await expect(page.locator("#row-variable")).toHaveCount(0);
  const at = await where(page);
  expect(at.body).toBe(false);
  expect(at.sel).toMatch(/^v2-model-opt-\d+\|option\|true$/);
  await tag(page);
  await press(page, "ControlOrMeta+Shift+z");
  expect(await where(page)).toMatchObject({ same: true, body: false });
});
