# Visual regression (Playwright)

**Not in the merge gate.** Screenshots hit `/design/:story` on the redesign deploy preview (not Storybook).

## Matrix (Form)

| Viewport  | Notes           |
| --------- | --------------- |
| 390×844   | phone portrait  |
| 844×390   | phone landscape |
| 1024×768  | small desktop   |
| 1440×900  | desktop         |
| 1920×1080 | wide (“1800+”)  |

Themes: dark + linen. Also 200% zoom, reduced motion, axe, 44px targets, overflow, font-fallback.

Baselines: `test/visual/__screenshots__/`. Require CODEOWNERS `@GildedPleb` and the `design-approved` label after Form’s notes.

## Reference phones (G8)

Pixel 6a–class and iPhone SE 3. On this Linux box Playwright can run Chromium and WebKit (Linux); that is **not** iOS Safari. Real-device pass stays manual (G11).

## Local

```bash
bunx playwright install chromium
VITE_DESIGN_ROUTE=1 bun run build && bun run preview
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 bun run visual
```
