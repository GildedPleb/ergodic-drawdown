## Beautify

Two questions before merge:

1. Am I proud of this?
2. Is it beautiful?

Third, after hygiene is green:

3. Will the next engineer want to work here because of it?

Load the beautify skill for write, review, refactor, merge, and quality setup. Run repo gates; red means not done.

Campaign: (meanings live in the beautify skill)

- gates: unstarted
- hygiene: done — 2026-10-13 — Oxfmt, Oxlint, and TypeScript 7 with both strict index flags. `unicorn/require-post-message-target-origin` stays allowed: Worker.postMessage's second argument is a transfer list. Lint scope is `src` and `vite.config.ts`.
- deps: done — 2026-10-13 — Vite 8.3.4 and React 19.3.0 are in. Styled-components stays. Removed c8, @vitejs/plugin-basic-ssl, and @svgr/core. Node is ^20.19.0 or >=22.12.0, and Netlify NODE_VERSION is 22. Do not add @rolldown/plugin-babel. CI and Dependabot stay on the gates pass.
- shape: done — 2026-10-13 — Knip is clean. Vite supplies src/main.tsx and vite.config.ts; the worker is the only explicit entry. test/ stays outside the project until bun test. Removed the unused lightning SVG, vite-plugin-svgr, and the MDX toolchain. CI wiring stays on the gates pass.
- tests: unstarted
- system: unstarted
- trust: unstarted
- cost: unstarted
