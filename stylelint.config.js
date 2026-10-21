/**
 * Core stylelint rules for ADR-002 R3, R4, R6, R8 and R9 (no plugins). Runs in the 1 s gate through
 * stylelint's Node API (test/v2-css/stylelint.test.ts). Script-only rules live in scripts/v2/css/rules.ts.
 */
/** A token, or a local `--_*` (the gate then requires it to be declared in the same file, as R4 does). */
const TOKEN = String.raw`var\(--_?[a-z0-9-]+\)`;
const LEN_ATOM = String.raw`(?:${TOKEN}|0|1px|100%|auto)`;
/** R4 lengths: tokens or the 0 / 1px / 100% / auto allowlist, no calc(), no var() fallback. */
const LENGTH = new RegExp(String.raw`^${LEN_ATOM}(?:\s+${LEN_ATOM})*$`);
const COLOR = new RegExp(
  String.raw`^(?:${TOKEN}|currentColor|currentcolor|transparent|inherit|none)$`,
);
const LINE = new RegExp(
  String.raw`^(?:0|none|(?:${TOKEN}|1px)\s+(?:solid|double|dashed|dotted)\s+(?:${TOKEN}|currentColor|transparent))$`,
);
const MOTION_ITEM = String.raw`(?:transform|opacity)\s+var\(--dur-[a-z0-9-]+\)(?:\s+var\(--(?:ease|dur)-[a-z0-9-]+\))*`;
const TRANSITION = new RegExp(String.raw`^(?:none|${MOTION_ITEM}(?:\s*,\s*${MOTION_ITEM})*)$`);
const ANIMATION = new RegExp(
  String.raw`^(?:none|[a-z][\w-]*\s+var\(--dur-[a-z0-9-]+\)(?:\s+(?:var\(--(?:ease|dur)-[a-z0-9-]+\)|both|forwards|backwards|infinite|alternate|\d+))*)$`,
);

const PHYSICAL = [
  "/^(margin|padding|border)-(left|right|top|bottom)/",
  "left",
  "right",
  "top",
  "bottom",
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
];
const SHADOWS = ["box-shadow", "text-shadow"];

/** R4 lengths, exported so the suite can pin the gate and the R4 script check to one answer. */
export const LENGTH_VALUE = LENGTH;

/** @type {import("stylelint").Config} */
export default {
  defaultSeverity: "error",
  rules: {
    // R3
    "selector-pseudo-class-disallowed-list": ["global"],
    "selector-max-id": 0,
    "declaration-no-important": true,
    "selector-max-compound-selectors": 2,
    // R4
    "declaration-property-value-allowed-list": {
      "/^(padding|inset|gap|row-gap|column-gap|inline-size|block-size|min-inline-size|max-inline-size|min-block-size|max-block-size|flex-basis|letter-spacing|word-spacing|text-indent|outline-offset|outline-width|border-width)/":
        [LENGTH],
      "/^border-(block|inline)(-start|-end)?-width$/": [LENGTH],
      "font-size": [new RegExp(String.raw`^(?:${TOKEN}|inherit)$`)],
      "font-family": [/^(?:var\(--f-[a-z0-9-]+\)|inherit)$/],
      "/^(color|background|background-color|border-color|outline-color|fill|stroke|caret-color|accent-color|text-decoration-color)$/":
        [COLOR],
      "/^border-(block|inline)(-start|-end)?-color$/": [COLOR],
      "/^border(-block|-inline)?(-start|-end)?$/": [LINE],
      outline: [LINE],
      "z-index": [/^var\(--z-[a-z0-9-]+\)$/],
      "/^(transition|animation)-(duration|delay)$/": [/^(?:var\(--dur-[a-z0-9-]+\)|0s|0ms)$/],
      // R9
      "transition-property": [/^(?:transform|opacity)(?:\s*,\s*(?:transform|opacity))*$/],
      transition: [TRANSITION],
      animation: [ANIMATION],
      "/^border(-[a-z]+)*-radius$/": ["var(--radius-0)", "0"],
    },
    // R4 shadows, R6 margin, R8 logical properties
    "property-disallowed-list": ["/^margin/", ...SHADOWS, ...PHYSICAL],
    // R8: viewport media only in app/shell; the preference features are allowed everywhere, and
    // so are the input ones (§1O: hover styles live inside (hover: hover) and (pointer: fine)).
    "media-feature-name-allowed-list": [
      "prefers-reduced-motion",
      "prefers-contrast",
      "forced-colors",
      "hover",
      "pointer",
    ],
  },
  overrides: [
    {
      // Token files define the raw values (@font-face names, palette); R5 tiers are checked by script.
      files: ["**/src/v2/design/tokens/**/*.css", "**/src/v2/design/fonts/fonts.css"],
      rules: { "declaration-property-value-allowed-list": null },
    },
    {
      // R3: no element selectors in modules
      files: ["**/*.module.css"],
      rules: { "selector-max-type": 0 },
    },
    {
      // The reset layer zeroes UA margins; components never declare margin.
      files: ["**/src/v2/design/base/base.css"],
      rules: { "property-disallowed-list": [...SHADOWS, ...PHYSICAL] },
    },
    {
      files: ["**/src/v2/app/shell/**/*.css"],
      rules: { "media-feature-name-allowed-list": null },
    },
  ],
};
