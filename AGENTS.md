## Beautify

Two questions before merge:

1. Am I proud of this?
2. Is it beautiful?

Third, after hygiene is green:

3. Will the next engineer want to work here because of it?

Load the beautify skill for write, review, refactor, merge, and quality setup. Run repo gates; red means not done.

Campaign: (meanings live in the beautify skill)

- gates: unstarted
- hygiene: done — 2026-10-13 — Oxfmt, Oxlint, and TypeScript 7 with both strict index flags. `unicorn/require-post-message-target-origin` stays allowed: Worker.postMessage's second argument is a transfer list. Lint scope is `src`, `test`, `scripts`, and `vite.config.ts`.
- deps: done — 2026-10-13 — Vite 8.3.4 and React 19.3.0 are in. Styled-components stays. Removed c8, @vitejs/plugin-basic-ssl, and @svgr/core. Bun 1.3.13 is the install and the script runner. `bun.lock` is the lockfile. Netlify runs `bun run build` with `BUN_VERSION` 1.3.13. Do not add @rolldown/plugin-babel. CI and Dependabot stay on the gates pass.
- shape: done — 2026-10-13 — Knip is clean. Vite supplies src/main.tsx and vite.config.ts; the worker is the only explicit entry. test/ stays outside the Knip project. Removed the unused lightning SVG, vite-plugin-svgr, and the MDX toolchain. CI wiring stays on the gates pass.
- tests: done — 2026-10-13 — `bun run test` is `bun scripts/check-coverage.ts`: `bun test --isolate` with lcov, and test files excluded from the percentage. `test-suite.json` lineCoverage 65.65 is the floor; a drop of more than one point fails, and a rise rewrites the file. The checker re-invokes `process.execPath` because a literal `bun test` spawn is this package script. `validateNumericInput` stays private. Historic time is frozen in `test/freeze-clock.js`. `test/` stays outside Knip. Hook and CI stay on the gates pass.
- system: unstarted
- trust: unstarted
- cost: unstarted
