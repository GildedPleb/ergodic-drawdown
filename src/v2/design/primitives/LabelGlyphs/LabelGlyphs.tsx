import type { CSSProperties, JSX } from "react";

import styles from "./LabelGlyphs.module.css";

/** Green / red circle emoji used by the engine walk label "🟢🟢🟢🔴". */
const UP = "\u{1F7E2}";
const DOWN = "\u{1F534}";

export type LabelGlyphsProps = {
  /** Exact string kept in data, accessible name, and copy/paste. */
  text: string;
};

/**
 * Maps known codepoints to filled squares at cap height.
 * The string itself stays exact in a visually hidden span; drawn glyphs are aria-hidden.
 * --walk-up / --walk-down may only be used here.
 */
export const LabelGlyphs = ({ text }: LabelGlyphsProps): JSX.Element => {
  const root = styles["root"] ?? "label-glyphs-root";
  const hidden = styles["visuallyHidden"] ?? "label-glyphs-hidden";
  const glyphs = styles["glyphs"] ?? "label-glyphs-row";
  const dot = styles["dot"] ?? "label-glyphs-dot";

  const style = {
    ["--dyn-glyph-size" as string]: "0.7em",
    ["--dyn-glyph-gap" as string]: "0.05em",
  } satisfies CSSProperties;

  const chars = Array.from(text);
  const mapped = chars.map((ch, i) => {
    if (ch === UP) {
      return <span key={i} className={dot} data-tone="up" aria-hidden="true" />;
    }
    if (ch === DOWN) {
      return <span key={i} className={dot} data-tone="down" aria-hidden="true" />;
    }
    return null;
  });

  const hasMapped = mapped.some((n) => n !== null);

  return (
    <span className={root} style={style}>
      <span className={hidden}>{text}</span>
      {hasMapped ? <span className={glyphs}>{mapped}</span> : null}
    </span>
  );
};
