import { existsSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";

import { gotoStory, targetsOf } from "./checks";

// V32-BUILD K3/K4 (:862–:863): on every row whose label line has a description directly below,
// the focus ring stays inside the control's grid track, the tap target never reaches the
// description, and a tap on the description changes nothing. Clamp keeps 44px; number rows are
// the recorded ≥24px exception. Chromium at 390 and 1440, at 100% and 200% text.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    browserName !== "chromium" ||
      !["chromium-390x844", "chromium-1440x900"].includes(info.project.name),
    "K4 geometry runs in Chromium at 390 and 1440",
  );
});

type Box = { top: number; bottom: number; left: number; right: number };

type Found = {
  row: string;
  control: string;
  ring: Box;
  track: Box;
  desc: Box;
  ink: Box[];
};

const meets = (a: Box, b: Box): boolean =>
  a.top < b.bottom - 0.01 &&
  b.top < a.bottom - 0.01 &&
  a.left < b.right - 0.01 &&
  b.left < a.right - 0.01;

/** Rows with a description; their controls get data-k4 ids, in DOM order. */
const markRows = async (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[role="group"][id^="row-"]')].flatMap((row) => {
      const desc = row.querySelector(":scope > span:last-of-type:not([id])");
      if (desc === null || desc.previousElementSibling === null) return [];
      return [...row.querySelectorAll<HTMLElement>("button, input")]
        .filter((c) => (c.compareDocumentPosition(desc) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)
        .map((c, i) => {
          c.dataset["k4"] = `${row.id}-${String(i)}`;
          return `${row.id}-${String(i)}`;
        });
    }),
  );

/** The focused control's ring, its grid track, and its row's description (box and text lines). */
const measure = async (page: Page, k4: string): Promise<Found> =>
  page.locator(`[data-k4="${k4}"]`).evaluate((el) => {
    const row = el.closest<HTMLElement>('[id^="row-"]');
    if (row === null) throw new Error("no row");
    const desc = row.querySelector(":scope > span:last-of-type:not([id])");
    if (desc === null) throw new Error("no description");
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const grow =
      cs.outlineStyle === "none"
        ? 0
        : Number.parseFloat(cs.outlineWidth) + Number.parseFloat(cs.outlineOffset);
    const ring = {
      top: r.top - grow,
      bottom: r.bottom + grow,
      left: r.left - grow,
      right: r.right + grow,
    };
    // The grid track the control sits in: walk the row's resolved track sizes.
    const rs = getComputedStyle(row);
    const rr = row.getBoundingClientRect();
    let top = rr.top + Number.parseFloat(rs.paddingTop);
    const mid = (r.top + r.bottom) / 2;
    let track = { top, bottom: top, left: rr.left, right: rr.right };
    for (const size of rs.gridTemplateRows.split(" ").map(Number.parseFloat)) {
      track = { top, bottom: top + size, left: rr.left, right: rr.right };
      if (mid <= top + size) break;
      top += size;
    }
    const range = document.createRange();
    range.selectNodeContents(desc);
    const box = (b: DOMRect) => ({ top: b.top, bottom: b.bottom, left: b.left, right: b.right });
    return {
      row: row.id,
      control: el.getAttribute("aria-label") ?? el.id,
      ring,
      track,
      desc: box(desc.getBoundingClientRect()),
      ink: [...range.getClientRects()].map(box),
    };
  });

const STORIES = ["models-sheet/default", "models-sheet/cagr", "models-sheet/sp"] as const;

for (const text200 of [false, true]) {
  test(`K4 at ${text200 ? "200%" : "100%"} text: rings in the track, targets off the description, description taps inert`, async ({
    page,
  }) => {
    const seen = new Set<string>();
    for (const id of STORIES) {
      await gotoStory(page, id, { text200 });
      await page.keyboard.press("Tab"); // keyboard modality: .focus() then matches :focus-visible
      for (const k4 of await markRows(page)) {
        const control = page.locator(`[data-k4="${k4}"]`);
        await control.scrollIntoViewIfNeeded();
        await control.focus();
        const m = await measure(page, k4);
        seen.add(m.row);
        const at = `${id} ${m.row} ${m.control}`;
        // K4 (1): the ring never leaves the track, so it never reaches the description.
        expect(
          m.ring.top >= m.track.top - 0.5,
          `${at}: ring top ${String(m.ring.top)} above track ${String(m.track.top)}`,
        ).toBe(true);
        expect(
          m.ring.bottom <= m.track.bottom + 0.5,
          `${at}: ring bottom ${String(m.ring.bottom)} below track ${String(m.track.bottom)}`,
        ).toBe(true);
        expect(meets(m.ring, m.desc), `${at}: ring meets the description`).toBe(false);
        // K4 (3)/(4): Clamp's target is the full 44px; a number row's is ≥24px; neither reaches
        // the description.
        const [t] = await targetsOf(page, `[data-k4="${k4}"]`);
        if (t === undefined) throw new Error(`${at}: no target`);
        const h = t.box.bottom - t.box.top;
        if (t.row) expect(h >= 24, `${at}: row target ${String(h)}px`).toBe(true);
        else expect(h >= 43.99 * (text200 ? 1 : 1), `${at}: target ${String(h)}px`).toBe(true);
        expect(meets(t.box, m.desc), `${at}: target meets the description box`).toBe(false);
        for (const line of m.ink)
          expect(meets(t.box, line), `${at}: target meets description text`).toBe(false);
        // K4 (2): a tap on the description text toggles and opens nothing.
        await control.blur();
        const before = await control.getAttribute("aria-checked");
        for (const line of m.ink.slice(0, 1)) {
          const x = Math.min(
            Math.max((t.box.left + t.box.right) / 2, line.left + 2),
            line.right - 2,
          );
          for (const y of [line.top + 1, (line.top + line.bottom) / 2]) {
            await page.mouse.click(x, y);
            expect(await control.getAttribute("aria-checked"), `${at}: tap at y=${String(y)}`).toBe(
              before,
            );
            expect(
              await control.evaluate((e) => e === document.activeElement),
              `${at}: tap focused it`,
            ).toBe(false);
          }
        }
      }
    }
    expect([...seen].toSorted()).toEqual([
      "row-clamp",
      "row-minmax",
      "row-samples",
      "row-variable",
      "row-volatility",
      "row-years",
    ]);
  });
}

for (const theme of ["dark", "linen"] as const) {
  test(`K4 focus rings (${theme}): Clamp's inside its button, a number row's inside its value cell`, async ({
    page,
  }, info) => {
    await gotoStory(page, "models-sheet/default", { theme });
    await page.keyboard.press("Tab");
    for (const [name, control, row] of [
      ["clamp", 'button[aria-label="Clamp minimum price"]', "#row-clamp"],
      ["volatility", "#v2-vol", "#row-volatility"],
    ] as const) {
      await page.locator(control).scrollIntoViewIfNeeded();
      await page.locator(control).focus();
      const box = await page.locator(row).boundingBox();
      if (box === null) throw new Error(`no ${row}`);
      const file = `k4--${name}-focus--${theme}.png`;
      if (!existsSync(info.snapshotPath(file))) {
        info.annotations.push({
          type: "baseline-pending",
          description: `${info.project.name}/${file}`,
        });
        if (process.env["VISUAL_UPDATE"] !== "1") continue;
      }
      await expect(page).toHaveScreenshot(file, {
        clip: { x: box.x - 8, y: box.y - 24, width: box.width + 16, height: box.height + 32 },
      });
    }
  });
}
