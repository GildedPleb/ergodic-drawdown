import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

/** G7: axe reports 0 serious or critical issues. */
export const expectAxeClean = async (page: Page): Promise<void> => {
  const result = await new AxeBuilder({ page }).analyze();
  const bad = result.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) => `${v.id} (${v.impact ?? "?"}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
  expect(bad).toEqual([]);
};

export type Target = {
  what: string;
  /** The tap target: the element, its absolutely placed ::before or ::after, and a K4 row target for it. */
  box: { top: number; bottom: number; left: number; right: number };
  /** K4 (4): a number row's target is the row band, a recorded exception to H1 (≥24px). */
  row: boolean;
};

/** Every control's tap target, as hit-testing sees it (K3/K4). */
export const targetsOf = async (page: Page, selector: string): Promise<Target[]> =>
  page.locator(selector).evaluateAll((els) =>
    els.flatMap((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return [];
      const box = { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      const grow = (o: { top: number; bottom: number; left: number; right: number }): void => {
        box.top = Math.min(box.top, o.top);
        box.bottom = Math.max(box.bottom, o.bottom);
        box.left = Math.min(box.left, o.left);
        box.right = Math.max(box.right, o.right);
      };
      for (const pseudo of ["::before", "::after"]) {
        const p = getComputedStyle(el, pseudo);
        if (p.content === "none" || p.position !== "absolute") continue;
        const top = r.top + Number.parseFloat(p.top);
        const left = r.left + Number.parseFloat(p.left);
        grow({
          top,
          left,
          bottom: top + Number.parseFloat(p.height),
          right: left + Number.parseFloat(p.width),
        });
      }
      const band =
        el.id === "" ? null : document.querySelector(`label[data-target="row"][for="${el.id}"]`);
      if (band !== null) grow(band.getBoundingClientRect());
      const name = el.getAttribute("aria-label") ?? el.id;
      return [{ what: `${el.tagName.toLowerCase()} ${name}`, box, row: band !== null }];
    }),
  );

/** G7: no hit target under 44×44 CSS px; K4 (4): a number row's band is at least 24px tall. */
export const expectTapTargets = async (page: Page): Promise<void> => {
  const targets = await targetsOf(
    page,
    'button, [role="switch"], [role="button"], a[href], input, select, textarea',
  );
  const small = targets
    .filter(({ box, row }) => {
      const w = box.right - box.left;
      const h = box.bottom - box.top;
      return row ? w < 44 || h < 24 : w < 44 || h < 44;
    })
    .map(
      ({ what, box }) =>
        `${what} ${Math.round(box.right - box.left)}×${Math.round(box.bottom - box.top)}`,
    );
  expect(small).toEqual([]);
};

/** G7: the document never scrolls sideways. */
export const expectNoOverflow = async (page: Page): Promise<void> => {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
};

/**
 * G7 (Chromium, CDP): every rendered glyph comes from an SM face.
 * One documented exception (TOKENS.md, Form + Keel): the native <select>/<option> subtree. It is
 * transparent when closed (the Select face draws the value through LabelGlyphs) and, open, it is
 * OS chrome that may show system emoji. Everything else stays strict.
 */
export const expectOnlySmFonts = async (page: Page): Promise<void> => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const textParents: number[] = [];
  const visit = (
    node: {
      nodeId: number;
      nodeType: number;
      nodeName?: string;
      nodeValue?: string;
      children?: unknown[];
    },
    parent: number,
  ): void => {
    if (node.nodeName === "SELECT") return; // native picker exception (see above)
    if (node.nodeType === 3 && (node.nodeValue ?? "").trim().length > 0) textParents.push(parent);
    for (const c of (node.children ?? []) as (typeof node)[]) visit(c, node.nodeId);
  };
  visit(root, root.nodeId);
  const foreign = new Set<string>();
  for (const nodeId of new Set(textParents)) {
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    for (const f of fonts) if (!f.familyName.startsWith("SM ")) foreign.add(f.familyName);
  }
  expect([...foreign]).toEqual([]);
};

/**
 * Form B2 (every engine, no CDP): no text node outside the native <select> subtree contains an
 * emoji, so nothing can ever shape in an emoji font. Emoji labels live only in attributes
 * (aria-label, value) and as SVG.
 */
export const expectNoEmojiText = async (page: Page): Promise<void> => {
  const hits = await page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
      if (n.parentElement?.closest("select") !== null) continue;
      if (/\p{Extended_Pictographic}/u.test(n.nodeValue ?? "")) out.push(n.nodeValue ?? "");
    }
    return out;
  });
  expect(hits).toEqual([]);
};

export const gotoStory = async (
  page: Page,
  id: string,
  opts: { text200?: boolean; theme?: "dark" | "linen" } = {},
): Promise<void> => {
  if (opts.text200 === true) {
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.style.fontSize = "32px";
      });
    });
  }
  await page.goto(`/design/${id}${opts.theme === "linen" ? "?theme=linen" : ""}`);
  await page.locator(`main[data-story="${id}"]`).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
};

/**
 * K5 amended: the focus ring (on the mark's wrapper) sits at gap + hover stroke + gap from the
 * mark, read from the mark's own computed padding (the gap) and border (the stroke).
 */
export const focusRule = async (
  mark: Locator,
): Promise<{ focus: number; rule: number; overall: number }> =>
  mark.evaluate((el) => {
    const px = (v: string): number => Number.parseFloat(v);
    const cs = getComputedStyle(el);
    const ring = getComputedStyle(el.parentElement as Element);
    const focus = px(ring.outlineOffset);
    return {
      focus,
      rule: 2 * px(cs.paddingTop) + px(cs.borderTopWidth),
      overall: el.getBoundingClientRect().width + 2 * (focus + px(ring.outlineWidth)),
    };
  });
