import type { CSSProperties, JSX } from "react";

import styles from "./LabelGlyphs.module.css";

/** Green / red circle emoji used by the engine walk label "🟢🟢🟢🔴". */
const UP = "\u{1F7E2}";
const DOWN = "\u{1F534}";

/** Codepoints LabelGlyphs draws as SVG instead of a font glyph. */
export const GLYPH_MAP: ReadonlyMap<string, "up" | "down"> = new Map([
  [UP, "up"],
  [DOWN, "down"],
]);

/** R7: variant keys and values. */
export const variants = {
  tone: ["up", "down"] as const,
};

export type LabelGlyphsProps = {
  /** Exact string kept in data and in the accessible name. */
  text: string;
};

/**
 * Maps known codepoints to filled SVG circles at cap height, spaced like letters; every other
 * character renders as plain text. A label without mapped codepoints is plain text. A label with
 * them is one role="img" whose accessible name is the exact string, so the emoji never reaches a
 * text node (no emoji font, the font check stays strict). --walk-up / --walk-down only live here.
 */
export const LabelGlyphs = ({ text }: LabelGlyphsProps): JSX.Element => {
  const root = styles["root"] ?? "label-glyphs-root";
  const dot = styles["dot"] ?? "label-glyphs-dot";

  const chars = Array.from(text);
  if (!chars.some((ch) => GLYPH_MAP.has(ch))) return <>{text}</>;

  const style = {
    ["--dyn-glyph-size" as string]: "0.7em",
    ["--dyn-glyph-gap" as string]: "0.12em",
  } satisfies CSSProperties;

  const parts: JSX.Element[] = [];
  let run = "";
  const flush = (): void => {
    if (run.length > 0) parts.push(<span key={`t${parts.length}`}>{run}</span>);
    run = "";
  };
  for (const ch of chars) {
    const tone = GLYPH_MAP.get(ch);
    if (tone === undefined) {
      run += ch;
      continue;
    }
    flush();
    parts.push(
      <svg
        key={`g${parts.length}`}
        className={dot}
        data-tone={tone}
        viewBox="0 0 10 10"
        focusable="false"
        aria-hidden="true"
      >
        <circle cx="5" cy="5" r="5" />
      </svg>,
    );
  }
  flush();

  return (
    <span className={root} style={style} role="img" aria-label={text} data-text={text}>
      {parts}
    </span>
  );
};
