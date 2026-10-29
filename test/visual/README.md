# Visual and browser checks (Playwright)

**Not in the merge gate.** Every check runs on `/design/<group>/<story>` in a flag-on production build (the app route, not Storybook). `storybook.pw.ts` is the one Storybook check and runs only when `STORYBOOK_URL` is set.

## Matrix (MVP-SPEC §4, G7)

Projects are `<engine>-<viewport>` for engines Chromium and WebKit:

| Viewport  | Notes           |
| --------- | --------------- |
| 390×844   | phone portrait  |
| 844×390   | phone landscape |
| 1024×768  | small desktop   |
| 1440×900  | desktop         |
| 1920×1080 | wide (“1800+”)  |

Chromium also runs `chromium-zoom200` (200% browser zoom), `chromium-text200` (root font 32px) and `chromium-reduced-motion`. Themes are part of the story id: `…/linen` themes `<html>`.

| Spec                 | Checks                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matrix.pw.ts`       | Per story and project: axe has 0 serious or critical issues; every hit target is at least 44×44 (a number row's band: at least 24px tall, K4); no sideways scroll; Chromium only: every glyph comes from an `SM` face (CDP); the screenshot.                                                                                                                                                                                                       |
| `fields.pw.ts`       | Form B1 + N5: every TickToggle (tick-row), Select, NumberField, LabelGlyphs, Amount and SectionLabel story plus the seven `models-sheet/*` stories, dark and linen, at 390×844 and 1440×900 in Chromium and WebKit: one h1, no emoji text node outside the native `<select>` (B2), axe, 44px, overflow, SM-only fonts (Chromium/CDP), screenshot.                                                                                                  |
| `fonts-failed.pw.ts` | Form M8, once per engine: with `**/*.woff2` aborted, `<html data-fonts="failed">` and the amount reads `BTC 13.1` (name stays "bitcoin 13.1"); served fonts keep `₿13.1`.                                                                                                                                                                                                                                                                          |
| `k4-targets.pw.ts`   | K3/K4 (V32-BUILD:862–863), Chromium at 390×844 and 1440×900, 100% and 200% text, on every `models-sheet` row with a description: the focus ring stays inside the control's grid track; Clamp's target is 44px and a number row's at least 24px; no target meets the description; a tap on the description toggles and opens nothing.                                                                                                               |
| `k5-hover.pw.ts`     | K5 (V32-BUILD:864), Chromium at 390×844 and 1440×900, dark and linen: hovering the Clamp tick or the first asset key, off and on, draws a solid 1px outline in the mark's own colour at 2px; the key's 2px focus ring sits at 5px (gap, hover, gap; 25px overall, 9px at 200% text) whether or not hover shows; a disabled tick and an inert key get none. Baselines `k5--{tick,key}-hover[-on]--<theme>.png`, `k5--key-focus-hover--<theme>.png`. |
| `k6-large.pw.ts`     | K6 (V32-BUILD:866, Large A), Chromium at 390×844 and 1440×900, dark and linen: a Swatches mark is 20px with a 2px stroke and a 10px core; hover is a 2px outline in its own colour at 3px; focus is 2px `--focus` at 8px, 40px across, still 8px at 200% text; the large disabled stories are dashed with no ring. Baselines `k6--swatch-{off,on,hover,hover-on,focus-on,focus-hover}--<theme>.png`, `k6--large-disabled[-on]--<theme>.png`.       |
| `tick-row.pw.ts`     | Once per engine at 1024×768: click, Space and Enter toggle; a held Enter, Space or pointer toggles once (FL-001); disabled stays put; deep links; the linen story themes `<html>`.                                                                                                                                                                                                                                                                 |

## Baselines

Baselines live in `test/visual/__screenshots__/<project>/`. One reference renderer: the Chromium that `@playwright/test` 1.64.1 pins, on the Grok box (Debian 13). No containers. Generate and compare only there, never on a laptop, because font rasterising differs. The preview on 4173 may belong to someone else, so serve your own build on a free port:

```bash
VITE_DESIGN_ROUTE=1 bunx vite build && bunx vite preview --host 127.0.0.1 --port 4292 --strictPort &
cd test/visual && PLAYWRIGHT_BASE_URL=http://127.0.0.1:4292 VISUAL_UPDATE=1 \
  bunx playwright test -c playwright.config.ts --project='chromium-*' --update-snapshots
```

The `webkit-` baselines are stale until WebKit launches on the box; until then they are not a reference and must not be regenerated anywhere else.

A project with no baseline still runs every other check. It records a `baseline-pending` annotation instead of creating one. Baselines need CODEOWNERS `@GildedPleb` and the `design-approved` label after Form's notes.

## Reference phones (G8)

Playwright WebKit on Linux is not iOS Safari. The real-device pass (Pixel 6a class, iPhone SE 3) stays manual (G11).

## Local

```bash
bunx playwright install chromium webkit
bun run visual                      # builds with VITE_DESIGN_ROUTE=1 and serves on 127.0.0.1:4173
bun run visual -- --project='chromium-*'
PLAYWRIGHT_BASE_URL=https://<deploy-preview> bun run visual   # against a preview
```
