import type { JSX, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { LabelGlyphs } from "../LabelGlyphs";
import styles from "./RadioList.module.css";

/** R7: variant keys and values. */
export const variants = {
  state: ["on", "off"] as const,
};

export type RadioListProps = {
  /** id of the visible group label (a SectionLabel); the radiogroup is named by it. */
  labelledBy: string;
  options: readonly string[];
  value: string;
  onChange?: (next: string) => void;
};

const NEXT = new Set(["ArrowDown", "ArrowRight"]);
const PREV = new Set(["ArrowUp", "ArrowLeft"]);

/**
 * Certificate radio list (V32-BUILD §1f): one 44px ledger row per option, a 9px square with a 1px
 * --accent border filled when selected, plus weight 600 and the --selected row: never colour
 * alone. Text is Jost so weight 600 is a shipped face (EB Garamond ships 400 only; Form N6:
 * no synthetic weights). Arrow keys move and select; a held arrow previews and commits once, on release (FL-001).
 * Option text is the back end's, drawn through LabelGlyphs (the 🟢🔴 walk is SVG, never emoji).
 */
export const RadioList = ({
  labelledBy,
  options,
  value,
  onChange,
}: RadioListProps): JSX.Element => {
  const [preview, setPreview] = useState(value);
  const rows = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const choose = (next: string): void => {
    setPreview(next);
    if (next !== value) onChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const at = options.indexOf(preview);
    let to = -1;
    if (NEXT.has(event.key)) to = (at + 1) % options.length;
    else if (PREV.has(event.key)) to = (at - 1 + options.length) % options.length;
    else if (event.key === "Home") to = 0;
    else if (event.key === "End") to = options.length - 1;
    if (to < 0) return;
    event.preventDefault();
    setPreview(options[to] ?? preview);
    rows.current[to]?.focus();
  };

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (NEXT.has(event.key) || PREV.has(event.key) || event.key === "Home" || event.key === "End")
      choose(preview);
  };

  const root = styles["root"] ?? "radio-root";
  const row = styles["row"] ?? "radio-row";
  const box = styles["box"] ?? "radio-box";
  const text = styles["text"] ?? "radio-text";

  return (
    <div
      className={root}
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      {options.map((option, i) => {
        const on = option === preview;
        const state: (typeof variants.state)[number] = on ? "on" : "off";
        return (
          <button
            key={option}
            ref={(el) => {
              rows.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={row}
            data-state={state}
            onClick={() => {
              choose(option);
            }}
          >
            <span className={box} aria-hidden="true" />
            <span className={text}>
              <LabelGlyphs text={option} />
            </span>
          </button>
        );
      })}
    </div>
  );
};
