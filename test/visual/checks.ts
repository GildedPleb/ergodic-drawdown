import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

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

/** G7: no hit target under 44×44 CSS px. */
export const expectTapTargets = async (page: Page): Promise<void> => {
  const small = await page
    .locator('button, [role="switch"], [role="button"], a[href], input, select, textarea')
    .evaluateAll((els) =>
      els
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
        .map(
          ({ el, r }) =>
            `${el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)}`,
        ),
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
