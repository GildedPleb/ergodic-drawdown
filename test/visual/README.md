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

| Spec                 | Checks                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matrix.pw.ts`       | Per story and project: axe has 0 serious or critical issues; every hit target is at least 44×44; no sideways scroll; Chromium only: every glyph comes from an `SM` face (CDP); the screenshot.                                                                                                                                                    |
| `fields.pw.ts`       | Form B1 + N5: every TickToggle (tick-row), Select, NumberField, LabelGlyphs, Amount and SectionLabel story plus the seven `models-sheet/*` stories, dark and linen, at 390×844 and 1440×900 in Chromium and WebKit: one h1, no emoji text node outside the native `<select>` (B2), axe, 44px, overflow, SM-only fonts (Chromium/CDP), screenshot. |
| `fonts-failed.pw.ts` | Form M8, once per engine: with `**/*.woff2` aborted, `<html data-fonts="failed">` and the amount reads `BTC 13.1` (name stays "bitcoin 13.1"); served fonts keep `₿13.1`.                                                                                                                                                                         |
| `tick-row.pw.ts`     | Once per engine at 1024×768: click, Space and Enter toggle; a held Enter, Space or pointer toggles once (FL-001); disabled stays put; deep links; the linen story themes `<html>`.                                                                                                                                                                |

## Baselines

Baselines live in `test/visual/__screenshots__/<project>/`. Generate them only in the pinned container, never on a laptop or the Grok box, because font rasterising differs:

```bash
docker run --rm -v "$PWD":/w -w /w mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -lc 'npm i -g bun && bun install --frozen-lockfile && bun run visual:update'
```

Exception, stated in the PR: the field-matrix baselines (`chromium-` and `webkit-` × `390x844` / `1440x900`) were generated on the Grok box (Debian 13, the browsers pinned by `@playwright/test` 1.64.1) because the box has no container runtime. Regenerate them in the container above before `design-approved`.

A project with no baseline still runs every other check. It records a `baseline-pending` annotation instead of creating one. Baselines need CODEOWNERS `@GildedPleb` and the `design-approved` label after Form's notes.

## Reference phones (G8)

Playwright WebKit on Linux is not iOS Safari. The real-device pass (Pixel 6a class, iPhone SE 3) stays manual (G11). On the Grok box WebKit runs after `sudo -n env "PATH=$PATH" bunx playwright install-deps webkit`; the container above stays the reference.

## Local

```bash
bunx playwright install chromium webkit
bun run visual                      # builds with VITE_DESIGN_ROUTE=1 and serves on 127.0.0.1:4173
bun run visual -- --project='chromium-*'
PLAYWRIGHT_BASE_URL=https://<deploy-preview> bun run visual   # against a preview
```
