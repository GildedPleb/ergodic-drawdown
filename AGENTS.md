# AGENTS.md

Package name is `escape-velocity`. The repo is a static client Monte Carlo for Bitcoin planning, hosted at stackmath.xyz. The browser owns the walks, the drawdown math, and the chart. There is no server-side simulation.

Read this file before changing the engine. `TODO.md` is the product backlog. Leave those items alone until someone asks for one. A visual redesign is a separate effort. Styled-components stays until that redesign.

Fix the layer that owns the bug. Prove a buffer or scheduler change with a failing test before rewriting it.

## Commands

Bun 1.3.13 is the install, the script runner, and the test runner. Vite bundles. `bun.lock` is the lockfile.

| Command             | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `bun install`       | Install from the lockfile. CI uses `--frozen-lockfile`.                |
| `bun run dev`       | Refresh weekly prices, then Vite at `http://localhost:5173/`.          |
| `bun run build`     | Refresh weekly prices, `tsc -b`, then Vite build to `dist/`.           |
| `bun run preview`   | Serve `dist/`. Isolation headers are on here too.                      |
| `bun run format`    | `oxfmt --check`.                                                       |
| `bun run lint`      | Oxlint, type-aware, on `src`, `test`, `scripts`, and `vite.config.ts`. |
| `bun run typecheck` | `tsc -b` for the app project and the node project.                     |
| `bun run knip`      | Unused exports in `src`. `test/` is outside the Knip project.          |
| `bun run test`      | The only test command. Full suite, coverage, and the suite record.     |
| `bun run secrets`   | Gitleaks on the staged diff.                                           |

Lefthook pre-commit runs format, lint, typecheck, test, and secrets in parallel. CI job `check` runs those plus Knip. `check` is not required on `main`. A push to `main` starts the Netlify deploy immediately. Netlify builds with `bun run build`, `BUN_VERSION` 1.3.13, and publishes `dist/`.

A red gate is unfinished work. Do not add a file-level lint disable, `@ts-ignore`, or `@ts-expect-error` to get green.

## Tests

`bun run test` is `bun scripts/check-coverage.ts`. It spawns this Bun binary with `test --isolate --coverage` and `SUITE=1`.

`bun test` by itself exits. `bunfig.toml` preloads `test/suite-only.ts`, which stops unless `SUITE=1`. A one-file run is `SUITE=1 bun test <file>`. The checker must not contain the literal string `bun test`, because that string is the package script.

`test-suite.json` holds `lineCoverage` and `wallTimeMs`.

- `lineCoverage` is a floor. A drop of more than one point fails and leaves the file alone. A higher measurement writes the new floor.
- `wallTimeMs` is a budget. A run more than 10% over it fails and leaves the file alone. A faster run does not lower it. When the floor rises, the rewrite keeps the existing budget.
- Test files are outside the coverage percentage. New tests raise the floor only when they execute new lines under `src/` or `scripts/`.
- The checker requires both fields. `coverage/` is gitignored.

Two TypeScript projects:

- `tsconfig.app.json` includes `src` and `test`. It has DOM libs and no `@types/node`. Tests use Bun APIs. A file under `test/` cannot import a file that only the node project includes.
- `tsconfig.node.json` includes `vite.config.ts` and `scripts`. Tests of `scripts/` live under `scripts/`. `scripts/bun-test.d.ts` is the ambient `bun:test` declare for that project. Do not give it the same global `Expectation` name as `test/bun-test.d.ts`.

Oxlint `no-unsafe-type-assertion` rejects `as unknown as`. A DOM stand-in for a React mount is `test/dom-shim.js`, loaded before `react`. `exactOptionalPropertyTypes` is on: omit an optional field instead of passing `undefined`.

`test/freeze-clock.js` freezes `Date` for Historic prices. The frozen instant is 1713571767000, block 840000, week 52. Leave Historic on `new Date()` and `loadHalvings()`. Do not add an `options.now` argument to make the test easier.

`validateNumericInput` stays private. Tests call `applyTypeValidation` and `applyConstraints`.

Vitest is only a fallback if a test needs the Vite transform. Mounting `ComputedProvider` to see whether a worker restarted is slow. Prefer calling the handler with a buffer.

## Where the code lives

- `src/main.tsx` boots React, the error boundary, and strict mode.
- `src/contexts/model.tsx` holds the price model, epoch count, sample count, and the simulation `GrowableSharedArray`.
- `src/contexts/drawdown.tsx` holds drawdown settings and the drawdown buffer.
- `src/contexts/computed/index.tsx` is the compute graph. One component calls `useDependency` for every node.
- `src/contexts/computed/hooks/use-dependancy.tsx` is the scheduler. The filename is spelled that way.
- `src/contexts/workers/worker.ts` is the worker entry and the Knip entry. `src/contexts/workers/index.tsx` is the pool on the main thread.
- `src/contexts/workers/simulation.ts` turns a walk into prices. `volume.ts` turns those prices into a balance. `drawdown-variable.ts`, `group.ts`, `quantile.ts`, and `normal.ts` are the other tasks.
- `src/classes/growable-shared-array.ts` is the epoch-by-sample grid. `variable-drawdown-cache.ts` is one week and amount per sample. `variable-drawdown-final.ts` merges those into the volume worker.
- `src/data/models/` are the price bounds. `src/data/walks/` are the ergodic walks. Walks must not import a value from `src/types.ts`; a type import is fine. A value import pulls the model table into the worker.
- `src/data/datasets/bitcoin_weekly_prices_transformed_2.json` is the baked Saturday close grid.
- `src/halvings.ts` loads and saves halving times. `src/api.ts` fetches spot, weekly gap, and block height.
- `src/number-at.ts` is `numberAt` and `lastFinite`.
- `src/panels/chart.tsx` is Chart.js. `resizeDelay` stays `0`.
- `scripts/update-weekly-prices.ts` appends completed Saturday closes. `scripts/check-coverage.ts` and `scripts/suite-record.ts` own the suite record. `scripts/gitleaks.ts` downloads the pinned gitleaks binary.

## Compute graph

`useDependency` hashes inputs, waits until every watched upstream node has `currentHash === lastComputed`, runs the handler, and aborts the previous run when the hash changes.

The readiness pair lives in one React state object, `{ lastComputed, result }`. Completion always replaces that object. A repeated result such as `"Success"` from the price and block gate is `Object.is`-equal, so a `setState` of the string alone does not render, `lastComputed` never publishes, and the next layer waits forever. Do not store `lastComputed` only in a ref.

`narrow()` passes a dependency through and does not throw when `result` is null. A node that must see fresh data lists that upstream in the watched list, not only inside `narrow()`.

`chartOptions` and `dataProperties` pass `clearResults: false`. Clearing sets `result` to null and leaves `lastComputed` in place.

`fastCustomHashSum` hashes a `GrowableSharedArray`, a `Float64Array`, a `Float64Array[]`, and a `Map` as the type name. In-place buffer writes do not change the hash. The handlers must see those writes on the object they already hold. Do not "fix" the hash to include buffer bytes without a design for workers and aborts.

The graph, top to bottom:

1. Interim dataset, inflation factors, the price-and-block gate, halving annotations, min and max bound arrays, and their chart datasets.
2. Static drawdown, simulation, simulation stats, variable drawdowns, and their labels.
3. Chart options, volume, zero count, volume stats, price and drawdown distributions, price and drawdown walks, and data properties.

Simulation fills new epochs or new samples when the model hash matches. A hash mismatch clears the grid first. Volume does the same on the drawdown grid.

## Caches

Min, max, inflation, and the reoccurring-item series do not keep an LRU. The graph already skips a handler whose hash is unchanged, and a one-slot LRU cannot serve a previous key. `getInterimWeeklyData` does not keep its own series. React Query stores it under `["interim", now]`.

`memoizee` stays on the price models. Historic's memoize closes over `loadHalvings()` and `new Date()`, so the cached value depends on call order. Leave that in place.

The variable drawdown buffers live in a `Map` on `src/contexts/drawdown.tsx`, one `VariableDrawdownCache` per active variable hash. A hash that is no longer active is deleted. The stored week index depends on `weeksSince`, so the validity hash is `fullHashInflation` plus that count, and a miss `clear()`s the buffer before reuse. `variableCacheHash` includes `weeksSince` too.

`finalVariableCache` keeps the one `VariableDrawdownFinal` volume just read. A new final replaces the previous entry. Volume throws `"No cache for variable drawdown"` when that entry is missing.

The dependency matrix is `useDependency`. It is not an auxiliary cache. Do not replace it with Redux or another store. Redux cannot abort a worker, wait on an upstream node, or see an in-place `SharedArrayBuffer` write.

A `Map` hashes as the string `"Map"`. Replacing a buffer does not wake dependents by itself. Volume and the labels watch the drawdown-variables node.

## Shared buffers

`GrowableSharedArray` is a row-major `Float64Array` over a `SharedArrayBuffer`. A cell is `itemLength` floats, normally `WEEKS_PER_EPOCH` (208). Index is `(y * width + x) * itemLength`. Active width and height can be smaller than the allocated grid. `MAX_EPOCH_COUNT` is 30. `MAX_SAMPLE_COUNT` is 10000.

A cell whose last float is `0` is empty. `get` returns undefined. `getRow` returns undefined unless the caller passes `getZero`. That includes a cell whose earlier floats are real. Drawdown charts and the drawdown distribution pass `getZero` because a balance may end at 0. Prices are floored at 0.01, so a finished price cell is not empty. Do not treat a zero tail as a present cell unless the presence bit changes too.

`clear()` writes zeros and zeroes the cached dimensions. It does not reset `cacheHash`.

`resize` grows capacity, then walks rows from the bottom and `copyWithin`s each old row to the new stride. The fill of the new columns is required: those slots overlap the next row's old bytes. After a width grow, the previous last column is intact and the new column reads empty. Shrinking the active size leaves the old bytes. Growing back inside the same allocation shows them again. That is the validity cache, and `setValidity` keeps the max width and height for a matching hash.

`getLastArray` reads the last float of the last active column. A zero-width grid has no column and returns NaN per row. Callers sort that array. `handleSimulationStats` sorts the array it returns, and that array is the published `finalBalance`.

`coalesce` copies the active row from `lastHalving` to the active end. Allocated slack past `activeWidth` is not data.

`lastFinite` is the continuation value. A NaN tail means that week is before the bound series. It is not the price or the balance to carry forward. When now falls at or past the end of an epoch, that epoch is stored as NaN and the spot price is planted on the first in-range week. `startEpoch` of `0` starts at epoch 0. Subtracting 1 from it reads epoch -1.

`VariableDrawdownCache.setValidity` always writes the new hash and grows height through `findNextGreatest1000`. It does not reset on a hash change. `GrowableSharedArray.setValidity` does. Callers `clear()` when `getValidity` returns height 0. `isFull` checks every sample in `cacheHeight`.

`src/contexts/workers/drawdown-variable.ts` adds 1 to the chosen drawdown week. The comment there records an unresolved off-by-one. Leave the `+ 1` until a test shows the week it should be.

## Workers

The pool size is `navigator.hardwareConcurrency`, or 4 when that is 0. Tasks are `postMessage`d with the shared buffer in the payload. The second argument of `Worker.postMessage` is a transfer list. The oxlint rule `unicorn/require-post-message-target-origin` stays allowed for that reason.

`createTaskQueue` splits sample ranges across workers. Width extension and new samples are separate task lists. A width task's `startEpoch` is the already-valid epoch count so the worker rereads the previous epoch's tail and then fills the new epochs.

An aborted worker run can still post `completed`. The handlers return early on `signalState.aborted`, and `worker.ts` posts completed after a normal return. A thrown handler is logged and posts nothing, so the main thread waits. Do not paper over that by catching inside the handler and returning success.

Price-to-walk conversion lives only in `handleSimulation`. The week loop reads the log bounds stored beside the price bounds. Weeks before the bound series stay NaN. The 0.01 floor stays.

## Prices, blocks, and weekly history

Spot price fails over Coinbase, then CoinGecko, then Kraken. Block height fails over Blockchain.com, then Blockstream, then Mempool. A zero or a failed source is logged and skipped. All three failing throws. A cached non-positive candle or height is ignored. `useCurrentPrice` and `useHalvings` use `throwOnError`, and `RootError` prints `error.name` and `error.message`. Fetch bodies stay `unknown` until the check. Do not return a candle with close 0.

Block time for one height fails over Blockchain.com, then Blockstream, then Mempool. A zero time, a bad hash, or a failed source is logged and skipped. All three failing throws. `loadHalvings` fills any stored map with the baked times, and those baked times win over a stored copy.

`getInterimWeeklyData` trusts the baked JSON through its last point, ignores stored weeks at or before that time, and inside the next 7 days requests only the live spot. Each call follows `now`. The spot hook and this gap fill each call `getCurrentPrice`, so the fetch log appears twice.

`scripts/update-weekly-prices.ts` runs at the start of `dev` and `build`. It appends completed Saturday 00:00 UTC Coinbase BTC-USD closes and does not commit. A current file makes no request. A Coinbase failure leaves the file and the build continues. CI does not run it, so Historic expectations stay tied to the committed JSON. Test seams are `WEEKLY_FILE`, `WEEKLY_NOW`, and `WEEKLY_CANDLES`. Tests call `runWeeklyPrices` in process and pass a close loader or a fake candle fetch. They do not spawn Bun and they do not call Coinbase. `test/suite-only.ts` rejects any other `fetch`.

Baked halving times cover blocks 210000, 420000, 630000, and 840000. A future halving still needs a block-time fetch.

TanStack Query caches price, weekly history, and halvings only.

## Chart and isolation

`SharedArrayBuffer` needs cross-origin isolation. Localhost is already a secure context. Do not add a dev TLS certificate for it.

`vite.config.ts` sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on dev and preview. `netlify.toml` sends the same headers. Vite has no custom `base`. Dev and preview serve `/`. The old `/ergodic-drawdown/` URL still returns the app HTML because of SPA fallback. Leave it. Do not add a redirect unless asked.

In `src/panels/chart.tsx`, `resizeDelay` must stay `0`. Any other delay lets Chart.js render before layout, and `chartjs-plugin-annotation` reads `chartArea.left` before it exists.

## Code shape

Inline a calculation that has one caller. Use one shared function when there are two or more. Do not restore deleted helpers that have no caller. `normalizePrice` and `applyModel` were that kind of leftover.

TypeScript is 7, `strict`, with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. Indexed access can be `undefined`. An optional property is omitted, not set to `undefined`.

Stay on Vite. Do not add Next, Redux, Jotai, a second bundler, or `@rolldown/plugin-babel`.

## History and secrets

Do not rewrite git history. An old localhost private key remains in history. `.gitleaks.toml` allowlists `localhost.pem` and `localhost-key.pem` so a full-history scan can pass. `*.pem` is ignored. HEAD does not track a certificate.

## Beautify

Campaign: (meanings live in the beautify skill)

- gates: done — 2026-10-13 — Lefthook pre-commit runs format, lint, typecheck, the coverage ratchet, and gitleaks 8.30.1. CI job `check` repeats that on `bun install --frozen-lockfile`, plus Knip. Dependabot groups React, Chart.js, and Vite. Main is unprotected until branch protection requires `check`. The dev base path is gone. Local dev and preview serve `/` with COOP/COEP. `*.pem` is ignored. The historical localhost key stays allowlisted. Do not rewrite history.
- hygiene: done — 2026-10-13 — Oxfmt, Oxlint, and TypeScript 7 with both strict index flags. `unicorn/require-post-message-target-origin` stays allowed: Worker.postMessage's second argument is a transfer list. Lint scope is `src`, `test`, `scripts`, and `vite.config.ts`.
- deps: done — 2026-10-13 — Vite 8.3.4 and React 19.3.0 are in. Styled-components stays. Removed c8, @vitejs/plugin-basic-ssl, and @svgr/core. Bun 1.3.13 is the install and the script runner. `bun.lock` is the lockfile. Netlify runs `bun run build` with `BUN_VERSION` 1.3.13. Do not add @rolldown/plugin-babel.
- shape: done — 2026-10-13 — Knip is clean. Vite supplies src/main.tsx and vite.config.ts; the worker is the only explicit entry. test/ stays outside the Knip project. Removed the unused lightning SVG, vite-plugin-svgr, and the MDX toolchain.
- tests: done — 2026-10-13 — The test command is `bun run test`. It runs every test and times the whole run. `lineCoverage` in `test-suite.json` is a floor: a drop of more than one point fails and leaves the file alone, and a higher coverage writes the new floor. `wallTimeMs` is a budget: a run more than 10% over it fails and leaves the file alone, and a faster run does not rewrite it. `bun test` by itself stops. The checker starts the tests through `process.execPath` because a literal `bun test` string is this package script. `validateNumericInput` stays private. Historic time is frozen in `test/freeze-clock.js`. `test/` stays outside Knip.
- system: done — 2026-10-13 — The worker bundle is the walks and the sample buffers, 15.62 kB. Price models stay on the main thread. Halving dates live in `src/halvings.ts`. Historic still reads the clock and localStorage inside the price function. `contexts/computed` was left as it is.
- trust: done — 2026-10-13 — Spot price, block height, and block time each try three sources. A zero or a failed source is logged and the next source is used. All three failing throws, and `useCurrentPrice` and `useHalvings` throw that into `RootError`. A cached non-positive candle or block height is not used. Stored halving times keep the baked heights. Fetch JSON stays `unknown` until that check. COOP/COEP stay on dev, preview, and Netlify. HEAD tracks no pem. No `git+ssh` ESLint dependency and no MDX packages. The historical localhost key stays allowlisted. Do not rewrite history.
- cost: done — 2026-10-13 — The week map reads the log bounds already posted with the price bounds. A cold 1000×10×208 walk dropped from 37ms to 26ms with the same prices. The 0.01 floor and the weeks before the series stay. Spot price is still requested twice, once for the quote and once inside the weekly gap fill.
