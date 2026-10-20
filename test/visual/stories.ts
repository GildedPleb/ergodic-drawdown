/** Story ids the visual matrix covers (TickToggle is the Phase 0 end-to-end primitive). */
export const TICK_ROW_STORIES = [
  "tick-row/default",
  "tick-row/off",
  "tick-row/on",
  "tick-row/focus",
  "tick-row/disabled",
  "tick-row/long-text",
  "tick-row/linen",
] as const;

/**
 * Form B1 + N5: every TickToggle (tick-row), NumberField, LabelGlyphs, Amount and SectionLabel story plus the models
 * sheet, in both themes, at 390×844 and 1440×900, in Chromium and WebKit
 * (test/v2/story-coverage.test.ts fails if a story is missing here).
 */
export const FIELD_STORIES = [
  // Form N5: the 7 tick-row stories in both themes too.
  "tick-row/default",
  "tick-row/off",
  "tick-row/on",
  "tick-row/focus",
  "tick-row/disabled",
  "tick-row/long-text",
  "tick-row/linen",
  "number-field/default",
  "number-field/focus",
  "number-field/disabled",
  "number-field/invalid",
  "number-field/clamped",
  "number-field/long-text",
  "number-field/emoji-label",
  "number-field/linen",
  "label-glyphs/default",
  "label-glyphs/long-text",
  "label-glyphs/plain-text",
  "label-glyphs/linen",
  "amount/default",
  "amount/linen",
  "amount/tiny",
  "amount/negative",
  "amount/zero",
  "amount/unavailable",
  "amount/fonts-failed",
  "amount/usd",
  "section-label/default",
  "section-label/group",
  "section-label/long-text",
  "section-label/linen",
  "select/default",
  "select/hover",
  "select/focus",
  "select/open",
  "select/long-text",
  "select/linen",
  "models-sheet/default",
  "models-sheet/emoji-walk",
  "models-sheet/linen",
  "models-sheet/editing",
  "models-sheet/cagr",
] as const;

export const FIELD_THEMES = ["dark", "linen"] as const;

export const FIELD_VIEWPORTS = ["390x844", "1440x900"] as const;

/** Form N2: the Models pane also runs in the 200% zoom and 200% OS-text projects. */
export const ZOOM_STORIES = ["models-sheet/default"] as const;
