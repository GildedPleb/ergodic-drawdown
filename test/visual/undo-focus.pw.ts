import { expect, type Page, test } from "@playwright/test";

// V32-BUILD U1 Focus (:854; Probe F-A): an undo or redo never drops focus to the page. The closed
// Select keeps one node for its pick (a); a row both models share is not remounted (b); when the
// focused row leaves with its model, focus goes to the Model Select's pick (c). The undo Tile keeps
// focus when pressed, and hands it on before it hides (d, e). A drag changes it only when the live
// size crosses the half stop (Form call 2); it sits at the Models pane's bottom centre (call 3).
const SIZES = ["390x844", "1440x900"] as const;
const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';
const UNDO = '#models-sheet button[data-variant="soft"]';

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

test("U1 Focus (d): pressing the undo Tile keeps focus on it; when history empties it goes to the restored field", async ({
  page,
}) => {
  await openSheet(page, "full");
  await pick(page, "v2-walk", "Saw");
  await pick(page, "v2-walk", "Sin");
  const undo = page.locator(UNDO);
  await expect(undo).toHaveAccessibleName("Undo, How bumpy the ride is back to Saw");
  await undo.focus();
  await tag(page);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  expect(await where(page)).toMatchObject({ same: true, body: false });
  await expect(undo).toHaveAccessibleName(/^Undo, How bumpy the ride is back to /);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const at = await where(page);
  expect(at.body).toBe(false);
  expect(at.sel).toMatch(/^v2-walk-opt-\d+\|option\|true$/);
  // It fades out inert: no longer a Tab stop or a target.
  expect(await undo.evaluate((e) => e.closest("[inert]") !== null)).toBe(true);
});

test("U1 Focus (e): the sheet dropping below half moves focus off the undo Tile to the grab point", async ({
  page,
}) => {
  await openSheet(page, "full");
  await pick(page, "v2-walk", "Saw");
  await page.locator(UNDO).focus();
  // A press-free route below half: the grab point's End key closes the sheet (§1R).
  await page.evaluate(() => {
    const g = document.querySelector<HTMLElement>(
      '[aria-controls="models-sheet"]:not([role="tab"])',
    );
    g?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
  });
  await expect.poll(async () => stop(page)).toBe("closed");
  await page.waitForTimeout(300);
  const focused = await page.evaluate(
    () =>
      document.activeElement?.matches('[aria-controls="models-sheet"]:not([role="tab"])') ?? false,
  );
  expect(focused).toBe(true);
});

const sheetTop = async (page: Page): Promise<number> =>
  page.evaluate(() => document.querySelector("#models-sheet")?.getBoundingClientRect().y ?? 0);

test("U1 Hidden (Form call 2): a drag hides the Tile only when the live size crosses under half, and shows it when it crosses back", async ({
  page,
}) => {
  await openSheet(page, "half");
  const half = await sheetTop(page);
  await page.locator(LOGO).focus();
  await page.keyboard.press("Home");
  await expect.poll(async () => stop(page)).toBe("full");
  await page.waitForTimeout(350);
  await pick(page, "v2-walk", "Saw");
  const wrap = page.locator(UNDO).locator("xpath=..");
  await expect(wrap).not.toHaveAttribute("data-undo", "hidden");
  // Count every data-undo change: it may only flip on a crossing.
  await page.evaluate(() => {
    const el = document.querySelector('#models-sheet button[data-variant="soft"]')?.parentElement;
    const seen: (string | null)[] = [];
    Object.assign(window, { undoFlips: seen });
    if (el === null || el === undefined) return;
    new MutationObserver(() => {
      seen.push(el.getAttribute("data-undo"));
    }).observe(el, { attributes: true, attributeFilter: ["data-undo"] });
  });
  const flips = async (): Promise<unknown> => page.evaluate(() => Reflect.get(window, "undoFlips"));
  const box = await page.locator(LOGO).boundingBox();
  if (box === null) throw new Error("no grab point");
  const x = box.x + box.width / 2;
  const y0 = box.y + box.height / 2;
  const top0 = await sheetTop(page);
  const to = async (top: number): Promise<void> => {
    await page.mouse.move(x, y0 + (top - top0), { steps: 8 });
    await page.waitForTimeout(50);
  };
  await page.mouse.move(x, y0);
  await page.mouse.down();
  // Dragging, but still above half: shown, nothing changed.
  await to(top0 + 20);
  await to(half - 30);
  expect(await flips()).toEqual([]);
  await expect(wrap).not.toHaveAttribute("data-undo", "hidden");
  // Under half: hidden once, however many moves follow.
  await to(half + 40);
  await to(half + 80);
  await to(half + 60);
  await expect(wrap).toHaveAttribute("data-undo", "hidden");
  expect(await flips()).toEqual(["hidden"]);
  // Back over half: shown again, once.
  await to(half - 40);
  await to(half - 60);
  await expect(wrap).not.toHaveAttribute("data-undo", "hidden");
  expect(await flips()).toEqual(["hidden", null]);
  await page.mouse.up();
  await page.waitForTimeout(350);
  await expect(wrap).not.toHaveAttribute("data-undo", "hidden");
});
