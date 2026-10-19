# For Form: tokens v2.2 and the G3 money rulings, as implemented in v2

This is the record Probe asked for (REPORT-MODELS-v22 m6). Source of truth in code:
`src/v2/design/tokens/{palette,semantic,motion-etc}.css` and `src/v2/design/format/money.ts`.
The table below is generated from the formatter itself, and `test/v2/format.test.ts` pins every row.

## Tokens v2.2 (Form, FINAL)

- Palette: `--shadow-ink-dark: rgb(0 0 0 / 0.35)`, `--shadow-ink-linen: rgb(60 44 24 / 0.16)`.
- Semantic, per theme: `--shadow-ink` (dark → `--shadow-ink-dark`, linen → `--shadow-ink-linen`),
  the only shadow colour.
- `--shadow-sheet: 0 -18px 40px var(--shadow-ink)` is the one allowed shadow (the v32 dock lift).
  It is declared on `:root` and recomputed on every `[data-theme]` element, so a nested linen
  subtree gets the linen ink (Probe m4).
- `--shadow-*` may not reference a palette colour directly (R5); `--invalid` mirrors `--text`.
- Phase 0 review additions: see TOKENS.md, "Phase 0 review fixes".

## G3 money rulings

1. ₿ is a prefix like $, never after a number, never a space after ₿.
2. Zero is `₿0` / `$0`. No trailing `.0` (`₿1`, `₿13`, `$1`). Cents show only below $1, at most
   two decimals (`$0.45`, `$0.50`); a non-zero amount under a cent is `<$0.01`.
3. NaN / ±∞ display as `—`, spoken "not available".
4. Fonts failed: `BTC` + NBSP replaces ₿; the spoken name is still "bitcoin 0.7".
5. From $1 up to $10,000, whole dollars with commas (`$5` for 4.5, `$12`, `$1,040`, `$9,950`).
   From $10,000, k/M at 3 significant figures (`$85.4k`, `$12.3M`). The k unit starts at a raw
   $10,000, so `$9,999.99` → `$10,000`, never `$10k`.
6. Ranges:
   - Crossing zero is decided from the raw values, before rounding, and always uses "to" with the
     prefix repeated: `−₿0.4 to ₿0.7`.
   - Both ends share the wider end's precision (`₿0.4–1.3`). A non-zero end that would round to 0
     keeps its own significant digits, capped at sat precision: `−₿0.0021 to ₿0.42`.
   - A same-sign end below sat precision stays compact as 0: `₿0–0.7`.
   - Same sign: one prefix, en dash, number-line order: `₿0.4–0.7`, `−₿0.7–0.4`.
   - Spoken names repeat a shared minus so a negative range can't be heard as crossing zero:
     "minus bitcoin 0.7 to minus 0.4".
   - Equal ends collapse to one value.

## Open for Form

- A crossing range whose negative end is below sat precision (`−1e-9 to 0.7`) shows
  `<₿0.00000001 to ₿0.7`. The sign of the tiny end is not shown. Rule on the form you want.
- `fmtUSD(0.5)` shows `$0.50` (two decimals, as the cents rule reads). Say if you want `$0.5`.
- There is no $ range formatter yet. When one is added, the same rule applies with cents as the cap.

## Examples (generated)

| Call                         | Display                | Spoken name                                 |
| ---------------------------- | ---------------------- | ------------------------------------------- |
| `fmtBTC(0)`                  | `₿0`                   | bitcoin 0                                   |
| `fmtBTC(1)`                  | `₿1`                   | bitcoin 1                                   |
| `fmtBTC(13)`                 | `₿13`                  | bitcoin 13                                  |
| `fmtBTC(13.1)`               | `₿13.1`                | bitcoin 13.1                                |
| `fmtBTC(0.42)`               | `₿0.42`                | bitcoin 0.42                                |
| `fmtBTC(0.0021)`             | `₿0.0021`              | bitcoin 0.0021                              |
| `fmtBTC(1e-9)`               | `<₿0.00000001`         | less than bitcoin 0.00000001                |
| `fmtBTC(-0.4)`               | `−₿0.4`                | minus bitcoin 0.4                           |
| `fmtBTC(NaN)`                | `—`                    | not available                               |
| `fmtUSD(0)`                  | `$0`                   | $0                                          |
| `fmtUSD(0.004)`              | `<$0.01`               | less than $0.01                             |
| `fmtUSD(0.45)`               | `$0.45`                | $0.45                                       |
| `fmtUSD(0.5)`                | `$0.50`                | $0.50                                       |
| `fmtUSD(1)`                  | `$1`                   | $1                                          |
| `fmtUSD(4.5)`                | `$5`                   | $5                                          |
| `fmtUSD(12)`                 | `$12`                  | $12                                         |
| `fmtUSD(240)`                | `$240`                 | $240                                        |
| `fmtUSD(999.5)`              | `$1,000`               | $1,000                                      |
| `fmtUSD(1040)`               | `$1,040`               | $1,040                                      |
| `fmtUSD(9950)`               | `$9,950`               | $9,950                                      |
| `fmtUSD(9999.99)`            | `$10,000`              | $10,000                                     |
| `fmtUSD(10000)`              | `$10k`                 | $10k                                        |
| `fmtUSD(85400)`              | `$85.4k`               | $85.4k                                      |
| `fmtUSD(1200000)`            | `$1.2M`                | $1.2M                                       |
| `fmtUSD(2500000000)`         | `$2,500M`              | $2,500M                                     |
| `fmtUSD(NaN)`                | `—`                    | not available                               |
| `range(-0.7, -1e-9)`         | `−₿0.7–0`              | minus bitcoin 0.7 to minus 0                |
| `range(-1e-9, 0.7)`          | `<₿0.00000001 to ₿0.7` | less than bitcoin 0.00000001 to bitcoin 0.7 |
| `range(0.4, 0.7)`            | `₿0.4–0.7`             | bitcoin 0.4 to 0.7                          |
| `range(0.42, 1.3)`           | `₿0.4–1.3`             | bitcoin 0.4 to 1.3                          |
| `range(-0.7, -0.4)`          | `−₿0.7–0.4`            | minus bitcoin 0.7 to minus 0.4              |
| `range(-0.4, 0.7)`           | `−₿0.4 to ₿0.7`        | minus bitcoin 0.4 to bitcoin 0.7            |
| `range(-0.0021, 0.42)`       | `−₿0.0021 to ₿0.42`    | minus bitcoin 0.0021 to bitcoin 0.42        |
| `range(0.0021, 0.42)`        | `₿0.0021–0.42`         | bitcoin 0.0021 to 0.42                      |
| `range(1e-9, 0.7)`           | `₿0–0.7`               | bitcoin 0 to 0.7                            |
| `range(0.4, 0.4)`            | `₿0.4`                 | bitcoin 0.4                                 |
| `range(14.9, 175)`           | `₿14.9–175`            | bitcoin 14.9 to 175                         |
| `fmtBTC(0.7, {fontsFailed})` | `BTC␣0.7`              | bitcoin 0.7                                 |
