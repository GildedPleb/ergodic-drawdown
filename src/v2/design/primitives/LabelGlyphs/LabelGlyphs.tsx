import type { CSSProperties, JSX } from "react";

import styles from "./LabelGlyphs.module.css";

/** Green / red circle emoji used by the engine walk label "🟢🟢🟢🔴". */
const UP = "\u{1F7E2}";
const DOWN = "\u{1F534}";

/** R7: variant keys and values. */
export const variants = {
  tone: ["up", "down"] as const,
};

export type LabelGlyphsProps = {
  /** Exact string kept in data, accessible name, and copy/paste. */
  text: string;
};

/**
 * Maps known codepoints to filled squares at cap height; other characters render as plain text.
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
    ["--dyn-glyph-gap" as string]: "0.2em",
  } satisfies CSSProperties;

  // Mapped codepoints draw as glyphs; any other run stays as text so mixed labels still read.
  const parts: JSX.Element[] = [];
  let run = "";
  const flush = (): void => {
    if (run.length > 0) parts.push(<span key={`t${parts.length}`}>{run}</span>);
    run = "";
  };
  for (const ch of Array.from(text)) {
    const tone = ch === UP ? "up" : ch === DOWN ? "down" : undefined;
    if (tone === undefined) {
      run += ch;
      continue;
    }
    flush();
    parts.push(<span key={`g${parts.length}`} className={dot} data-tone={tone} />);
  }
  flush();

  return (
    <span className={root} style={style}>
      <span className={hidden}>{text}</span>
      <span className={glyphs} aria-hidden="true">
        {parts}
      </span>
    </span>
  );
};
