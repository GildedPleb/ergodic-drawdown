## Beautify

Two questions before merge:

1. Am I proud of this?
2. Is it beautiful?

Third, after hygiene is green:

3. Will the next engineer want to work here because of it?

Load the beautify skill for write, review, refactor, merge, and quality setup. Run repo gates; red means not done.

Campaign: (meanings live in the beautify skill)

- gates: done — 2026-10-13 — Lefthook pre-commit runs format, lint, typecheck, the coverage ratchet, and gitleaks 8.30.1. CI job `check` repeats that on `bun install --frozen-lockfile`, plus Knip. Dependabot groups React, Chart.js, and Vite. Main is unprotected until branch protection requires `check`. The dev base path is gone. Local dev and preview serve `/` with COOP/COEP. `*.pem` is ignored. The historical localhost key stays allowlisted. Do not rewrite history.
- hygiene: done — 2026-10-13 — Oxfmt, Oxlint, and TypeScript 7 with both strict index flags. `unicorn/require-post-message-target-origin` stays allowed: Worker.postMessage's second argument is a transfer list. Lint scope is `src`, `test`, `scripts`, and `vite.config.ts`.
- deps: done — 2026-10-13 — Vite 8.3.4 and React 19.3.0 are in. Styled-components stays. Removed c8, @vitejs/plugin-basic-ssl, and @svgr/core. Bun 1.3.13 is the install and the script runner. `bun.lock` is the lockfile. Netlify runs `bun run build` with `BUN_VERSION` 1.3.13. Do not add @rolldown/plugin-babel.
- shape: done — 2026-10-13 — Knip is clean. Vite supplies src/main.tsx and vite.config.ts; the worker is the only explicit entry. test/ stays outside the Knip project. Removed the unused lightning SVG, vite-plugin-svgr, and the MDX toolchain.
- tests: done — 2026-10-13 — The test command is `bun run test`. It runs every test, times the whole run, and writes that time and the line coverage into `test-suite.json` on every pass. The floor is 71.26. A drop of more than one point fails. `bun test` by itself stops. The checker starts the tests through `process.execPath` because a literal `bun test` string is this package script. `validateNumericInput` stays private. Historic time is frozen in `test/freeze-clock.js`. `test/` stays outside Knip.
- system: done — 2026-10-13 — The worker bundle is the walks and the sample buffers, 15.62 kB. Price models stay on the main thread. Halving dates live in `src/halvings.ts`. Historic still reads the clock and localStorage inside the price function. `contexts/computed` was left as it is.
- trust: done — 2026-10-13 — Spot price and block height each try three sources. A zero or a failed source is logged and the next source is used. All three failing throws, and `useCurrentPrice` and `useHalvings` throw that into `RootError`. A cached non-positive candle or block height is not used. Fetch JSON stays `unknown` until that check. COOP/COEP stay on dev, preview, and Netlify. HEAD tracks no pem. No `git+ssh` ESLint dependency and no MDX packages. The historical localhost key stays allowlisted. Do not rewrite history.
- cost: done — 2026-10-13 — The week map reads the log bounds already posted with the price bounds. A cold 1000×10×208 walk dropped from 37ms to 26ms with the same prices. The 0.01 floor and the weeks before the series stay. Spot price is still requested twice, once for the quote and once inside the weekly gap fill.
