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

/** Form-control primitives (Keel FAIL fix): each story in both themes at 390×844 and 1440×900. */
export const FIELD_STORIES = [
  "select/default",
  "select/focus",
  "select/invalid",
  "select/emoji-label",
  "number-field/default",
  "number-field/focus",
  "number-field/invalid",
  "number-field/emoji-label",
] as const;

export const FIELD_THEMES = ["dark", "linen"] as const;

export const FIELD_VIEWPORTS = ["390x844", "1440x900"] as const;
