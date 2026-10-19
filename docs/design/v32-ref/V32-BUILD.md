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
  - `modelsPaneSchema` must keep deep-equalling `test/v2/old-ui-models.snapshot.json` (G12).
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
| Sheet (half) | y 775.9, h 68.1. `margin-top:6px`, padding `8px 12px 12px` | x 48, y 840, 1344×60. Padding `8px clamp(16px,2.2vw,32px) clamp(14px,1.6vw,22px)` |
| Sheet (open) | chart 373.1, sheet 388.2 | chart 327.1, sheet 450 = `min(50vh,560px)` |
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
  - Fill p5–p95, then p25–p75, in `--path-btc-price`. Use the alphas `--fan-focus-outer` and `--fan-focus-inner` (v32 used .10 and .16; see Gap 4).
  - Then a 1.5px `--surface` casing (`--line-casing`) under a median of `--line-median` (2px) in `--path-btc-price`.
- **End label:** "₿ price · $1.2M · $400k–3.1M" (the median, then p5–p95).
  - `--t-chart-serif` italic in `--path-btc-price`, right-aligned at `R−4, ly(p50_end)−8`. Use the $ range format from Gap 5.
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
| Simulation | `samples`: "Statistical Sample Count (1k-10k):" | always | NumberField | accept 0–10,000, int, default 1,000, empty → 1,000 |
| Simulation | `epochCount`: "Epoch Count (1-30):" | always | NumberField + slider | accept 1–100, int, default 10, empty → none (the label/accept mismatch stands; Gap 10) |

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
  - `--tk-box` 16px; the row is `--tk-h` 44 with `--tk-pad-x` 14 on each side and `--tk-gap` 12.
  - **On:** a solid `--accent` square with ✓ (SVG) and "ON" in Jost caps `--accent`.
  - **Off:** an empty double-ruled square with "OFF" in `--text-muted`.
  - The selected row gets the `--selected` fill. Focus is a 2px frame at offset 0.
- **Radio list:** 9px squares with a 1px `--accent` border, filled when selected. Selection is shown three ways: the fill, weight 600 and the `--selected` row. It never relies on colour alone.
- **Choosing a model or walk:** the chart redraws when the engine returns. Nothing else moves.

### 1g · NumberField gate (Probe M3 / FL-001): applies to EVERY number field above
1. **Clamp with a visible message.**
   - On commit, a value outside the back end's accepted range is set to the nearest bound. The bounds are the `accept` range, or the current model's `rangeMin`/`rangeMax`, or the 1.01 floor; with an `Infinity` bound, only the finite side clamps.
   - The field shows the clamped value and an inline message under it, for example "Volatility goes from 0 to 1. We used 1." The message is tied to the field with `aria-describedby` and announced politely.
   - The message clears on the next valid commit. The engine only ever receives in-range values.
2. **Commit once, when a held key is released.**
   - Holding ↑/↓, PgUp/PgDn, or the slider arrows steps the visible draft only. The value commits once, on `keyup` (as `settle.ts` / `NumberField.tsx` do now).
   - Enter and blur also commit. Typing never commits per keystroke.
3. **Wheel only when focused.** The wheel does nothing unless the field has focus. An unfocused field under the pointer must never change, and the page scrolls instead.
4. **Defined invalid state.** This is for input that can't be parsed, such as an empty int field with no `emptyValue`, or "1e" or "abc".
   - The field shows `--invalid` text, a 3px (`--rule-strong`) border in the text colour (`--invalid`), a ⚠ SVG icon and a message.
   - Message pattern: cause → what to enter → reassurance, for example "Epochs take a whole number from 1 to 100. Your last value, 10, is still in use."
   - The last valid value stays in effect. `aria-invalid="true"`.
   - **Never orange or red.**

### 1h · States
| Area | States |
|---|---|
| Chart | ready; **empty** (engine not yet returned): frame, axes, Today band and caption drawn, no bands and no headline number, no spinner; recomputing: the previous bands stay until the new result swaps in, no animation required; linen theme |
| Dock | Models selected (the only state) |
| Sheet | half, open; on desktop always open in column 1 |
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
1. G12 snapshot parity passes. No old-UI markup or CSS remains in `src/v2`.
2. At 390×844, 1440×900 and 844×390 (panel closed and open), the chart box and sheet match the 1a and 1e tables to within 1px.
3. The dock baseline is within ±1px, and the MODELS x-position is identical with the hidden slots present.
4. A one-minute manual pass on each number field covers clamp + message, a held ↑ committing once, the wheel without focus doing nothing, and "abc" giving the invalid state with no orange or red.
5. Fonts are SM only; no `\d\s?₿`; axe reports 0 violations in both themes; no horizontal scroll at 195px.

---

## Later slices (one line each)
2. **Plans:** the drawdown layer (the paid-in-bitcoin fan, the paid-in-dollars line, the rough-start band, the danger floor, the triangle markers and the stack handle), the PLANS tab shown, the depth swap Models ↔ Plans (transform and opacity, no blur), and opening on Plans.
3. **Stats:** the STATS tab and pane, which reads the drawdown.
4. **Search 🔍 and Settings ⚙:** shown and working, including Panel position (Auto · Bottom · Right · Left).
5. **Chart gestures:** scrub readout, stack drag, Today drag and the ⚠ bubble.

## Gaps and conflicts (Form's default in bold)
1. **The v32 "Models" view was a background layer,** with a whisper and fixed illustrative data. It never had its own front-layer axes. The front-layer geometry in 1b combines the v32 frame with `drawWorld()`.
2. **Log-axis domain:** v32 fixes it at $30k–$30M. Real 40-year model output can exceed that. **Fit the domain to decades.**
3. **"Today band"** isn't the name of any v32 element. **I read it as the Today line plus the time bar,** with years instead of ages, since a model has no age. The old app also showed 3 years of history before today. **There's no history in this slice; today is the left edge, as in v32.**
4. **Fan alphas:** v32 used .10/.16, while the tokens give `--fan-focus-outer/inner` .08/.12 dark and .10/.14 linen. **Use the tokens.**
5. **$ range format:** this is the first screen that needs one, and we said we'd add it when a screen did. **Use `$400k–3.1M`, by analogy with `₿0.4–0.7`: one prefix and an en dash.** Forge adds it to `money.ts` with tests.
6. **Shadow:** v32 as rendered has none (v25 sets `box-shadow:none`). The tokens allow `--shadow-sheet`, but `clip-path` would clip it anyway. **None in this slice.**
7. **Copy that needs the user's OK:** the headline and kicker (1c), the h1 "Bitcoin’s price", and the section headings "Price model / How prices move / Simulation". The first two headings come from story 189; "Simulation" is new.
8. **Default pane:** the locked default is Plans, but this slice can only open on Models. **That's temporary.**
9. **The bevelled left edge** of the right panel was never mocked: `dock/app.html` hides the bevel and draws a 1px rule. The polygon in 1e is derived.
10. **Epoch limits:** the label says "Epoch Count (1-30)", but the back end accepts 1–100. Samples accept 0. **Clamp to what the back end accepts (Rule 0).** The label mismatch is the user's to rule on, if they care.
11. **Clamping versus the old UI:** main ignored or kept out-of-range input. Probe's gate requires clamping with a message. **Clamping is front-end behaviour, so it's allowed;** the ranges themselves are unchanged.
12. **"Certificate Direction A"** isn't named in any source. **I took it to be v37 `d0` Certificate, as locked in `v38/STYLE.md`.** The 3–5px focus offset there is superseded by 2px.
13. **⚙ hit area:** it measures 19×23 in v32. That doesn't matter now, because it's hidden. Pad it to 44 when it ships.
