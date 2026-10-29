# StackMath Phase 3 · V32 build handoff for Forge

> **Rule 0 (user, 2026-10-19):** The back end (engine, models, walks, settings, values, ranges, defaults) stays exactly as it is. The front end is built only from this guide's locked design. Never copy or reskin the old site's layout or UI. Every review starts with this check, and any screen that copies the old app fails before any detailed checks.


- **Repo:** `GildedPleb/ergodic-drawdown`, branch `redesign`.
  - Design code goes in `src/v2/design/{tokens,fonts,primitives}`; app code goes in `src/v2/app`.
  - Use CSS Modules and token variables only; stylelint bans raw values.
- **Roles:** Keel owns the architecture and Probe owns QA.
- **Author:** Form, 2026-10-19. Base read: `76ca03a` (a read-only clone).
- **Scope:** this handoff covers **Slice 1 only, the Bitcoin price model chart**. Later slices are one-liners at the end.

## RULE 0: the back end is unchanged and the front end is all new (from the user)
- **Back end:** stays exactly as it is.
  - This covers the engine, the models, the walks and the settings.
  - It also covers their values, ranges and defaults, and the state hooks.
  - `modelsPaneSchema` must cover every setting main declares: each has a v2 control or a ruled exemption (G12, checked against main's code directly; the old snapshot file is retired).
- **Front end:** built only from our design. No layout, structure or look comes from the old site.
  - The current `ModelsPane.tsx` and `ModelsPane.module.css` are replaced, not restyled.
  - Keep `schema.ts` and `from-old-ui.ts` as the data source.

## Locked (build from the v32 code; don't redesign)
- **The v32 sheet:** the frame, the bevelled edge, the fan-diamond grab point and the dock row. The row is 🔍 left · MODELS · PLANS · STATS · ⚙ right, all on one baseline.
- **Phone landscape:** a RIGHT side panel. Its bevelled border moves to the panel's left edge, and the tabs stay on top.
- **Shape and shadow:** `--radius-0` everywhere except the 45° sheet bevel. At most one shadow (see Gap 6).
- **Motion:** transform and opacity only.
- **The chart is the main event:** v32 gives it 82% of the height on a phone and 80% on desktop.
- **Type and colour:** per `tokens/`.
- **The ₿ prefix:** no space, as in `₿0.7`.

## Reference files (copy to `docs/design/v32-ref/` as visual reference only; never import them)
| File (under `/workspace/stackmath-mocks/p3/`) | Why |
|---|---|
| `dock/app.html` + `dock/build.py` | The primary reference: v32 + SM fonts + the dock row + the world layer + the right panel. Open it with `?mode=dark&st={"hint":0,"layer":"m"}`, adding `&side=r` for landscape. It needs `type/` beside it. |
| `depth/v32/build.py` | The exact code of the world (price) layer, which is the basis of this slice's chart: the `drawWorld()` function. |
| `v32/app.html` | The original locked v32. The frame geometry below is quoted from it. |
| `depth/v32-models.png` | Models in front: the closest picture of this slice's chart. |
| `dock/raw/r-closed.png`, `r-models.png`, `dock/02-right-panel.png` | The right panel. |
| `v38/v38.css`, `v38/STYLE.md`, `v37/d0-*.png`, `v39/3-phone-dark-models.png`, `system/08-components.png` | The Certificate controls. |

## Token map (v32 → v2)

**Colour:**
| v32 | v2 token |
|---|---|
| `--bg` | `--ground` |
| `--surface` | `--surface` |
| `--text` | `--text` |
| `--muted` | `--text-muted` |
| `--gold` | `--accent` |
| `--rule` | `--rule` |
| `--line` | `--hairline` |
| `--chip` | `--selected` |
| `--time` | `--today-line` |
| ₿ price #f7931a | `--path-btc-price` |
| world caption #dcb86c | `--accent` |
| world gridline #3a342a | `--hairline` |
| world axis label #a99e86 | `--text-muted` |

**Type:**
| v32 | v2 token |
|---|---|
| canvas 10px Jost | `--t-chart` (12px) |
| canvas italic 12–13px serif | `--t-chart-serif` (13px, EB Garamond) |
| tabs 600 11px | `--t-tab` |
| kicker | `--t-section` |
| h1 / `.dh` | `--t-headline` |
| row labels | `--t-row` |
| values | `--t-value` |

The canvas reads tokens through `getComputedStyle` on each draw, so switching theme only needs a redraw.

---

## Slice 1 · Bitcoin price model chart
**Ships:** the v32 shell showing the ₿ price model chart, the dock with Models selected, and a complete sheet holding only the model settings as Certificate controls, wired to the existing back end. The right panel applies too.
**Not in this slice:** these belong to Plans (Slice 2):
- the paid-in-bitcoin fan
- the paid-in-dollars line
- the danger floor and rough-start band
- the triangle markers
- the stack handle
- the depth swap

### 1a · Shell geometry (measured on `dock/app.html` with v32 rules)
| | 390×844 phone (half) | 1440×900 desktop (half) |
|---|---|---|
| Header | y 0–39.5. Padding `10px 16px 6px`, margin `0 12px`, 1px `--rule` bottom border. The fan-diamond logo is 18px + "STACKMATH" | x 48–1392, h 51.5. Padding `clamp(10px,1.4vw,18px) 0 10px`, margin `0 var(--m)` |
| Top / headline | y 39.5–76.7. `.top` padding `6px 16px 0` | h 65.4: a kicker (12px line) + the `.dh` headline. Padding `clamp(10px,1.4vw,18px) var(--m) 0` |
| Chart | y 76.7, 390×693.2 | x 24, y 116.9, 1392×717.1. Margin `0 calc(var(--m)/2)` |
| Sheet (closed, dock only) | h 82 including the 44px grab strip (was 68.1). `margin-top:6px`, padding `8px 12px 12px` | h 74 including the 44px grab strip (was 60); full viewport width, edge to edge (§1L item 6). Padding `8px clamp(16px,2.2vw,32px) clamp(14px,1.6vw,22px)` |
| Sheet (open) | chart 373.1, sheet 388.2 | chart 417.1, sheet 360 = `40vh` cap (M2 ruling, supersedes 50vh/560px); SUPERSEDED by §1L item 2 and §1M: three equal columns Models \| Plans \| Stats, with the Models ledger in column 1; first rows line up through `--sub-label-space`, with an optical-offset token for font baselines |
| Grab point | 26×26, centred on the edge | 26×26 |

- **Formulas:**
  - `--m = round(min(48, max(0,(W−560)/12)))` px.
  - `NC = clamp(1, floor((min(W,1880) − 2m − 24)/300), 4)`.
  - Dock mode applies when NC ≥ 2.
- **Sheet edge:**
  - The background sits on `::after` with `clip-path: polygon(var(--ch) 0, calc(100% − var(--ch)) 0, 100% var(--ch), 100% 100%, 0 100%, 0 var(--ch))`, where `--ch:16px`.
  - A 1px `--accent` hairline at opacity .7 runs from `left:var(--ch)` to `right:var(--ch)`, with two 16×16 corner diagonals at opacity .7.
- **Grab point:** the fan-diamond SVG (v32 `hDia()`): 26px, a 1.2px `--accent` stroke and a `--surface` fill, centred across the hairline. It doesn't move or scale. The whole edge row is the hit target.

### 1b · The price chart (based on v32 `draw()` frame + `drawWorld()`)
- **Plot box:** `L=34`, `R=W−44`, `T=18`, `Bt=H−34` (v32).
- **Data:**
  - Use the engine's existing quantile output, with cutoffs `[0,.01,.05,.25,.5,.75,.95,.99,1]` (`distribution.ts`). Draw p5, p25, p50, p75 and p95.
  - The horizon is whatever the engine produces (epochs × 4 years, weekly).
  - Keel owns the data adapter. Nothing changes in the engine.
- **$ log axis:** `ly(v) = Bt − (Bt−T)·(ln v − ln lo)/(ln hi − ln lo)`.
  - v32 fixed `lo=$30k` and `hi=$30M`, with gridlines at $100k, $1M and $10M.
  - Slice 1 instead fits `lo` and `hi` to the whole p5–p95 range, rounded out to decades, with a gridline at each decade (Gap 2).
  - Gridlines: `--hairline`, dash `[1,3]`, from `L` to `R`.
  - Labels: `--t-chart`, `--text-muted`, left-aligned at `R+4, ly(v)+3`, formatted by `money.ts` ($100k, $1M, $10M).
- **Calendar-year axis:** `lx(t) = L + (R−L)·t/horizon`, with t=0 at today, at the left edge as in v32.
  - Year ticks: centred at `Bt+13`, `--t-chart`, `--text-muted`. Show every year that fits with at least 48px between labels; thin to every 2, 5 or 10 years by width.
  - Baseline: `--rule`, 1px, at `Bt`.
- **Today band:** this is the v32 Today line plus the time bar, with ages replaced by calendar years (Gap 3).
  - **Today line:** `--today-line`, 1.5px, from `T−6` to `Bt` at `x=L`. Its label "Today · Oct ’26" is in `--t-chart-serif` italic at `L+5, T+4`.
  - **Time bar:** a dot of r5 at `(L, Bt+20)` and a 2px bar from `L` to `R` at `Bt+19`, both `--today-line`. The end year (for example "2066") is right-aligned at `R, Bt+32` in `--t-chart`.
- **Quantile bands (focused fan, as in `drawWorld`):**
  - SUPERSEDED by §1L item 4: three nested fills (p1–p99, p5–p95, p25–p75) in `--path-btc-price`, with no strokes on any edge.
  - Then a 1.5px `--surface` casing (`--line-casing`) under a median of `--line-median` (2px) in `--path-btc-price`.
- **End label:** "₿ price · $1.2M · $400k–3.1M" (the median, then p5–p95). It sits above the band, or below it if there's no room, and stays anchored to the end of the line. Below a 480px container width it breaks onto two lines: the price, then the range. If it still collides, it goes inside the plot at the top right with a short leader line, on a plate in `--ground`, the plot's own background (100% opaque, padding 0.25em 0.5em, square corners; never `--surface`, which reads lighter) so the band passes behind it, never through it. No reserved top inset: the chart keeps its height. It is never placed mid-chart. Spoken form: "$400 thousand to $3.1 million".
- **$ abbreviations:** 3 significant figures: $85.4k, $29.5B, $1.23T. Full digits below $10,000.
- **Band:** SUPERSEDED by §1L item 4 (three fills, no hairlines or outlines).
  - End label: text in the standard ink text colour (≥4.5:1 in every theme), preceded by a small solid square in the asset colour (the pane's square mark, ≥3:1). The line itself keeps the asset colour. Applies to every chip colour. `--t-chart-serif` italic, right-aligned at `R−4, ly(p50_end)−8`. Use the $ range format from Gap 5.
- **Caption:** "THE WORLD · ₿ PRICE" in 600 `--t-section` `--accent`, at `L+8, T+12`. This is v32's caption with S&P and "$100k buys" dropped, because they aren't modelled.
- **Short canvas (`H<150`):** keep the axis values and the end label value only (the v32 rule).
- **Build it as the "world layer" component,** using v32's `#w` / `ly-front` / `ly-back` structure. Slice 2 then only adds the drawdown layer and the swap. In Slice 1 it is always the front layer (`aria-hidden="false"`).

### 1c · Headline area (model version)
- **Desktop:**
  - Kicker: "From today · {samples} futures · {model name}", for example "From today · 1,000 futures · Power Law Regression Median".
  - `.dh`: "Bitcoin’s median price reaches $1.2M by 2066; 9 in 10 futures end between $400k and $3.1M."
- **Phone:** the h1 becomes "Bitcoin’s price". The half sheet shows the headline sentence beside the (hidden) 🔍 slot.
- **Copy rules:** consequences only, no advice, no call to action. All numbers go through `money.ts`. The copy is a proposal (Gap 7).
- **Header crumb (right):** left empty in this slice.

### 1d · Dock row with Models selected (ruling: hidden slots, no ghosts)
- **Row geometry (`depth/v32/build.py`):**
  - `.drow.d3` is 30px tall with `justify-content:space-between`.
  - The tabs are centred with `flex:1` and a 28px gap. Each tab is `--t-tab` caps with `letter-spacing:.14em` and padding `6px 2px` (58.2×28 at 1440).
  - The selected tab is `--accent` plus `inset 0 -2px 0 var(--accent)`.
  - 🔍 sits in a 28×28 box with a 13px glyph and a 44px hit area (`::after inset:-8px`). ⚙ is the v32 15px SVG.
- **Reserving slots in Slice 1:**
  - Render all five items so the geometry is final.
  - PLANS, STATS, 🔍 and ⚙ get `visibility:hidden`. That keeps their boxes in the layout and removes them from focus and the accessibility tree.
  - Only MODELS is visible, and it is selected.
  - Don't add dimmed, disabled or "coming soon" states.
- **Desktop (NC ≥ 2):** the Models content fills column 1 of the three-column grid (Models | Plans | Stats, gap `clamp(18px,2.4vw,44px)`). Columns 2 and 3 are empty, reserved space.
- **Phone:** the open sheet shows this row on top, replacing v32's "PLAN MODEL VIEW STATS SETTINGS" row. The half sheet is the headline only.
- **Default pane:** the app opens on Models for this slice only. Plans becomes the default when it ships (Gap 8).

### 1e · Right panel (phone landscape)
- **Auto rule:** dock right when `innerWidth > innerHeight && innerHeight <= 500`. Everywhere else, keep the bottom sheet. No Settings toggle in this slice.

**Geometry at 844×390 (measured):**
| | Closed rail | Open |
|---|---|---|
| Panel | 64px, full height, padding `10px 4px` | `min(40vw,460px)` = 337.6px, padding `8px 12px 12px` |
| Chart column | 780×293 at y 96.9; plot L34 R736 T18 Bt259 | 506.4×293; plot L34 R462 |
| Header and headline | header margin 24, h 45.3; headline visible | same |
| Dock | vertical: 🔍 slot at the top, tab slots mid-height (52.5×48 each, padding `12px 4px`), ⚙ slot at the bottom (`margin-top:auto`). Only MODELS is visible | horizontal row at the top of the panel, as in 1d |

- **Bevelled left edge:** this is derived, because the mock hid the bevel (Gap 9).
  - `clip-path: polygon(var(--ch) 0, 100% 0, 100% 100%, var(--ch) 100%, 0 calc(100% − var(--ch)), 0 var(--ch))`.
  - A 1px `--accent` hairline at .7 runs at `x=0` from `top:var(--ch)` to `bottom:var(--ch)`, plus two 16px diagonals.
  - No fan-diamond point here; the seam is the handle.
- **Content:** a single column (`grid-template-columns:1fr`) that scrolls inside the panel.
- **Open and close:**
  - Open by tapping MODELS. Close by tapping MODELS again, pressing Esc, or dragging the seam.
  - Animate with `transform: translateX`, `--dur-panel` and `--ease-out`. The chart reflows once, at the end; never animate its width.

### 1f · Models sheet: every back-end setting, in Certificate controls
**Structure:**
- The pane title is the schema `title` ("Model"), in `--t-pane`.
- **Section labels** are centred between hairlines that taper and fade outward (the `.sx` rules in `v38/v38.css`), at `--section-rule-len` 70%.
- **Group labels** use the same treatment at `--group-rule-len` 45%. Nothing is left-aligned.
- All setting text is the back end's text, verbatim.

**Sections (the headings are Form's; see Gap 7):**
| Section | Setting (schema key) | Shown when | Control | Back-end rule (unchanged) |
|---|---|---|---|---|
| Price model | `model`: 7 options in `modelOrder`, default "Power Law Regression Median" | always | **Radio list:** one 44px ledger row per option, a 9px square filled when selected, plus weight 600 and the `--selected` fill | one value |
| Price model | `variable`: label = the model's `varInput` ("R (%)" for CAGR, "Previous Halvings" for Historic) | `showVariable` | NumberField; also a slider when both bounds are finite (Historic 2–3) | `live-range` rangeMin…rangeMax of the **current** model, step 1, float, default per model (CAGR 50, Historic 2) |
| Price model | `minMaxMultiple`: label "+/-" | `showMinMaxMultiple` (CAGR) | NumberField | `live-floor` 1.01, step .1, float, default 3 |
| How prices move | `walk`: "Walk Strategy:", 9 options, default "Bubble" | always | Radio list; "🟢🟢🟢🔴" is drawn with `LabelGlyphs` circles (`--walk-up`/`--walk-down`, ≥8px, aria-label "3 up, 1 down"), never emoji | one value |
| How prices move | `volatility`: "Volatility (0-1):" | always | NumberField + slider | accept 0–1, float, step .005 (Bubble) / .001 (other walks), default .1, empty → none |
| How prices move | `clampTop` / `clampBottom`: group "Clamp Price:", rows "Max", "Min" | always | Two `TickToggle` rows | default off / off |
| Simulation | `samples`: "Statistical Sample Count (1-10k):" (user copy fix, 9:47 PM; front-end string) | always | NumberField | accept 1–10,000, int, default 1,000, empty → 1,000 (clamp note: "Min is 1" / "Max is 10,000", 4e/4f) |
| Simulation | `epochCount`: "Epoch Count (1-30):" | always | NumberField + slider | accept 1–30, int, default 10, empty → none (30 is the engine's real limit: its buffers fail above it, and it matches the label; Gap 10) |

**Certificate control specs:**
- **Ledger row:**
  - The label is `--t-row` (EB Garamond) on the left; the value is `--t-value` Jost tabular on the right.
  - A `--hairline` runs below. Padding `--row-pad`, minimum height `--hit`.
- **Editing a number:** tapping the row opens it in place.
  - The frame is a `--rule-double` (1px + 2px gap + 1px) `--accent` box with square corners and a `--selected` fill.
  - Inside it go the NumberField and, where the bounds are finite, a slider.
  - The slider has a 1px `--control-line` track, a 2px `--accent` fill and a `--thumb-w`×`--thumb-h` (5×18) square `--accent` thumb with a 2px `--surface` halo. A muted tick marks the previous value.
  - It saves on release. Tap the row again or press Esc to close it.
- **TickToggle:**
  > **SUPERSEDED by §1MP** (2026-10-27). Kept for history only. Tick boxes show no ON/OFF word; the box alone shows the state (§1MP).
  - `--tk-box` 16px; the row is `--tk-h` 44 with `--tk-pad-x` 14 on each side and `--tk-gap` 12.
  - **On:** a solid `--accent` square with ✓ (SVG) and "ON" in Jost caps `--accent`.
  - **Off:** an empty double-ruled square with "OFF" in `--text-muted`.
  - The selected row gets the `--selected` fill. Focus is a 2px frame at offset 0.
- **Radio list:** 9px squares with a 1px `--accent` border, filled when selected. Selection is shown three ways: the fill, weight 600 and the `--selected` row. It never relies on colour alone.
- **Choosing a model or walk:** the chart redraws when the engine returns. Nothing else moves.

### 1g · NumberField gate (Probe M3 / FL-001): applies to EVERY number field above
1. **Clamp with a visible message.**
   - On commit, a value outside the back end's accepted range is set to the nearest bound. The bounds are the `accept` range, or the current model's `rangeMin`/`rangeMax`, or the 1.01 floor; with an `Infinity` bound, only the finite side clamps.
   - The field shows the clamped value and the short note under it, "Max is 1" or "Min is 0" (4d/4e; the long clamp message is retired). The note is tied to the field with `aria-describedby` and announced politely.
   - The message clears on the next valid commit. The engine only ever receives in-range values.
2. **Commit once, when a held key is released.**
   - Holding ↑/↓, PgUp/PgDn, or the slider arrows steps the value and re-renders the chart live about every 100 ms while held (user ruling, as built); the final value commits on `keyup`.
   - Enter and blur also commit. Typing never commits per keystroke.
3. **Wheel only when focused.** The wheel does nothing unless the field has focus. An unfocused field under the pointer must never change, and the page scrolls instead.
4. **Defined invalid state.** This is for input that can't be parsed, such as an empty int field with no `emptyValue`, or "1e" or "abc".
   - The field shows `--invalid` text, a 3px (`--rule-strong`) border in the text colour (`--invalid`), a ⚠ SVG icon and a message.
   - Message: the short note for the cause: "Numbers only" (2j), "Whole numbers only" / "Use a dot for decimals" (2g), "Too large" (2k), "Enter a number" (2l). The long generic message is retired (2j).
   - The last valid value stays in effect. `aria-invalid="true"`.
   - **Never orange or red.**

### 1h · States
| Area | States |
|---|---|
| Chart | ready; **empty** (engine not yet returned): frame, axes, Today band and caption drawn, no bands and no headline number, no spinner; recomputing: the previous bands stay until the new result swaps in, no animation required; linen theme |
| Chart · no data | if price data hasn't arrived after 400ms, the empty frame shows a centred caption "Loading prices…" (no spinner). If it fails or times out, the caption reads "Prices couldn't load. Check your connection; the chart will try again." with a quiet text button "Try again" (the TextButton primitive). Loading shows after 400ms. Failure shows after a 10s timeout, and it retries automatically every 30s. Pressing Try again shows loading at once. Never a blank plot with no message. The caption wraps inside the plot, centred, with 1rem side padding and a max-width of about 28ch; it never crosses the axis |
| Chart · out of range | when values run past the top axis, the band is clipped at the plot edge with a 1px hairline and the caption "Prices here run past what the chart can draw." (wording accepted) sits under the end label. When the end value itself overflows (the only case real settings produce), the caption stands alone at the top right on the `--ground` plate, with no leader line. Tick labels from $1,000T up are right-aligned inside the plot and carry a 3px `--ground` halo (`paint-order: stroke`), so the band and median pass behind them; a tick that collides with the caption plate is dropped for that frame. The axis ticks always extend to cover the data's top: the tick generator keeps adding decades ($1,000T, $10,000T…) and never stops short of the data |
| Money above $999T | $1,000T to $999,999T: T with grouped digits at 3 significant figures ($1,230T), spoken "$1,230 trillion". From $1,000,000T (1e18) up: scientific form at 3 significant figures with real superscripts ($1.23×10¹⁸), spoken "1.23 times ten to the 18 dollars". The exponent is always set in the upright face, even in italic labels (italic Garamond has no superscript digits), with 0.06em of space before it (token `--sup-kern`) so it clears the italic 0 of ×10. Every gridline is labelled. |
| Dock | Models selected (the only state) |
| Sheet | closed, half, full at every size (§1L item 5); on desktop it closes too |
| Panel | closed rail, open |
| Controls | default, hover (`--hover`), focus, selected, editing, clamped (message), invalid, linen |
| Disabled | no back-end setting is disabled. Rows that the model hides (`showVariable` / `showMinMaxMultiple` false) are **removed**, not disabled |

### 1i · Accessibility
- **Chart:** `role="img"`, with an `aria-label` equal to the headline sentence.
- **Dock:** a `tablist` holding the one visible tab, `aria-selected="true"`. The hidden slots are not in the tree.
- **Panel:** a `region` labelled "Models". Opening it moves focus into the panel; closing returns focus to the tab.
- **Keys:**
  - Tab order runs: Models tab → pane content.
  - Radio lists use the radiogroup pattern (arrow keys move the selection).
  - Toggles are `role="switch"`.
  - Sliders are `role="slider"` with ←/→ and PgUp/PgDn.
  - Esc closes the row editor, then the sheet or panel.
- **Focus:** 2px `--focus` at a 2px offset everywhere. Tick rows use offset 0 with the 14px inner padding.
- **rem:** all DOM sizes come from rem tokens. Hairlines and rules stay px.
- **200% zoom (390 → 195 CSS px):**
  - Below 16rem of pane width, labels stack above fields and words never break.
  - The year ticks thin out, and the headline wraps.
  - There's no horizontal scroll, and no tab collision in the reserved row.
- **200% OS text size:** no clipping.
- **Hit targets:** at least 44×44.

### 1j · Stories satisfied (STORIES.md)
| Area | Stories |
|---|---|
| Model content and the world layer | 23, 25, 48, 240 (Models brings the world forward; here it is the only layer) |
| Dock | 160, 163, 177 (order kept by the reserved slots) |
| Chart frame | 159, 166, 176 |
| Certificate controls | 186, 189, 190, 191, 192, 193 (5×18 supersedes 4×16), 195 |
| Type and numbers | 187, 196, 199, 200, 202, 206, 215 |
| Spacing and zoom | 213, 219, 220 |
| Screen readers | 245 (front layer only) |
| Landscape panel | 248, 249, 251, 252, 253 |

- **Deferred to the slice that ships the missing piece:**
  - 178 (opens on Plans)
  - 179 (⚙)
  - 238 and 241–244 (depth)

### 1k · Definition of done (quick check, not an audit)
1. G12 parity against main passes (every main setting has a control or a ruled exemption). No old-UI markup or CSS remains in `src/v2`.
2. At 390×844, 1440×900 and 844×390 (panel closed and open), the chart box and sheet match the 1a and 1e tables to within 1px.
3. The dock baseline is within ±1px. The MODELS label's left x-position matches the reference mock `/workspace/stackmath-mocks/p3/v32/` at the same viewport, with the hidden slots present, to within ±2px. The tolerance covers per-engine text rasterisation (Chromium renders the hidden STATS label about 4px wider).
4. A one-minute manual pass on each number field covers clamp + message, a held ↑ rendering live (~100 ms) and committing on release, the wheel without focus doing nothing, and "abc" giving the invalid state with no orange or red.
5. Fonts are SM only; no `\d\s?₿`; axe reports 0 violations in both themes; no horizontal scroll at 195px.

---

## Later slices (one line each)
2. **Plans:** the drawdown layer (the paid-in-bitcoin fan, the paid-in-dollars line, the rough-start band, the danger floor, the triangle markers and the stack handle), the PLANS tab shown, the depth swap Models ↔ Plans (transform and opacity, no blur), and opening on Plans.
3. **Stats:** the STATS tab and pane, which reads the drawdown.
4. **Search 🔍 and Settings ⚙:** shown and working, including Panel position (Auto · Bottom · Right · Left).
5. **Chart gestures:** scrub readout, stack drag, Today drag and the ⚠ bubble.

## Gaps and conflicts (Form's default in bold)
1. **The v32 "Models" view was a background layer,** with a whisper and fixed illustrative data. It never had its own front-layer axes. The front-layer geometry in 1b combines the v32 frame with `drawWorld()`.
2. **Log-axis domain:** v32 fixes it at $30k–$30M. Real 40-year model output can exceed that. **SUPERSEDED (6269f77):** the range is p5–p95 plus 5% of the log span, with gridlines at the decades inside it, then 1-2-5 steps if no decade falls inside. Anything narrower than ×2 is widened to ×2 about its centre.
3. **"Today band"** isn't the name of any v32 element. **I read it as the Today line plus the time bar,** with years instead of ages, since a model has no age. The old app also showed 3 years of history before today. **There's no history in this slice; today is the left edge, as in v32.**
4. **Fan alphas:** v32 used .10/.16, while the tokens give `--fan-focus-outer/inner` .08/.12 dark and .10/.14 linen. **Use the tokens.**
5. **$ range format:** this is the first screen that needs one, and we said we'd add it when a screen did. **Use `$400k–3.1M`, by analogy with `₿0.4–0.7`: one prefix and an en dash.** Forge adds it to `money.ts` with tests.
6. **Shadow:** v32 as rendered has none (v25 sets `box-shadow:none`). The tokens allow `--shadow-sheet`, but `clip-path` would clip it anyway. **None in this slice.**
7. **Copy that needs the user's OK:** the headline and kicker (1c), the h1 "Bitcoin’s price", and the section headings "Price model / How prices move / Simulation". The first two headings come from story 189; "Simulation" is new.
8. **Default pane:** the locked default is Plans, but this slice can only open on Models. **That's temporary.**
9. **The bevelled left edge** of the right panel was never mocked: `dock/app.html` hides the bevel and draws a 1px rule. The polygon in 1e is derived.
10. **Epoch and sample limits (ruled 2026-10-19):** epochs clamp to 1–30, the engine's real limit (its buffers fail above 30), which matches the label. Samples clamp to a minimum of 1 with the standard short clamp note ("Min is 1", 4e). Invalid entries show the short notes (2j/2g/2l); the long invalid-entry message is retired. Zero futures draws nothing, so it is never a valid result; there is no zero-samples empty state.
11. **Clamping versus the old UI:** main ignored or kept out-of-range input. Probe's gate requires clamping with a message. **Clamping is front-end behaviour, so it's allowed;** the ranges themselves are unchanged.
12. **"Certificate Direction A"** isn't named in any source. **I took it to be v37 `d0` Certificate, as locked in `v38/STYLE.md`.** The 3–5px focus offset there is superseded by 2px.
13. **⚙ hit area:** it measures 19×23 in v32. That doesn't matter now, because it's hidden. Pad it to 44 when it ships.

---

## 1L · User corrections (2026-10-19, 7:13 PM ET): build these before Slice 2

**PRIORITY (user, 7:47 PM): item 5, dragging the sheet from the logo, is THE entry point and ships first, alone, on mobile AND desktop.** The logo is the first thing people press on the site. Press it and drag up, and the sheet follows and opens. Drag down, and it follows and hides. Desktop uses mouse drag with the same pointer-events code. This overrides §1h "on desktop always open": the desktop sheet now closes too, with the same snap points (closed, half, full), and half equals the 40vh cap. Every other §1L item waits until this is merged and screenshotted.
Rule 0 still holds. The engine's data stays exactly as it is, and these changes are all front end.

1. **Logo orientation.** The fan-diamond is rotated 90° clockwise wherever it appears (wordmark, dock handle, favicon), so the fan opens to the right the way the chart fans out over time. Rotate the source SVG itself rather than applying a CSS transform, so hit areas and focus rings stay square to the content.

2. **Desktop sheet: one pane per third.** The desktop sheet has three equal columns: Models | Plans | Stats. Models takes column 1 only. The column that holds focus (the last one clicked, tapped or tabbed into) is the active pane: its layer draws on the chart, and its dock tab shows as selected. In Slice 1, columns 2 and 3 are reserved and empty. Empty divs are fine as long as they draw nothing (no border, rule or background) and aren't in the accessibility tree. Inside the Models column the three sections stack top to bottom: Price model, How prices move, Simulation. The 40vh cap stays, and the column scrolls if it has to.

3. **Selecting from a list: the new Certificate Select primitive.** It replaces the full radio lists for the price model and the walk.
   - **Closed:** one field row in the Certificate style: square corners, the fine double rule, and the current value in Jost, followed by a small ▾ at the right. It's the same height as a number-field row.
   - **Open:** a listbox anchored to the field and the same width as it. Square, with the double rule, on the sheet's surface colour. Each option is a row, and ■ marks the selected one. At most 7 rows are visible; past that the list scrolls. If there isn't room below, the list opens upward. It always stays inside the sheet or panel and never covers the dock.
   > **SUPERSEDED by §1MP Ruling 5 and §13** (2026-10-27). Kept for history only. The list opens in place as a listbox (`[role=listbox] [role=option]`); keyboard behaviour below still applies where it fits a listbox.
   - **Behaviour:** this is the WAI-ARIA select-only combobox pattern. ↑ and ↓ move through the options, Home and End jump to the ends, typing jumps to a matching option, Enter or a click picks one, and Esc closes the list with no change; after either, focus returns to the field. A click outside closes it with no change and focus goes wherever the user clicked; it isn't pulled back. The list always shows at least 4 rows: if neither direction fits 4, it opens downward and the sheet scrolls to make room. A new pick triggers a recompute, with the same states as today.
   - **States:** default, hover, focus, open, and linen. No disabled state.
   - The options come from the engine's lists exactly as they are (Rule 0). Labels are the engine's, unchanged.

4. **Price bands: draw all nine series, the same as the original model (user, 2026-10-20, 9:06 AM ET; replaces the earlier "p0 and p100 are not drawn" and Forge's 8:52 note).** The series are lowest, p1, p5, p25, p50, p75, p95, p99 and highest. Lowest and highest are the engine's existing Lowest/Highest Sampled series, the true min and max of the walks ("make the edge the edge": removing a sample can never widen it). This is front end only, in v2 `bands.ts`.
   - Draw four nested bands: min–max (outermost), p1–p99, p5–p95 and p25–p75 (inner), with the median p50 as a solid line in the asset colour. For the sd type, ±3σ, ±2σ and ±1σ map to the three inner bands, and min–max stays outermost.
   - Each band's visible fill is .04 for min–max, .07 for p1–p99, .11 for p5–p95 and .18 for p25–p75. Tune them so the effective opacities match, since stacked fills compound, and so each of the four steps reads distinctly at 390 in both themes.
   - **No outlines on any band edge, including the outer min/max edge (user, 7:36 PM: an outline is antithetical to a quantile).** Remove the p5/p95 hairlines and any stroke on the min–max or p1–p99 bands. Every edge is a fill step only, and the outermost edge simply fades into the plot. The edges come from the steps in fill only.
   - The end label keeps the median and the p5–p95 range. Hover or scrub readouts list all nine: lowest, p1, p5, p25, p50, p75, p95, p99 and highest.
   - The axis fit covers min–max (the true edge) plus 5% of the log span (×2 floor), so the outermost band is never clipped. This amends §1T's p1–p99 fit.

5. **Drag the sheet open and closed (every size, touch and mouse): it follows the pointer.** This pulls the Slice 5 drag gesture forward.
   - **Grab area:** the logo handle plus the dock's top strip across the full viewport width, edge to edge with no side inset, at least 44px tall. Set `touch-action:none` on it.
   - **During a drag:** on pointerdown, the sheet's top edge tracks the pointer 1:1, keeping the offset from where the user grabbed. There's no easing and no lag. The chart box resizes live, at most once per animation frame. If a chart redraw would take longer than 16ms, the chart keeps its last drawing scaled to the new box and redraws once at release. Past the closed or full position, the sheet rubber-bands: it moves only ⅓ of the pointer's travel.
   - **On release:** the sheet snaps to the nearest of closed (dock only), half, or full (the existing caps). A flick (velocity of 0.5px/ms or more) snaps in the flick's direction. The snap is a spring settling in under 250ms, or an instant set under `prefers-reduced-motion`.
   - **Non-drag path to every stop (WCAG 2.2 SC 2.5.7):** a tap (under 6px of movement) or Enter/Space steps closed → half → full → closed. With the handle focused, ↑ moves up one stop and ↓ moves down one; Home goes to full and End to closed. The pointer equivalents are above.
   - **Tap and keys:** The logo stays a `button` with `aria-expanded`, Enter and Space toggle it, and the sheet's position is announced as "Sheet half open", "open" or "closed".
   - **Phone landscape right panel:** the same behaviour, but horizontal, grabbed from its bevelled left edge.
   - Scrolling inside the sheet doesn't move the sheet in this slice. Whether a pull-down at scroll top should close it is the next thing to test.

**Definition of done for 1L:** the logo opens rightward everywhere. On desktop, Models fills exactly the left third. Both pickers are Certificate Selects that pass the keyboard walk and axe. Three bands are visible with no outlines at 390 and 1440 in both themes. On a 390 touch emulation, a slow drag keeps the sheet edge within 2px of the finger, and flicks and releases snap correctly.

6. **The sheet goes edge to edge (full immersion), at every size.** The sheet runs the full viewport width, sitting flush with the left, right and bottom edges of the screen, with no gutter and no side margin. The bevelled top corners sit right at the screen edges. Only the content inside the sheet is inset: it keeps the existing content padding and adds `env(safe-area-inset-*)` on notched phones. The phone landscape right panel works the same way, flush with the top, right and bottom edges, with its bevel on the left edge. The chart's own gutters don't change. Done when there's 0px between the sheet and the screen edge at 390, 844×390 and 1440, in both themes.

---

## 1M · Models pane as an asset ledger (user, 2026-10-19, 8:08 PM ET): expand in place
> **SUPERSEDED by §1MP** (2026-10-20). Kept for history only; build §1MP. The one exception is the "The chart and the tick box" paragraph below, which §1MP keeps for chart behaviour.
Rule 0 holds: the engine, settings, values and labels don't change. This is a change to the front end's structure only. The current settings were styled one level too high, so they move down one level.

**Hierarchy.** From the top: the pane (the Models dock tab), then an asset row (a ledger entry), then a group inside the row, then a field.
- The large centred caps with side rules ("PRICE MODEL" and so on) are no longer used inside a row.
- Groups inside a row use the left-aligned small-caps group label with the `--group-rule-len` rule.
- The duplicate "WALK STRATEGY:" header is removed. The engine's label becomes the Select's own field label.

**The ledger.** The order is locked: Bitcoin, S&P, Inflation. Bonds and Cash aren't shown until the user decides.
- **Supported row (Bitcoin):** this is the Certificate ledger-entry row. It has:
  - the colour mark (₿ orange)
  - the name, "Bitcoin", in Jost
  - a one-line summary below the name in small italic Garamond: "{price model} · {walk} · {samples} futures", for example "Power Law Regression Median · Bubble · 1,000 futures"
  - at the right, the ON/OFF ledger tick box that controls whether it shows on the chart
  The row header is a `button` with `aria-expanded` and a ▾/▴ marker. The tick box is a separate control with its own 44px target, and pressing it never expands the row.
- **Unsupported rows (S&P, Inflation):** the same row shape, with the name and the summary "Not yet modelled". They have no tick box, no marker, and aren't interactive (not focusable). Text uses `--text-muted`, still at AA contrast. Their colour mark is a neutral `--rule` square until the palette assigns colours (open question for the user). There's no fake data and nothing on the chart.

**Expanding.**
- The landing state has every row collapsed, so the whole ledger shows at a glance.
- Pressing a supported row expands its settings underneath it. Only one row is open at a time, so opening one closes another.
- The expanded body is indented under the row header, inside the same ledger frame, and holds the existing settings in this order:
  1. Price model (Select)
  2. How prices move (walk Select, then that walk's fields)
  3. Simulation (Samples, Epochs)
- Height animates over 200ms, or instantly under reduced motion. Once open, the row scrolls itself into view inside the sheet.
- Esc or pressing the header again collapses the row and returns focus to the header.
- **Focus:** the open row, or the last row pressed, is the focused model. The chart draws the focused model at full strength. Other models that are ON (later on) are drawn quieter.

**The chart and the tick box.**
- With Bitcoin ON, the chart is as it is today. With Bitcoin OFF, the chart shows the empty frame with the caption "Turn a model on to see it here."
- The headline follows the focused model and is empty when no model is ON.

**States:** collapsed, expanded, hover, focus, ON, OFF, unsupported, and linen.

**Accessibility:** the ledger is a list, and each supported header uses the disclosure pattern. The tick box is labelled "Show Bitcoin on chart".

**Desktop:** the ledger fills the Models third. Only one row is open, so the column stays short.

**Done when:** at 390 the half-open sheet shows all three rows collapsed with no scrolling. Expanding Bitcoin shows every current setting with none lost. The keyboard walk works: Tab, Enter, Esc and Space on the tick box. axe reports 0 violations in both themes.

---

## 1N · Dependent settings: the Select + tray pattern (user, 2026-10-19, 8:12 PM ET)
> **SUPERSEDED by §1MP** (2026-10-20). Kept for history only; build §1MP.
This is one standard pattern used everywhere. **Any field that exists only because of what a Select is set to lives in that Select's tray.** That covers the price model's fields (for CAGR, `R (%)` and `+/-`) and the walk's fields (Volatility, Clamp price…). Dependent fields never look like siblings of the Select.

- **Structure:** the Select and its tray are one unit, one common region. The tray hangs directly from the bottom of the Select's double-rule frame with no gap. It's drawn as a single fine rule down the left side and across the bottom, in the same frame colour, and closes the unit. Tray rows are indented one step (`--tray-indent: 1rem`) and use the small field style: label in Garamond at the field size, value right-aligned in Jost. They're separated by hairlines that run only inside the tray.
- **Changing the Select** swaps the tray's contents in place, with a 150ms crossfade (instant under reduced motion). If the new choice has no fields, the tray isn't drawn at all, so the Select's frame stands alone. The tray never shows an empty state.
- **Editing in place (this replaces the current editing state):** there's no expanded second box and no duplicate value. The value cell itself becomes the input, at the same position and size, with the text cursor in it. The row keeps its height. The editing signal is a 1px `--accent` underline under the value plus the focus ring on the cell. The row background doesn't change, and the slider (where one exists) stays inline in its current spot. The clamp and invalid messages appear under the row, inside the tray.
- **Accessibility:** the tray is a `group` labelled "{Select value} settings", for example "CAGR settings". The Select carries `aria-controls` pointing at the tray. Tab order goes Select, then the tray fields, then the next unit.
- The labels and ranges are the engine's, unchanged (Rule 0).

**Done when:** for every price model and every walk, the dependent fields appear only inside that Select's tray. Editing a value never changes the row height or creates a second box (390 and 1440, both themes). axe reports 0 violations.

---

## 1O · Cursors and pointer states (user, 2026-10-19, 8:41 PM ET): desktop and touch
The build uses system cursors only. They follow the OS cursor size and accessibility settings, and they're the shapes people already know. Every cursor is mapped in one place (`cursor` tokens) so no component sets one ad hoc.

| Target | Hover | While pressed or dragging |
|---|---|---|
| Logo handle + dock grab strip | `grab` | `grabbing`. On pointerdown, set it on `<html>` with `user-select:none` for the whole drag, including rubber-banding and leaving the strip. Drop it on release. **This replaces the 'grab stays during drag' budget choice;** it's one class toggle |
| Landscape panel's bevelled left edge | `grab` | `grabbing` (same root rule) |
| Chart plot area | `crosshair` (hover readout) | `crosshair` |
| Time scrubber thumb | `grab` | `grabbing` (root rule) |
| Time scrubber track | `pointer` | n/a |
| Slider thumb in a NumberField | `grab` | `grabbing` (root rule) |
| Slider track | `pointer` | n/a |
| Dock tabs, Select field, Select options, ledger row header, ON/OFF tick box, Certificate options, TextButton (Try again) | `pointer` | `pointer` |
| NumberField value cell | `text` | `text` |
| Unsupported ledger rows (S&P, Inflation), labels, captions, headline, axes, sheet background | `default` | n/a |
| Chart while a recompute runs over 400ms | `progress` on the plot only | n/a |

**Touch (no cursor):**
- Hover styles exist only inside `@media (hover:hover) and (pointer:fine)`, so they never stick after a tap.
- Set `-webkit-tap-highlight-color:transparent` and give every target the designed `:active` pressed state instead. The pressed state appears within 1 frame and lasts at least 100ms so a quick tap is still seen.
- The drag handle's pressed state turns the logo stroke to `--accent-strong` while it's held.

**Done when:**
- A Playwright check at 1440 asserts the computed `cursor` for each row of the table, including `grabbing` on `<html>` mid-drag and its removal after release.
- At 390 under touch emulation, no `:hover` style is applied after a tap.

---

## 1P · Fields are live: one action to change a value (user, 2026-10-19, 8:59 PM ET)
The tray (§1N) is approved ("clean ownership of the sub-setting"). Clicking twice to adjust is not.
- **No edit mode.** Every NumberField's value cell is always a live input, and its slider is always visible and always draggable. No click is needed to "open" the row. This replaces the editing state in §1N, which needed a click to reveal the slider.
- **Layout:**
  - Row 1 holds the label on the left and the value input on the right. The input has a resting 1px `--control-line` underline, which turns `--accent` on focus.
  - Row 2 is the slider, full width of the tray content.
  - At container widths of 480px or more, the slider sits on row 1 between the label and the value (a `--field-col` value column), so each field takes one line.
- **One action:**
  - Dragging the slider thumb or clicking the track changes the value immediately. The value tracks live, and the result commits on release (the Probe gate).
  - Clicking the value selects all of it, so typing replaces it. Enter or blur commits. ↑ and ↓ step the value; a held key re-renders live about every 100 ms and commits on release.
  - The wheel still does nothing without focus.
- **Unchanged:** the clamp and invalid messages under the row, and the previous-value tick on the track.
- **Done when:** from a cold page, a single drag or a single click-and-type changes R (%) at 390 and 1440, and no row changes height when it's focused.

---

## 1Q · Slider scale: give the track to the range people use (user, 2026-10-19, 8:59 PM ET)
Rule 0: the engine's accepted range doesn't change. CAGR's R (%) accepts 0 to ∞ (`rangeMin 0`, `rangeMax Infinity`). Only the slider's mapping is front end.
- **Focus-range slider (standard for any field whose range is wide or unbounded):** the first 80% of the track maps linearly to the field's focus range. The last 20% maps on a log scale from the focus-range top to the slider's soft top.
  - **R (%):** focus range 0–50, step 1, soft top 1000.
  - Typing a value above the soft top is still accepted. The thumb then pins at the right end and the value cell shows the real number.
- **Marks:** small ticks at 0, 10, 25 and 50 on the track, and a slightly heavier rule where the scale changes at 80%. Label only the 50 mark, in `--t-chart` muted type, under the track. The previous-value tick stays.
- **Keys:** with the slider focused, ↑ and ↓ step by 1 inside the focus range and by about 5% of the value above it. PageUp and PageDown step by 10.
- **Accessibility:** `aria-valuenow` is the real value, and `aria-valuetext` is "28 percent".
- Each field's focus range lives in one table in the strings/config file, next to its label. The design side owns that table. For new fields, the default is no focus range (a plain linear slider) until I set one.

**Done when:** at 390, dragging across the first 80% of the R (%) track covers 0–50 in steps of 1. The last 20% reaches 1000. Typing 5000 is accepted and pins the thumb.

---

## 1R · Tap cycle with direction memory (user, 2026-10-19, 9:02 PM ET)
Drag stays exactly as built. Don't change it. This replaces the tap and Enter/Space cycle in §1L item 5.
- A tap (under 6px of movement), Enter or Space steps the sheet back and forth: closed → half → full → half → closed → half…
- **State:** keep a `lastDirection` (up or down).
  - From closed: always go to half, and set the direction to up.
  - From full: always go to half, and set the direction to down.
  - From half: continue in `lastDirection`, so up goes to full and down goes to closed.
- **After a drag:** set `lastDirection` from the drag's net movement, so the next tap carries on the way the user was moving.
- **If the sheet rests between stops** (only if a drag left it there): a tap goes to the next stop in `lastDirection`.
- ↑, ↓, Home and End keep their direct moves.
- The live announcement says where the sheet went ("Sheet full", "Sheet half open", "Sheet closed").
- **Done when:** five taps from closed visit half, full, half, closed, half. A drag up to full followed by a tap goes to half, and a second tap goes to closed.

---

## 1S · Desktop tabs align with their columns (user, 2026-10-19, 9:11 PM ET)
- On desktop, where the sheet has three columns, each dock tab is centred over its own column: Models over column 1, Plans over 2 and Stats over 3. The tab works as that column's heading.
- The hidden tabs keep their slots in their own columns.
- 🔍 stays at the far left and ⚙ at the far right.
- On phones and in the landscape panel, only one pane shows at a time, so the tabs stay grouped in the centre as they are now.
- The selected underline sits under the focused column's tab.
- **Done when:** at 1440 each tab's centre x is within 1px of its column's centre x.

---

## 1T · Chart zoom and pan: bounded out, free in (user, 2026-10-19, 9:23 PM ET)
The old site let you zoom out until the whole chart sat in 10 pixels. That's never allowed here.
- **Zoom-out limit (the maximum frame):** the time window can never be wider than the full data, from the first time unit the chart prints (Today) to the last one (the end of the simulation). Fully zoomed out is exactly that frame, and never larger. Nothing is ever drawn before the first unit or after the last.
- **Zoom-in limit:** as far as the data's fidelity allows. The narrowest window is 8 data samples (8 weeks at the engine's weekly step), so the plot is never empty. Axis ticks re-step for the window (years → quarters → months → weeks).
- **Pan:** possible only when zoomed in, and hard-clamped to the maximum frame. The window's left edge never passes the first unit and its right edge never passes the last. There's no overscroll and no rubber band.
- **Y axis:** fits the visible window, using p1–p99 of what's in view plus 5% of the log span (×2 floor), and eases to the new fit over 150ms (instant under reduced motion). The headline and end label still describe the whole run.
- **Inputs:**
  - Ctrl or pinch on a trackpad: zoom, anchored at the pointer.
  - Mouse wheel over the plot: zoom, anchored at the pointer.
  - Horizontal trackpad scroll or Shift+wheel: pan.
  - Drag on the plot: pan. In the cursor map (§1O), the plot is `crosshair` on hover and `grabbing` while panning.
  - Touch: two-finger pinch zooms, anchored at the midpoint, and one-finger drag on the plot pans. This happens only when zoomed in. At the maximum frame, a one-finger drag scrubs the hover readout.
  - Double-click or double-tap: reset to the maximum frame.
  - Keys, with the chart focused: + and − zoom on the centre, ← and → pan by 10% of the window, 0 resets.
- **Status:** while zoomed in, a quiet "Reset zoom" TextButton shows top-right inside the plot, plus a thin position bar under the time bar showing the window within the maximum frame. Both disappear at the maximum frame.
- **Accessibility:** the chart's `aria-label` adds "showing 2031 to 2034" when zoomed.
- **Done when:**
  - At 390 and 1440, no input sequence makes the window wider than the maximum frame or moves it past either end. A Playwright check covers wheel-out spam, pan-past-end and pinch-out.
  - Zooming in stops at 8 samples.
  - Double-click resets.

---

## 1U · Select list: never clipped, no nested scrolling (user, 2026-10-19, 9:35 PM ET)
The user's screenshot shows the open list clipped inside the sheet's scroll area: the top row is cut in half, a second scrollbar appears inside the sheet's scrollbar, and the list frame collides with the next Select. This replaces §1L item 3's "always stays inside the sheet or panel" and the §1L/Probe "at least 4 rows, sheet scrolls" rule.
- **Top layer:** the listbox renders in the top layer (the Popover API or a portal on `<body>`) and is positioned against the field with JS anchoring. No scroll container can clip it.
- **One piece with the field:** the list attaches flush to the field's edge. It shares the field's double-rule frame, which continues around the list, and the field's inner rule on the joining side is dropped, so field and list read as one open control. Fill is `--surface`, fully opaque, so nothing below shows through.
- **Show everything, so no internal scroll:** when there are 8 options or fewer (every engine list today), the list shows all of them at full height. It never has its own scrollbar.
- **Placement:** the list opens below the field if the whole list fits in the viewport, and above if it fits there. If it fits neither way, it opens on the side with more room, its height is cut to a **whole number of rows**, and it scrolls with `scroll-snap` on rows, so a half-cut row is never visible. That last case is only for lists longer than 8.
- **While open:**
  - The sheet's scroll is locked.
  - Scrolling or dragging outside the list, resizing the window, or moving the sheet closes the list with no change.
  - The sheet never scrolls by itself to make room.
- **Done when:**
  - At 390 (half and full sheet) and at 1440, both Selects open with every option fully visible, no half rows, and one scrollbar at most on screen.
  - The list never overlaps the field's own frame lines.

---

## 1V · Ledger refinements (user, 2026-10-19, 9:38 PM ET): these amend §1M
> **SUPERSEDED by §1MP** (2026-10-20). Kept for history only; build §1MP.
- **Closed means hidden:** a collapsed row shows no settings at all, only its header (mark, name, one-line summary, and the tick box for supported models). That includes the trays.
- **S&P and Inflation are real stand-ins:** they're no longer inert. Each has the same header button with ▾/▴ and `aria-expanded`, and opens and closes exactly like Bitcoin. The opened body holds one line: "{Asset} isn't modelled yet. When it is, its settings will open here." There's no tick box and nothing on the chart. Text is `--text` rather than muted, so it reads as a real entry. This replaces §1M's "not interactive".
- **A clear "you're in" state for the open row:**
  - The header gets the selected treatment: `--hover` fill, the ■ selected marker before the name, and ▴.
  - The ledger frame's double rule wraps the header and its body together as one region.
  - The other rows stay visible but fall back to `--text-muted`, so focus reads at a glance.
  - The header text changes to "Bitcoin · price model" while open, so it names what you're editing.
  - On the chart, the focused model draws at full strength.
- **Leaving:** you can close the open row by pressing its header again, pressing Esc, opening another row, or clicking anywhere in the sheet outside the row. Closing keeps every setting exactly as left. There's no save step, because changes already applied live. The summary line updates to the new values ("CAGR 28% · Bubble · 1,000 futures"). Settings persist across reloads through the existing settings store, with no new storage.
- **Done when:**
  - Every row opens and closes. Only one is open at a time, and a closed row shows nothing below its header.
  - A setting changed in Bitcoin survives closing the row, reopening it, and reloading the page.
  - The summary line reflects the change.

---

## 1W · Paired toggles share one row: Clamp price (user, 2026-10-19, 9:40 PM ET)
> **SUPERSEDED by §1MP** (2026-10-20). Kept for history only; build §1MP.
- **Rule:** when two toggles are two ends of one setting (Min and Max), they sit in one row. They never get a row each.
- **Clamp price row:** the label "Clamp price" goes on the left in the field-label style. This removes the "CLAMP PRICE:" group header, for the same reason as the walk-strategy fix in §1M. On the right are two compact ledger toggles, Min first and then Max, ordered low to high. Each reads as its name, then the tick box, then its state ("Min ☐ OFF   Max ☐ OFF"). That fixes the current order, where the state comes before the name ("OFF MAX").
- **Targets:** each toggle (name, box and state together) is one 44px target, with a 1rem gap between the two.
- **Narrow layout:** below about 20rem of tray width, the pair wraps under the label as one line. It still never takes a row per toggle.
- **Accessibility:** the row is a `group` labelled "Clamp price". Each toggle is a checkbox named "Clamp minimum price" or "Clamp maximum price".
- The labels come from the engine and the behaviour doesn't change (Rule 0).
- **Done when:** at 390 and 1440 the clamp pair takes a single row inside the walk's tray, both themes pass axe, and the row height matches a NumberField's first row.

---

## 1X · Bevel stroke weight compensation (user, 2026-10-19, 9:45 PM ET)
- **What's wrong:** a 1px rule at 45° is antialiased across two pixel columns, so it reads lighter and thinner than the 1px horizontal it joins.
- **Fix:** draw every bevel edge (the sheet top corners, the landscape panel bevel, and any Certificate corner bevel) as one continuous SVG path that includes the joining horizontal and vertical. Don't build it from a CSS border plus a clip-path. Then compensate the diagonal:
  - The diagonal segment is stroked at `--bevel-comp` × the rule width, with a default of 1.2 (chosen 2026-10-19 after 400% crops: 1.4 read heavy at 2× DPR). The straight segments stay at 1×.
  - Use `stroke-linejoin: miter`, and use `shape-rendering: geometricPrecision` on the diagonal only.
  - Keep the colour identical on every segment. Adjust weight only, never opacity.
- Tune `--bevel-comp` by eye at 1× and 2× DPR in both themes. The diagonal should match the horizontal's apparent weight, and the corner shouldn't show a visible joint.
- **Done when:** in 4× zoomed crops at 1× and 2× DPR, the bevel's diagonal and horizontal read as the same weight, with no gap or blob at the joints.

## 1Y · Pane scroll zone (user, 2026-10-19, 11:45–11:46 PM ET)
> **SUPERSEDED by §1MP** (2026-10-20). Kept for history only; build §1MP (the edge-line removal in §1MP item 12 applies to every dock pane).

Why: content slid under the MODELS tab with no edge, so it read as cropped rather than scrolled (Nielsen 1, visibility of system status). The user ruled out fades because Art Deco has clear boundaries and no fades. This applies to every dock pane.

1. The tab bar is a fixed header in the sheet and never scrolls. It ends in a stepped Deco rule: a 1px `--rule-hair` line, full pane width, with a centred 3rem bar 2px thick in `--gold` sitting on it.
2. Only the region below that rule scrolls (`overflow-y:auto; overscroll-behavior:contain`). Content is hard-clipped at the rule, with no gradient or fade anywhere.
3. Scroll cues: when `scrollTop > 0`, a small `--gold` chevron (▲, 0.5rem) sits centred on the top rule, replacing the bar's centre. When more content is below, a matching ▼ sits on a 1px bottom rule at the pane's foot. Each cue is absent at its end. Cues take no pointer events and are `aria-hidden`. They switch instantly, with no transition. Use scroll-driven animation where supported, otherwise a tiny scroll listener toggling data-attributes.
4. The open asset's header row (name, summary, chevron, ON) is `position:sticky; top:0` inside the scroll region, on the sheet's surface colour, with its own single hairline beneath it while stuck, so settings pass under it, never under the tab bar.
5. Hide the summary line while a row is open (it duplicates the Selects).
6. Keyboard focus scrolls into view clear of the sticky header (`scroll-padding-top` equal to the header height).

Done: at 390 and 1440, scrolled to the middle of an open Bitcoin, content stops cleanly at the rule (nothing appears to float under the tab), both cues show, and at the top and bottom ends the matching cue is gone. There is no gradient anywhere in the pane.

Note for the Models pane rewrite (Probe): the replacement spec removes the hidden ■ and colour-square spans from the DOM entirely, so there are no `display:none` dead nodes.

---

## 1Z · Zoom line: no start dot, no end date (user, 2026-10-20, 8:41 AM ET)
The brighter white line under the time axis is the zoom line (§1T's position bar).
- Remove the round dot at its start and the date label at its end (e.g. "2064" under the last tick). The limits are self-evident: you find them when you can't zoom or pan any further, so they're never stated.
- The line itself stays, in its current colour and weight. Nothing replaces the dot or the label.
- **Done when:** at 390 and 1440, zoomed in and fully out, there is no dot and no end-date text on the zoom line; the time-axis ticks are unchanged.

## 2A · Historic Bitcoin price toggle (user, 2026-10-20, 8:41 AM ET)
The user wants to trace Bitcoin's real traded price on the chart, back to the earliest traded price and never earlier.
- **Back end untouched.** The engine already carries this: `render.showHistoric` (set to `false` in `src/v2/app/engine/config.ts`) and the dataset `src/data/datasets/bitcoin_weekly_prices_transformed_2.json` (848 weekly points, 2010-07-17 at $0.06262 through 2026-10-10). The v2 front end only needs a control that sets that flag. No new data, no fetching, no change to values.
- **Control:** placement and look are set by §1MP item 8. It's the "Show historic price" checkbox row in the "On the chart" group of the open Bitcoin body. The checkbox alone shows the state, with no OFF word. Default off.
- **Range:** the trace starts at the first point in the dataset (July 2010). Nothing is drawn before it, even though Bitcoin began in January 2009, because there are no traded prices before then. Never extrapolate or invent earlier points.
- **Zoom frame (amends §1T):** with the toggle on, the maximum frame's left edge becomes the first historic point instead of Today, so the user can zoom out to see 2010 to the end of the run. With it off, the frame is Today to the end, as now. Toggling resets to the new maximum frame.
- **Drawing:** a 1px solid line in the Bitcoin asset's colour (user-definable, default orange), no fill, no smoothing (every vertex is a real weekly print). The Today line stays where it is and now separates history from simulation.
- **Done when:** at 390 and 1440 the toggle shows under Bitcoin, turning it on draws the trace from July 2010 to the latest print, zooming fully out shows exactly 2010 to the run's end, and turning it off restores the Today-to-end frame.
- **Placement:** settled by §1MP (2026-10-20). Its behaviour is unchanged.

---

## §1MP Models pane (unified, signed by Form 2026-10-20)

This section replaces §1M, §1N, §1V, §1W and §1Y. It's the one spec for the Models pane. Build it from here, not from those sections. The scope is **the pane only**: it changes nothing on the chart, in the engine or in other panes. The one exception is the shared scroller clause (item 12): the PaneScroll edge lines are removed and the scroll fades added in every dock pane, as the user approved. Rule 0 holds: engine labels, ranges, defaults and behaviour are unchanged. The copy strings and their engine sources are in `p3/v54-book/COPY.md`.

**Reference (match these):** mock `p3/v54-book/mock.html`; shots `Collapsed-390.png`, `Bitcoin-open-390.png`, `Bitcoin-off-390.png`, `Collapsed-off-390.png`, `FULL-390.png`, `Collapsed-1440.png`, `Square-states.png`; copy `COPY.md`; audit results `audit.json`. Phone shots are at 390×844, the desktop shot at 1440×900.

**Still in force alongside this section:** the number-field gate (§1g), live fields (§1P), the slider focus scale (§1Q), never-clipped Select lists (§1U; in this pane lists open in place per Ruling 5, without §1U's top layer, sheet lock or no-auto-scroll), cursors (§1O), the historic-price behaviour on the chart (§2A; this section only sets where its control sits), and the chart's ON/OFF behaviour from §1M's "The chart and the tick box" paragraph.

### 1 · Hierarchy and order
The pane has no title; the MODELS tab names it. Top to bottom:
1. **The asset ledger**, in the locked order Bitcoin, S&P, Inflation. Each asset is a header row. An open asset shows its body below the header.
2. **Simulation**, a top-level group that's a peer of the assets and sits inside none of them. It follows the ledger.

The open Bitcoin body, in this order:
- **How prices grow** (section title)
  - Price model selector
  - The current model's own options (item 6)
- **How bumpy the ride is** (section title)
  - Walk selector
  - Clamp Price, with Min and Max on one row
  - Ergodic check, on its own line
  - Volatility
  - Statistical Sample Count (per asset)
- **On the chart** (section title)
  - Show historic price
  - Colour

The open S&P or Inflation body is one line: "{Asset} isn't modelled yet. When it is, its settings will open here." It's italic EB Garamond `--t-caption`/1.4 in `--text-muted`, starting on the text column, with `--s-2` below.

### 2 · Grid, spacing and lines (every state)
- **Side padding:** the scroll region's content has `--tk-pad-x` (14px) on each side. The right side gives back 2px to the scrollbar (item 11), so the text column's right edge never moves. There's a 6px gap between the bottom of the tab bar and the scroll region, and `--s-6` of padding at the foot of the content.
- **Gutter and text column:** colour squares hang in a 1rem gutter. Everything else starts on the text column at `--col` = 1rem + `--s-3` (1.75rem from the content edge). That covers names, labels, descriptions, selectors, tick boxes, section titles, sliders and the ergodic line. At 390 the text column runs from x=54 to x=364.
- **Lines:** the section-title rules are the only lines in the pane. There's no hairline between rows, under the pinned header, at the top or bottom of the scroll region, or in open lists. Controls draw their own parts (slider rail, tick box, colour square).
- **Space between rows:** inside a group, each row has `--s-2` of padding top and bottom plus a `--s-2` gap, so there's 24px from one row's last line to the next row's first. A name or label sits 1px (`0.0625rem`) above its own description. Asset headers are `--s-5` (16px) apart, and the Simulation group starts `--s-5` below the last asset.
- **Targets:** every interactive control has a hit target of at least `--hit` (44px), set in rem so it scales with text size. The target may overhang its row only into empty space, never over text: where a description sits directly below the label line, the target and its focus ring are anchored to the label line's bottom edge and overhang upward into the gap above. Elsewhere they are centred. Rows keep the spacing above (H1). (K3, 2026-10-29)

### 3 · Section titles
- The four titles are "How prices grow", "How bumpy the ride is", "On the chart" and "Time horizon" (the top-level Simulation group; user via Stack Math, 2026-10-29). Each is Jost 600 at `--t-section`, uppercase, with `--tr-section` (0.2em) tracking, in `--accent`, on one line where it fits. A title too long for the text column wraps to centred lines at line-height 1.3, and each side rule keeps its minimum of `--s-5` (it never shrinks below that); the rules centre vertically on the title block. Where the column is narrower than 12rem (for example 390 at 200% text), both rules hide and the title wraps alone, so nothing scrolls sideways (WCAG reflow beats the rule minimum). The tracking after the last letter is trimmed, so the text is optically centred.
- Each title has a rule on either side. The rules are 2px tall in `--accent` at 70% opacity, at least `--s-5` long, and equal in length. They taper to a point and fade to transparent at their outer ends. This is the only fade in the pane apart from the scroll fades.
- The title and its two rules span exactly the text column (from `--col` to the right content edge) and centre within it. They're within 1px in the v54 audits.
- Each title has `--s-5` above it, `--s-1` below it, and a minimum height of 1.5rem.

### 4 · Asset header row (collapsed and open)
- **Layout:** the colour square sits in the gutter. The name button fills the rest of the row, with `--s-3` padding top and bottom, at least 44px tall.
- **Name:** SM Cormorant 500 at `--t-pane`, line-height 1.15, tracking 0.01em. It's followed by a small ▾ (0.5rem, `--text-muted`, `0.375rem` from the name) that turns to ▴ while the asset is open.
- **Summary (collapsed only):** a line under the name in italic EB Garamond at `--t-caption`, line-height 1.3. It wraps onto a second line when it needs to and is never truncated or ellipsed. The open header shows the name and ▴ only, with no summary.
- **Collapsed rows:** each shows only its header, with no settings. The squares and names line up across the rows. Rows with one-line summaries are the same height: 68.7px at 390 and 70.9px at 1440.
- **Opening and closing:** pressing the name toggles the asset. Opening shows the body; closing hides it and keeps every setting as it was. Changes apply live, so there's no save step. Several assets can be open at once; each opens and closes on its own. Esc collapses the open asset and puts focus back on its header (carried from §1M), unless a selector list is open (item 5), in which case Esc closes the list first.
- **Opening scrolls:** when an asset opens, the scroll region moves so that asset's header sits at the top, where it pins (item 10). If there isn't enough content below, it scrolls as far as it can. The scroll is smooth, and instant under reduced motion. The body appears at once, with no height animation.
- **Landing state:** every asset is collapsed (carried from §1M).

### 5 · Colour square: on/off switch
The asset's colour square is its chart switch, like a chart-legend key. There's no ON/OFF text and no toggle control.
- **Size:** the square is 11px (`0.6875rem`) outside. Its press target stays at least 44×44px, and the target has no visible change.
- **ON:** a 1px outline in the asset colour, then a clear 2px gap, then a solid 5px square in the asset colour at the centre.
- **OFF:** the 1px outline in the asset colour only.
- **Off state:** only the hollow square shows that an asset is off. The name stays `--text` and the summary `--text-muted` in both states, and no text dims (C1, C1a).
- **Hover (mouse only) and keyboard focus:** the square gets a 1px `--accent` outline 2px outside it. Touch has no hover state.
- **Pressing:** the square toggles on and off, and never opens or closes the asset. Its target is 44×44px, centred on the square, which sits centred on the name's first line.
- **Starting state:** Bitcoin starts ON.
- **Not yet modelled (S&P, Inflation):** the square shows OFF and is inert. Pressing it does nothing, it gets no hover outline, and its cursor stays the default arrow. Keyboard focus can still reach it and shows the gold focus outline. It's a toggle button with `aria-pressed="false"` and `aria-disabled="true"`, named "S&P on chart (not yet modelled)" or "Inflation on chart (not yet modelled)". The row still expands and collapses from its name.
- **Accessibility (modelled assets):** a toggle button with `aria-pressed`, labelled "Show Bitcoin on chart".
- **Colours:** Bitcoin uses its Colour pick (default `--path-btc-price`, ₿ orange), S&P uses `--path-sp`, Inflation uses `--path-inflation`.

### 6 · Selectors (price model and walk)
- **Closed:** you see only the current pick. Its engine name is in SM Cormorant 500 at `--t-pane` on the text column, with a ▾ (`--text-muted`) at the row's right edge. Its one-line description sits below in italic EB Garamond at `--t-caption`, `--text-muted`, using the full row width. Each row has `--s-2` padding top and bottom, at least 44px tall. There's no mark in front of the name.
- **Open:** pressing the closed row opens the list in place, showing every engine choice in engine order, each with its description. The current pick's name turns `--accent`, with a gold ✓ (0.875rem) at the right edge. The other names stay `--text` with nothing beside them, and there's no ▾. On desktop (≥64rem) the open walk list uses two columns with an `--s-5` gap. The list is never clipped (§1U).
- **Picking:** pressing any row in the open list picks it and closes the list. Esc closes it without a change and puts focus back on the pick. While the model list is open, the model's options are hidden.
- **Labels:** the model list takes its name from "How prices grow". The walk list is labelled with the engine's "Walk Strategy:" (src/content.ts L24).
- **Price models**, in engine order: Power Law Regression Median (the default), Power Law Support Line, Rainbow Chart, CAGR, Stock-To-Flow 2024 Refit, Stock-To-Flow, Historic. Descriptions and sources: COPY.md "Price models".
- **Walks**, in engine order: Bubble (the default), Momentum, Pong, Random, Saw, Shark, Sin, Vote Count, 🟢🟢🟢🔴. Descriptions and sources: COPY.md "Walks".
- **Model options** sit under the closed model selector, inside "How prices grow". They're plain setting rows (item 7) and change when the model changes. A model without options shows nothing.

| Model | Option (engine label) | Range · default | Slider | Description (COPY.md "v47 additions") |
|---|---|---|---|---|
| CAGR | R (%) | 0–1000 · 20, step 1 | yes, §1Q focus scale: linear to 50 over the first 80%, marks at 0, 10, 25 and 50, with 50 labelled | The yearly growth rate the price compounds at. |
| CAGR | +/- | from 1.01, no top · 3, step 0.1 | none (the engine gives no top) | How many times above and below today’s price the top and bottom start. |
| Historic | Previous Halvings | 2–3 · 2, step 1 | yes | How many past halving cycles to replay, besides the current one. |
| The other five | none | — | — | — |

### 7 · Setting rows
- **Layout:** the label is EB Garamond 400 at `--t-row`, line-height `--lh-row` (1.25), on the text column. The value is Jost 500 at `--t-value` with tabular lining figures, right-aligned and always a live field (§1P, gate §1g). The description is italic EB Garamond at `--t-caption`/1.3 in `--text-muted` across the full row. Where the engine gives a range, the existing style-book slider fills the next line, the full text-column width. Each row is at least 44px tall.

| Row (engine label) | Range · default | Description | Source |
|---|---|---|---|
| Clamp Price: | Min and Max, both off | Min stops a walk going below the floor; Max stops it going above the top. | COPY.md "Settings with a description line" |
| Volatility (0-1): | the engine's 0–1 · 0.1 | How big each week’s random step is. | COPY.md, same table |
| Statistical Sample Count (1-10k): | 1–10,000 · 1,000, plain slider | How many separate futures are drawn; each runs its own random walk. | COPY.md "v50 addition" |
| Years | 1 to the live cap (main's range, Ruling 7) · 40, step 1, plain slider | How far into the future to look, for every model. | COPY.md "v52 changes" |

- **Clamp Price:** the label is on the left. On the right, two compact toggles sit on the same row, Min then Max. Each is a 1rem tick box followed by its word in EB Garamond `--t-row`, with no ON/OFF word. Each toggle, box and word together, is one 44px-tall target with `--s-2` side padding, and the two are `--s-1` apart. When a toggle is on, its box fills `--accent` with a `--ground` check, and the toggle gets a `--selected` fill. The pair never takes a row per toggle. The row is a group labelled "Clamp Price:". Each toggle is a switch with the accessible name "Clamp minimum price" or "Clamp maximum price", and the visible word stays "Min" or "Max".
- **Ergodic check:** its own short line directly under the Clamp Price row, right-aligned on the text column, `--s-2` closer than a normal row gap. It's quiet italic EB Garamond at `--t-caption` in `--text-muted`.
  - It reads "ergodic", followed by a 0.75rem ✓ drawn in `--accent`, when all three of these hold: Volatility > 0; both clamps are on or the walk is neither Random nor Sin; and the walk isn't Random or Volatility ≥ 0.05.
  - Otherwise it reads "not ergodic", with no mark.
  - It updates live as the walk, clamps or Volatility change, and is announced politely.
- **Samples are per asset:** Statistical Sample Count lives inside Bitcoin's "How bumpy the ride is", after Volatility. It's no longer in Simulation.
- **Years:** the only row in the top-level Simulation group. It replaces Epoch Count, which, with its "(~40 years)" note, is no longer shown. Years is front-end copy; how it maps to the simulation is set by main's years work.

### 8 · On the chart
- **Show historic price:** a tick-box row. The box is `--tk-box` (1rem) with a 1px `--control-line` border, and sits on the text column. The label is EB Garamond `--t-row`, `--s-3` after the box. There's no ON/OFF word; the box alone shows the state.
  - When on, the box fills `--accent` with a `--ground` check, and the row gets a `--selected` fill that starts `--tk-pad-x` before the box and stops at the scrollbar.
  - It defaults to off and is a switch labelled "Show historic price". What it draws is §2A, unchanged.
- **Colour:** the label "Colour" sits on the left and the current pick's name on the right, in Jost 500 `--t-value`.
  - Below them are eight 1.25rem square chips, in this order: ₿ orange (default, `--path-btc-price`), Jade, Lapis, Amethyst, Citron, Orchid, Coral (`--path-plan-1…6`), and $ green (`--path-usd`).
  - Each chip has a 44px target and they're spread across at most 22rem. The pick shows a 0.875rem check in `--ground`.
  - The row is a radio group labelled "Colour", and each chip is a radio named with its colour name.

### 9 · Summary string (collapsed header)
- **Format:** `{model part}, {walk} walk, volatility {Volatility}`, built from the current settings and updated live.

| Model | Model part | Source (COPY.md "v53 collapsed-row summaries") |
|---|---|---|
| CAGR | Grows {R}% a year | cagr.ts L6–10, default 20 (L14) |
| Historic | Replays {Previous Halvings} past halving cycles | historic.ts L26–27 |
| Power Law Regression Median, Power Law Support Line, Rainbow Chart, Stock-To-Flow 2024 Refit, Stock-To-Flow | the engine model name | `modelType` in src/data/models/*.ts |

- **Walk part:** the walk's engine name.
- **Volatility part:** the current Volatility value.
- **Examples:** with the defaults, "Power Law Regression Median, Bubble walk, volatility 0.1" wraps onto two lines at 390. With CAGR it's "Grows 20% a year, Bubble walk, volatility 0.1", and with Historic "Replays 2 past halving cycles, Bubble walk, volatility 0.1".
- **S&P and Inflation:** "Not yet modelled". They have no settings yet.
- **Number of futures:** no longer in the summary. The earlier "{samples} futures" format is gone.

### 10 · Pinned header
The open asset's header row stays pinned to the top of the scroll region while you're inside that asset's section, and scrolls away with it once you pass it. It sits on `--surface` and covers the side padding (not the scrollbar), so nothing peeks out beside it. There's no line under it. Settings slide under it, never under the tab bar. Keyboard focus moving into view always lands below the pinned header.

### 11 · Scroll fades and scrollbar
- **Fades:** the content fades out over 1.5rem (24px) at the top edge only while scrolled away from the top. The top fade starts at the pinned header's bottom edge, so content fades out as it goes under the header. The bottom edge fades over 1.5rem only while there's more below. Neither fade appears at its end, and both switch instantly. The fades never cover or dim the tab bar or the scrollbar. These and the section rules are the only gradients in the pane.
- **Scrollbar:** thin and on the right, inside the pane's right edge. The track is 2px in `--rule` and the thumb is 2px in `--accent` with square ends. Its 2px of space is always reserved, so the text column never moves.
  - On desktop it's always visible. On touch it shows while scrolling and hides about 1s after scrolling stops.
  - Known browser limits: iOS Safari shows its own native overlay scrollbar. Every browser, Firefox included, draws the same 2px bar in the 14px right inset.

### 12 · Shared scroller: edges and fades (applies to every dock pane)
- The tab bar stays fixed and never scrolls.
- The 1px full-width line under the tab bar is removed in every dock pane, together with its centred 3rem gold bar and its ▲. In the v2 shell this is PaneScroll's `.rule`.
- The 1px line at the foot of the pane is removed in every dock pane, together with its ▼. In the v2 shell this is PaneScroll's `.foot`.
- Every dock pane gets the same top and bottom scroll fades as Models (item 11): 1.5rem each, the top one only while scrolled, the bottom one only while there's more below. The fades do the removed lines' job. The user approved this.
- Nothing else in the shell changes.

### 13 · Keyboard and accessibility
- **Structure:** the ledger is a list labelled "Assets". Each asset is a list item. Each header is a disclosure button with `aria-expanded`, and Enter or Space toggles it. The colour square is a separate toggle button with `aria-pressed`, toggled by Space or Enter, and never expands the row.
- **Tab order**, in reading order:
  - each asset's square, then its header
  - inside an open Bitcoin: model selector, model options, walk selector, Clamp Min and Clamp Max, Volatility (value, then slider), Statistical Sample Count (value, then slider), Show historic price, Colour (one stop, arrow keys move the pick)
  - then the next asset
  - then Years (value, then slider)
- **Selectors:** each is a listbox with the pick marked selected. Enter or Space on the closed pick opens the list. In the open list, Up and Down move one row, Home and End jump to the first and last rows, Enter or Space picks the focused row and closes the list, and Esc closes the list with no change. Esc in an open list closes only the list, never the sheet. Focus always comes back to the pick.
- **Focus:** the house focus ring (`--focus-w` 2px in `--focus`) shows on every focusable control except the colour square, whose focus is the 1px gold outline (item 5).
- **Announcements:** the ergodic line is announced politely when it changes.
- **Decorative parts:** chevrons, checks and section rules are hidden from assistive technology.
- **Themes:** every colour above is a semantic token. Shots are dark theme; linen follows the tokens. Text meets its contrast floor in both. `--text-faint` is retired (2026-10-27); nothing uses it.

### 14 · States to build and check
Collapsed, open (one and several), asset ON, asset OFF, not yet modelled (inert square), hover (mouse) and focus on the square, model list open, walk list open, ergodic and not ergodic, Show historic price on and off, a Clamp toggle on, scrolled at the top, mid-scroll (both fades and the scrollbar) and at the bottom, phone 390 and desktop 1440, dark and linen.

**Done when:** at 390 and 1440 the pane matches the v54 shots and these checks hold:
- every collapsed row shows only its header
- a summary is never truncated
- the section rules are the only lines and the scroll fades the only other gradients
- every target is at least 44px
- the titles centre on the text column within 1px
- S&P and Inflation start off and their squares don't toggle
- opening an asset brings its header to the top
- the PaneScroll edge lines are gone and the scroll fades are present in every dock pane
- axe reports 0 violations in both themes

### Rulings 2026-10-21
These rulings amend the items above. Where one conflicts with an earlier item or section, the ruling wins.
1. **Colour chips (item 8):** below 22rem of row width the eight chips wrap into two rows of four, each target 81.5×44px at 390. At 22rem and above they sit in one row of 44px targets. The chip faces (1.25rem square, 0.875rem `--ground` check on the pick) are the same in both layouts.
2. **Field clamps:** R (%) clamps to the engine's 0–1000 on commit. CAGR +/- keeps its minimum of 1.01 and has no maximum. Every field clamps to its own model's engine range on commit.
3. **Persistence:** Show historic price, Colour, and each asset's on/off square persist across reload, like the other pane settings.
4. **Number format in fields:** digits are grouped with commas up to 999,999,999. Above that, the field shows scientific form, e.g. "1.2 × 10¹²", with `aria-valuetext` "1.2 times 10 to the 12".
5. **Selector lists in the Models pane (item 6 overrides §1U here):** the list opens in place in the pane's flow, not in the top layer, and scrolls with the pane. When it opens, the pane scrolls only as far as needed to show the whole list (instant under reduced motion). The sheet's scroll is not locked while it's open. §1U's top layer, sheet lock and "the sheet never scrolls by itself" don't apply in this pane.
6. **Unsupported rows (S&P, Inflation):** the header keeps the `pointer` cursor, because it expands. Only the inert square gets the default arrow (§1O, item 5).
7. **Years:** follows main's range, from 1 to the live cap, default 40. This replaces the 4–120 placeholder in item 7's table.
8. **Colour chip targets:** every chip target is at least 44×44px and no two targets overlap. The 81.5px width in ruling 1 is only the size at 390. Chips may be narrower, e.g. 65.8×44px in landscape or at 320.
9. **Lists taller than the pane:** such a list sits in the pane's normal flow, and scrolling the pane reaches every row. On open, the list starts just below the pinned header, with the current pick visible. 'Just below the pinned header' means below its 24px top fade. If the list can't both start there and show the current pick, the pick wins: on open, scroll as little as possible so the pick sits fully visible, clear of both fades.
10. **320px width:** 320px is a supported width (WCAG 1.4.10 Reflow), and the pane never scrolls horizontally.

**Clarifications 2026-10-21 (R4, Form):**
- 9a. When the pick row is taller than the clear area between the fades (every row at 320×568; the 124px Model row at 320×640), the current fallback is correct: the pick's top aligns to the top of the clear area and its bottom may run under the bottom fade. The row's name and value line must stay clear. Tab focus follows the same rule: the focused control and its full focus ring must sit inside the clear area. If the focused control sits lower in a tall row, scroll by the smallest amount that clears it.
- 4a. Values in × 10ⁿ form are rounded to at most 3 significant figures, with trailing zeros dropped (1.234567890123 × 10¹² shows as 1.23 × 10¹²). While a field is focused for editing, it shows the full typed value. Spoken text matches the shown value.
- 4b. Ruling 4 also governs the chart headline and axis ("$4.23 × 10⁵⁶" with spaces, spoken as "4.23 times 10 to the 56th"). Those are chart changes, so they are out of scope for the pane-only 1MP slice. They're queued as a separate chart item and must not change in 1MP.
- 9b. If the focused element itself (e.g. a 124px row ring) is taller than the clear area, align its top to the top of the clear area and let the bottom run under the fade. Otherwise the whole ring must be inside the clear area.
- 9c. Tab focus always scrolls by the minimum amount, never centring. This applies to every row.
- 4c. After Enter, a field that keeps focus shows the raw typed digits. The × 10ⁿ form appears only when the field is not focused.
- 2a. Count fields (Previous Halvings) take whole numbers only: on commit, round to the nearest integer within range. Percent and decimal fields (R, +/-) accept any typed precision and display it rounded to 2 decimals (or 3 significant figures in × form) when not focused. While focused they show what was typed.
- 2b. At rest, trailing zeros are dropped (50, not 50.00; 123.456789 shows as 123.46). Summary lines use the same at-rest format as the fields (e.g. "Grows 123.46% a year").
- 2c. At 320, keep at least 8px between the chart's end-label plate and the "Today" caption. If that doesn't fit, move the plate below the caption line.

**Clarifications 2026-10-23 (R6/R7, Form)**
- **2d (end-label plate):** the plate must never sit on the median line. Offset it above or below the line's end point, whichever side has more clear space, so the median stays visible right to its last point. The plate may overlap the fan's fills. (Fix for R6 Q1; minor.)
- **2c measurement:** the 8px gap is measured to the visible text ink of the "Today" caption, not its text box. The current exactly-8px result passes.
- **4d (after a clamp or rounding on Enter):** the focused field shows the committed value as raw digits with no grouping, e.g. typing 5000 in R commits and shows "1000", not "1,000" and not "5000". This extends 4c. A clamp also shows a short inline note under the field, "Max is 1000" (or "Min is …"), until the field changes or loses focus.
- **2e (commas in whole-number fields):** a comma is accepted only as valid thousands grouping ("1,000"). Anything else, such as "2,5", is invalid: the field keeps its last committed value and shows the inline note "Whole numbers only". Never guess 25 or 2.5.
- **2f (Volatility):** ruling 2a's at-rest format covers every decimal field, Volatility included: 2 decimals at rest, trailing zeros dropped (0.123456789 rests as "0.12"), full value while focused.
- **9d (phone Models sheet opened by keyboard):** initial focus stays on "Close the Models sheet", but Tab order must match visual order, so Close is the first Tab stop in the sheet and Tab moves down from there into the content. (Fix for F7-1.)
- **4e (clamp on blur, amends 4d):** a clamp shows the same short note, "Max is …" or "Min is …", whether it comes from Enter or from Tabbing away. The note stays until the field is next edited, so a blur clamp is still seen. The long "R goes from 0 to 1000. We used 1000." message is retired.
- **4f:** numbers in notes are grouped ("Max is 10,000"), like other at-rest text. Only the field's own focused value uses raw digits.
- **2g (amends 2e, all numeric fields):** a comma is accepted only as valid thousands grouping, in every numeric field. In decimal fields, "2,5" is invalid: keep the last value and show "Use a dot for decimals". In whole-number fields, "1.5" shows "Whole numbers only", not the long invalid message.
- **2d fallback:** if neither side has room for the plate, putting it on the roomier side inside the plot is accepted. A sweep down to 320×300 never triggered it.
- **4g (focused values of 1e9 or more):** keeping the × 10ⁿ form while focused is accepted, but at full stored precision, not 3 significant figures. The field also accepts typed "1.5e9" and "1.5 × 10^9" (Postel). This amends 4a and 4c for values of 1e9 or more only.
- **2h (2g wins over 2a):** Previous Halvings behaves like every other whole-number field. "1.5" is rejected with "Whole numbers only" and is never rounded. Silently rounding is a guess.
- **4h (amends 4e):** a clamp note clears when the field is next edited or when its value changes from anywhere else, such as switching models. A note must never describe a value that's no longer shown.
- **2i (after an invalid entry, amends 2e/2g):** when focus leaves after an invalid entry, the field shows its last committed value again, and the short note stays (cleared per 4h). The field must never show text that isn't the value in use.
- **2j (short notes for every invalid entry):** the long generic error is retired everywhere. Non-numeric text ("abc", "2x") shows "Numbers only". An out-of-range value, including overflow such as "1e309", clamps and shows "Max is …" or "Min is …" (4e).
- **2d placement check:** the plate goes above the line whenever there is less room below its end point than above, for example when the median ends in the lower part of the plot. If no reachable state puts it there, a unit test of the placement rule is enough.
- **2k (overflow with no max):** in a field with no maximum, "1e309" shows "Too large", commits nothing and keeps the last value. It is a number, so "Numbers only" is wrong here. "-1e309" clamps to the min, as built.
- **2l (empty where empty isn't allowed):** shows "Enter a number"; on blur the field reverts to the last value (2i).
- **2m (Enter on invalid text):** keep the typed text while focused so the user can fix it; revert only on blur.
- **2d equal room:** the plate goes above.
- **4i:** invalid notes clear the same way clamp notes do (4h).
- **Storybook:** the invalid story shows the real short note, "Numbers only". Rebaseline the 8 number-field--invalid PNGs. No retired copy stays in stories.
- **C1 (asset summary contrast, 2026-10-27):** the collapsed-row summary line uses `--text-muted` at full opacity in every state and theme, the same token as Bitcoin's summary, so it is at least 4.5:1 against its surface. The OFF state is shown only by the hollow square; never dim the text with opacity or a faded colour. Info that stays readable must keep text contrast.
- **A1 (emoji labels' accessible name):** emoji in labels are decorative and wrapped `aria-hidden="true"`, with a plain-words text alternative. The accessible name is "3 up, 1 down, volatility:", not the emoji string. The same applies to every emoji in labels, select options and help text.
- **C1a (OFF row name):** the OFF row's name stays in `--text`, like an ON row. The hollow square is the only OFF cue (C1).
- **T1 (tick-row focus ring):** the ring has equal inner padding on both sides, at least `--s-2` after the last letter. The ring must never touch the text.
- **H1 (tap targets at any text size):** every row's target is at least `--hit` (44px), set in rem so it scales with text size. At 1×, value rows keep the §2 spacing (24px between rows). The 200% fix must not make 1× rows about 60px tall.
- **Bevel test floor:** 0.98. A ratio of 0.9993 is antialiasing noise, not a visible failure.
- **K1 · Every v2 tick box uses the asset key mark (user via Stack Math, 2026-10-29; supersedes the TickToggle ✓ box, the --accent box fill and the --selected row fill in §1MP 7–8, Clamp and Show historic price):**
  - **Scope:** every `TickToggle` in v2: Clamp Min, Clamp Max and Show historic price today, plus any later ones. The v1 `src/components` checkboxes are out of scope.
  - **Mark:** the same geometry as the asset key (§1MP 5): a `0.6875rem` square with a 1px `currentColor` outline. When on, a solid core is inset by `--s-0`; when off, the outline alone. There is no ✓ glyph. Share one implementation with `AssetRow .key::after` so they can't drift apart.
  - **Colour:** `--accent` (neutral system colour), not the section's asset colour. The asset colour means "this series is on the chart"; Clamp and historic price are settings, so they must not look like legend keys.
  - **No background change:** remove the `--selected` fill (`.root[data-state="on"]::before`) for both row and pair. The words stay `--text` in both states. On versus off is shown only by the core, a shape cue, not colour alone.
  - **Hover (fine pointer only):** a 1px `--accent` ring at `--s-0` offset around the square, like the asset key. Nothing else changes.
  - **Focus-visible:** keep T1, the `--focus-w` `--focus` ring around the box and words with `--s-2` inside. No fill.
  - **Disabled:** mark and words `--disabled`, the outline dashed (M4), and the core still shown if on. `--cursor-off`, and no hover ring.
  - **Unchanged:** the 44px target (H1), `role="switch"` with `aria-checked`, the accessible names, the layout and spacing (box on the text column, words `--s-3` after; pair `--s-2` padding and `--s-1` apart).
  - **Accept:** on and off are the same height with no fill and nothing overlapping the row below; at least 3:1 for the mark against `--surface` in dark and linen; the asset key and the tick mark match pixel for pixel at the same size.
- **K2 · One check-mark component, two sizes (user via Stack Math, 2026-10-29; extends K1, supersedes the solid Swatches face and its ✓):**
  - **Component:** one primitive, the check mark, with `size: "default" | "large"` and `on: boolean`. It's aria-hidden and draws only the mark; its parent owns the role, the name and the 44px target. TickToggle and the AssetRow key use `default`; Swatches uses `large`.
  - **Default:** `0.6875rem` square, 1px outline, core inset `--s-0` (as K1).
  - **Large (K6, 2026-10-29; replaces the K3 2× rule):** Large A from the spec sheet. A `1.25rem` (20px) square, the same face as before, with a 2px outline, a 3px gap, and a 10px solid core when on. Hover is a 2px copy of the outline 3px outside it, and focus is 2px another 3px outside that, for 40px overall, which fits inside the 44px target. Layout and targets are unchanged. Both sizes keep the same off/on rule: outline only when off, outline plus a solid core when on.
  - **Colour rule:** the mark draws in `currentColor`, which the parent sets. Use `--accent` for settings (K1). Use the colour itself only where the colour is the content: the asset key (`--dyn-asset`) and each swatch (`--dyn-c`). So every swatch shows its own colour as an outline, and the picked one also gets its core.
  - **Swatches states:** the picked swatch is on (core) and the rest are off (outline). Hover (fine pointer) adds a 1px `--accent` ring at `--s-0` offset; the ring does not scale with size, so it's the same 1px at `--s-0` on both sizes. Focus-visible draws a `--focus-w` `--focus` ring at `--s-1` offset around the mark (roving tabindex unchanged). There's no ✓ glyph and no fill behind the chip.
  - **Unchanged:** the radiogroup, radio semantics, arrow/Home/End keys, the 44px targets and the 8-or-4-per-row layout.
  - **Accept:** each swatch outline at least 3:1 on `--surface` in dark and linen (Forge lists any that fail; the palette fix is mine); a large mark scaled to default size matches the default mark's proportions; the picked swatch can be told apart without colour (core versus none).
- **U1 · Undo (MVP-SPEC Phase 4; stories 152, 173, 194; 2026-10-29):**
  - **Where:** in the sheet's edge (grab) row, at the inline end, `--tk-pad-x` in from the edge, centred on the row. This holds on the phone sheet, the landscape side panel (its top edge row) and desktop alike. Never over the chart (173). The grab point stays centred; on narrow widths the chip's label truncates before it can touch the grab point's 44px target.
  - **Look:** STYLE.md v38 is final: a square chip with a `--rule-double` `--accent` frame, no fill, EB Garamond `--t-row`, and "Undo" underlined (194). Never rounded. The target is at least `--hit`.
  - **Glyph ↶:** Icon `undo`, 16 grid, stroke 1.5, `currentColor`, square caps and joins, no fill: `M5 3 L2 6 L5 9 M2 6 H10 A4 4 0 0 1 10 14 H7`.
  - **Text:** `↶ Undo · <Field>: <old value>`, e.g. `↶ Undo · Years: 30`. The old value is in that field's resting format (grouping, decimals, ₿ prefix, × 10ⁿ) and is the same string the field showed before. A choice shows its option label ("Plan C"); a switch shows "on"/"off". The field name truncates with an ellipsis first; the value never truncates.
  - **History:** multi-step (152). Each committed change pushes one step. The chip always describes the newest step. Undo restores that value (a 200ms tween, or instant with reduced motion) and the chip moves to the next older step. It leaves (160ms, or instant) when history is empty. A new commit while the chip is showing updates its text in place with no re-slide. There's no timeout and no auto-dismiss (WCAG 2.2.1). No Redo chip. Redo is keyboard only: Shift+Cmd/Ctrl+Z re-applies the most recently undone step (PO ruling, Stack Math, 2026-10-29). The live region announces "<Field> back to <value>". Any new commit clears the redo steps. History lasts for the session; the cap is an engineering call, at least 20 steps.
  - **Keyboard:** Cmd/Ctrl+Z triggers Undo when focus isn't in a text field.
  - **Accessibility:** a `<button>` named "Undo <Field>, back to <old value>". On its first appearance a polite live region says "Undo available". After an undo it says "<Field> back to <value>". A commit never moves focus to the chip. After activation focus stays on the chip; if history is now empty, focus moves to the restored field.
- **P1 · Per-model params (only if PR #11 merges; the back end is the user's. Until then the pane shows main's settings as today):**
  - **Shown:** exactly the selected model's `params`, in `params` order, under the price-model selector, labels verbatim from the engine (`label`). The old varInput/varRange "show only when" rules are replaced by "show the model's params". A model with none shows no param rows. Switching models swaps the rows, and each model keeps its own values (the engine's `declaredSettings`).
  - **Choice params** (Quantile Source, Rainbow Refit, Stock-to-Flow Formula): a radio list, one row per option, all visible (3 options, so no popover). Each row's mark is the K2 default check mark in `--accent`, on for the picked option, inside a `radiogroup` named by the param label. Option labels are verbatim. Arrow keys move and select, with roving tabindex. A pick commits immediately and pushes an Undo step.
  - **Number params:** the existing NumberField gate (§1g) and live-field rules. A slider appears only where both bounds are finite. The full range is the slider range; there's no separate focus range. The value rests at the step's decimals:
    - CAGR R (%): 0–1000, step 1, rests "20".
    - +/−: min 1.01, no max, so no slider; step 0.1, rests "3.0" (2k overflow rule).
    - Offset: 0–1, step 0.1, rests "0.5".
    - Power Law Shift (years): 0–30, step 0.1, rests "6.0".
    - Stock-to-Flow Band: 0–0.99, step 0.01, rests "0.68".
    - Historic Previous Halvings: 2–3, step 1 (2h still applies).
  - **Model text:** the engine's own `summary` is the caption under the selector, verbatim, `--text-muted` `--t-caption`. The full `description` sits behind a "More about <Model>" text disclosure under it, verbatim, with URLs as links. There's no COPY.md rewrite, because the engine text is the source of truth and a paraphrase would drift.
- **Fade at a pinned header's exit (2026-10-29):** a header counts as pinned only while it is actually stuck at the top edge. Once it starts being pushed out, it takes the standard top fade straight away, with no blend over the scroll (§11: fades switch instantly).
- **G12 exemptions (2026-10-29):** three main settings have no Models pane control, on purpose. `loadingPriceData` is a state flag, not a setting. `pinnedWeeks` is chart interaction state and out of the pane's scope (v2 sends null). `showModel` is main's model-only chart mode, which hides the walks and volume. The v2 pane has no toggle for it, and v2 sends false; whether v2 ever offers that view is the product owner's call.
- **Time horizon (2026-10-29):** the top-level group's title is "Time horizon" (`sections.simulation`). The Years description is "How far into the future to look, for every model." (`settingDesc.years`). The field label stays "Years", and the layout doesn't change.
- **Tokens retired by K1 (2026-10-29):** `--tk-box` and `--selected` are deleted, along with any alias that only points to them (such as `--chip`) if nothing else uses it. Older lines in this spec that name them are superseded by K1 and K2.
- **U1 build rulings (2026-10-29, from the 26335db review):** (1) The chip sits in the tab row, just below the sheet edge and not centred on it, at the inline end, `--tk-pad-x` in. (2) Keep the spaces around the middle dot with non-breaking spaces or inline margin, not `white-space: pre`, so the field name can still truncate with an ellipsis. (3) The 200ms tween animates the restored field (its number and slider thumb), visual only, with one commit and one recompute; the chip's text swaps instantly. (4) <Field> is the control's visible label; the model selector is "Price model", and its value is the option label. (5) In phone landscape the chip shows only while the side panel is open; the history and Cmd/Ctrl+Z still work while it's closed. (6) Undo from the chip keeps focus on the chip, and focus moves to the restored field only when the chip leaves (history empty). Undo or redo from the keyboard never moves focus. (7) The token CSS comments that repeat this spec can go; delete the retired tokens first.
- **U1 round 2 rulings (2026-10-29, amends :860):** (a) "↶ Undo" never clips, and the value never shows partly. When the text doesn't fit, drop the field name whole, then the value whole, then the word, until only the glyph is left. The chip still keeps its `--hit` target and its full accessible name and title. So at 390 it reads "↶ Undo · Power Law Support Line", and at 200% text it reads "↶ Undo". (b) Clamp steps are "Clamp Price Max" and "Clamp Price Min", with the value "on" or "off". (c) and (4) amended: a selector with no field label uses its section heading as <Field>, so "How prices grow" for the price model and "How bumpy the ride is" for the walk. The accessible name is "Undo, <Field> back to <value>". (d) If the chip has focus and history empties, focus goes to the restored field whatever triggered the undo; focus is never dropped to the page.
- **K3 · Probe K1/K2 findings (2026-10-29):** F1 (superseded by K6, :832): the accept line (:836) wins, and the large mark is now exactly 2× the default (:832): 1.375rem, a 2px outline, `--s-1` inset, a 0.625rem core. N1 and F2: on Clamp Min/Max, and on any control whose label line has a description directly below, the 44px target and the T1 focus ring end at the label line's bottom edge and overhang upward into the empty row gap (at most 16px of the 24px gap). Nothing, neither target nor ring, reaches the description at any width or text size. Visible spacing is unchanged (§2 Targets, :635).
- **K4 · Targets and rings beside descriptions (2026-10-29, amends K3 and :635 after Forge's measurements):** one rule for every row whose label line has a description directly below it. (1) The focus ring traces the visible control inside the label line's track: on a tick, the box and words, drawn inside the button (outline-offset −`--focus-w`); on a number row, the value cell. It never extends past the track, so it never touches the description, at any width or text size. (2) The description sits above the hit area in stacking order and keeps its own taps: a tap on description text never toggles or opens anything. (3) Clamp Min/Max also anchor their 44px target upward (16px into the 24px gap), so they keep the full 44px. (4) Number rows keep the full row width as the target (tapping the row opens it, :198), centred on the track and ending where text begins above and below. The resulting height is at least 24px (WCAG 2.5.8), and this is a recorded exception to H1's 44px height. (5) Visible spacing doesn't change. Select options are out of scope, because their description is inside the button.
- **K5 · Hover ring takes the mark's colour (user via Stack Math, 2026-10-29; amends K1 hover and K2 swatch hover):** on a fine pointer, hover draws a 1px `currentColor` ring at `--s-0` offset around the mark, at both sizes, so it matches whatever colour the parent gives the mark: `--accent` on settings, `--dyn-asset` on the asset key, `--dyn-c` on each swatch. Hover is told apart by shape, not colour: a second, separate square outline with a visible gap, and no core change. Focus stays distinct: `--focus-w` (2px) in `--focus` at `--s-1` offset, and when both apply, the focus ring is drawn outside the hover ring. Disabled controls get no hover ring. Contrast: the ring uses exactly the mark's colour, so it inherits the mark's 3:1 or better on `--surface` in both themes (lowest 3.55, plan-1 on linen, from Forge's 10:16 table). Forge confirms `--ground` for any mark drawn there, and the contrast test covers the ring.
- **RF1 · Dock and header reflow at large text (2026-10-29; WCAG 1.4.4 and 1.4.10):** (1) The gear stays a 44px icon button pinned at the inline end of the tab row, always on screen, and never scrolls with anything. (2) The tabs take the remaining width with their full words, never icon-only. When they don't fit on one line, they wrap onto a second row in the same order, each keeping its underline. There's no sideways scroll strip and no overflow menu. (3) The STACKMATH wordmark is a logo (exempt from 1.4.4): it shrinks to fit the header width, mark and tracking together, and never overflows. (4) Nothing in the app shell may be wider than the viewport at 390 with a 32px root. The root uses `overflow: clip` so script and focus can't scroll it, and a test checks that every element's right edge is within the viewport. Layout at a 16px root is unchanged. (5, review of 4190c67) A hidden gear takes no space and leaves no empty row. A shown gear sits on the tab row itself and moves to its own row only when the tabs plus the gear don't fit. The tabs keep the same alignment as at 16px. Until the gear has its 44px target it stays hidden in production, and the target ships in the same change that first shows it.
- **K6 · Large mark, own design (2026-10-29, user picked Large A):** 20/2/3/10 px (box / stroke / gap / core), with hover and focus each 2px at a 3px gap, per :832. It replaces K3 F1's 2× rule. Default stays 11/1/2/5. One stroke and one gap per size, hover inherits the mark's colour (K5), and the disabled states follow the sheet. Reference: `/workspace/stackmath-mocks/p3/large-mark/sheet-{dark,linen}.png`, column Large A.
- **A11Y · Adopted criteria and recorded exceptions (2026-10-29; the a11y campaign grades these as contract):** The bar is WCAG 2.2 AA plus these AAA criteria: 2.5.5 Target Size (44px, `--hit`); 2.4.13 Focus Appearance (the T1 ring, `--focus-w` 2px, at least 3:1 against its neighbours); 2.3.3 Animation from Interactions (every tween and fade respects `prefers-reduced-motion`); 2.4.12 Focus Not Obscured (no part of the focused control is hidden by the pinned header, its fades, the dock or a sheet, which means using scroll-padding equal to the pinned heights). Recorded exceptions: K4 number rows (full width, at least 24px tall, not 44px); select options (out of scope per K4); the STACKMATH wordmark (a logo, exempt from 1.4.4, per RF1); the gear's 15px slot while it stays hidden in production (RF1 clause 5). This is the only list; new adoptions and exceptions are added here.
- **Median with 2 futures (R6 Q6), settled:** the engine (`quantile.ts:37`) takes the lower middle value for an even count, and that stays: it's back-end behaviour (Keel, 2026-10-23). The label stays "median". At the default of 1,000 futures the two middle values are neighbours and the gap can't be seen; at tiny counts like 2 the fan means little anyway. Don't compute a different median on the v2 side. This is not a defect.

---

## §2B Other assets on the chart (design locked by user 2026-10-21; NOT scheduled; build only when the engine supports S&P and Inflation)

Don't build this until the engine models S&P and Inflation. Rule 0 holds: no engine or data change comes from this section.

**Reference:** `p3/v55-assets/Idea1-390.png` and `Idea1-1440.png` for the S&P drawing, the shared axis, the legend and the readout. Use `p3/v56-inflation/A-390.png` and `A-1440.png` for the strip's layout, label, axis and fan only. The single sample path in those shots and the bars in `B-*.png` are rejected and must not be built. The data in both sets is EXAMPLE DATA; the source is `chart.js` in each folder.

- **Shared growth axis:** Bitcoin and S&P share the % growth axis: log scale, % change from today (0% at Today).
- **S&P (LOCKED as drawn in v55):** only its p25–p75 band and its median line, in the asset colour (`--path-sp`). It has no other bands and no outlines.
- **Inflation strip:**
  - Inflation gets its own strip at the bottom of the plot, about 20% of the plot height. A rule and the small label "INFLATION % / YR" (Jost 600, 10px, `--text-muted`, in the gap above the strip) separate it from the growth axis.
  - The strip has its own small axis labels, −2%, 8% and 18% in the right margin, and a dotted gridline at 8%. The labels follow the user's range.
  - Inflation is drawn as a Monte Carlo fan with the four-fill band spec (min–max, p1–p99, p5–p95, p25–p75) in `--path-inflation`, with no outlines, plus its median line.
  - The median visibly wobbles around 8% because the walk is ergodic.
  - There is NO single sample path and there are NO bars; the user rejected both.
  - The median line uses a lighter tint of the inflation colour so it reaches at least 4.5:1 against `--surface`. The v56 tint is 12% toward `--text`, rgb(184,112,136), at 4.67:1; the raw wine is 3.94:1.
  - Inflation is weekly: one point per plot point, like every other series.
- **Readout:** lists each visible asset's median and 5–95% band, e.g. "Inflation 7.9% a year (5–12%)". A hidden asset has no row.
- **Visibility:** these assets appear on the background graph and come forward when Models is selected. A hollow square (OFF, §1MP item 5) hides that asset from the chart and the readout.
