import { expect, test, type Page } from "@playwright/test";

// V32-BUILD §1O: system cursors, each from the cursor tokens; grabbing on <html> for a sheet hold;
// no hover after a tap on touch.
const cursorOf = async (page: Page, selector: string): Promise<string[]> =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(sel)]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => getComputedStyle(el).cursor),
    selector,
  );

const ready = async (page: Page): Promise<void> => {
  await page.goto("/");
  await expect
    .poll(
      async () => (await page.locator('[data-layer="front"]').getAttribute("aria-label")) ?? "",
      {
        timeout: 60_000,
      },
    )
    .toMatch(/reaches|grows past/);
};

const LOGO = '[aria-controls="models-sheet"]:not([role="tab"])';

test("1O at 1440: every target's computed cursor, and grabbing on <html> only while held", async ({
  page,
  browserName,
}, info) => {
  test.skip(info.project.name !== `${browserName}-1440x900`, "desktop pointer check at 1440");
  await ready(page);
  await page.locator('[role="tab"][aria-controls="models-sheet"]').first().click();
  const bitcoin = page.locator("#asset-bitcoin");
  if ((await bitcoin.getAttribute("aria-expanded")) !== "true") await bitcoin.click();
  await page.locator('[role="slider"]').first().waitFor();

  const rows: [string, string, string][] = [
    ["logo / dock grab point", LOGO, "grab"],
    ["grab strips (logo, beat, dock row, bevelled edge)", "[data-grab]", "grab"],
    ["slider thumbs", '[role="slider"]', "grab"],
    ["chart plot", '[data-layer="front"]', "crosshair"],
    ["dock tabs", '[role="tab"]', "pointer"],
    [
      "ledger headers (Bitcoin, S&P, Inflation)",
      '[role="listitem"] button[aria-controls]',
      "pointer",
    ],
    ["ON/OFF box", '[role="switch"]', "pointer"],
    ["Select field", '[role="combobox"]', "pointer"],
    ["NumberField value cells", '[role="spinbutton"]', "text"],
    ["headline and captions", "h1, h2, figcaption", "auto"],
    ["page background", "body", "auto"],
  ];
  for (const [name, selector, want] of rows) {
    const got = await cursorOf(page, selector);
    expect(got.length, `${name}: none visible`).toBeGreaterThan(0);
    expect(new Set(got), name).toEqual(new Set([want]));
  }
  expect((await cursorOf(page, '[role="listitem"] button[aria-controls]')).length).toBe(3);

  // Slider tracks: the row around the thumb.
  const track = await page.evaluate(() => {
    const thumb = document.querySelector('[role="slider"]');
    return thumb?.parentElement ? getComputedStyle(thumb.parentElement).cursor : "";
  });
  expect(track).toBe("pointer");

  // Select options while the list is open.
  await page.locator('[role="combobox"]').first().click();
  expect(new Set(await cursorOf(page, '[role="option"]'))).toEqual(new Set(["pointer"]));
  await page.keyboard.press("Escape");

  // Mid-drag: <html> grabbing, no selection, logo stroke --accent-strong; release removes all.
  const html = async (): Promise<{
    cursor: string;
    select: string;
    stroke: string;
    strong: string;
  }> =>
    page.evaluate((logo) => {
      const root = getComputedStyle(document.documentElement);
      const path = document.querySelector(`${logo} svg path`);
      const probe = document.createElement("i");
      probe.style.color = "var(--accent-strong)";
      document.body.append(probe);
      const strong = getComputedStyle(probe).color;
      probe.remove();
      return {
        cursor: root.cursor,
        select: root.userSelect,
        stroke: path === null ? "" : getComputedStyle(path).stroke,
        strong,
      };
    }, LOGO);
  const rest = await html();
  expect(rest.cursor).toBe("auto");
  const box = await page.locator(LOGO).boundingBox();
  if (box === null) throw new Error("no logo");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2, { steps: 4 });
  const mid = await html();
  expect(mid.cursor).toBe("grabbing");
  expect(mid.select).toBe("none");
  expect(mid.stroke).toBe(mid.strong);
  expect(mid.stroke).not.toBe(rest.stroke);
  await page.mouse.up();
  const after = await html();
  expect(after.cursor).toBe("auto");
  expect(after.select).not.toBe("none");
  expect(after.stroke).toBe(rest.stroke);
});

test("1O at 390 touch: a tap leaves no hover style behind", async ({
  browser,
  browserName,
}, info) => {
  test.skip(
    info.project.name !== `${browserName}-390x844` || browserName !== "chromium",
    "touch emulation (Chromium)",
  );
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    baseURL: info.project.use.baseURL ?? "/",
  });
  const page = await context.newPage();
  await ready(page);
  expect(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(
    false,
  );
  await page.locator(LOGO).tap();
  await page.locator(LOGO).tap(); // closed → half → full (§1R)
  const bitcoin = page.locator("#asset-bitcoin");
  if ((await bitcoin.getAttribute("aria-expanded")) !== "true") await bitcoin.tap();
  const field = page.locator('[role="combobox"]').first();
  await field.scrollIntoViewIfNeeded();
  const bg = async (): Promise<string> =>
    field.evaluate((el) => getComputedStyle(el).backgroundColor);
  const before = await bg();
  await field.tap();
  await page.waitForTimeout(400); // past the pressed flash
  expect(await bg()).toBe(before); // the tapped field shows no hover fill
  const option = page.locator('[role="option"]').nth(1);
  await option.tap();
  await page.waitForTimeout(400);
  expect(await bg()).toBe(before);
  // Nothing styled by :hover anywhere: the only :hover rules sit behind (hover: hover).
  const hovered = await page.evaluate(() =>
    [...document.querySelectorAll(":hover")]
      .filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)")
      .map((el) => el.tagName),
  );
  expect(hovered.filter((t) => !["HTML", "BODY", "MAIN", "DIV", "SECTION"].includes(t))).toEqual(
    [],
  );
  await context.close();
});
