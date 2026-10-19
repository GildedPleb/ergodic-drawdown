import type { JSX, KeyboardEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { LabelGlyphs } from "../LabelGlyphs";
import { closedState, placeList, selectKey, type SelectState } from "./logic";
import styles from "./Select.module.css";

/** R7: variant keys and values. */
export const variants = {
  active: ["true", "false"] as const,
  placement: ["down", "up"] as const,
  state: ["on", "off"] as const,
};

export type SelectProps = {
  /** The combobox id; the listbox is `${id}-list`, options `${id}-opt-${i}`. */
  id: string;
  /** Id of the visible text that names the field (a SectionLabel). */
  labelledBy: string;
  /** The back end's names, unchanged (Rule 0). */
  options: readonly string[];
  value: string;
  onChange?: (next: string) => void;
};

/** The list stays inside this box (the sheet's scrolling column or the panel), never over the dock. */
const boundsOf = (el: HTMLElement): DOMRect => {
  for (let p = el.parentElement; p !== null; p = p.parentElement) {
    if (p.hasAttribute("data-select-bounds")) return p.getBoundingClientRect();
    const { overflowY } = getComputedStyle(p);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden")
      return p.getBoundingClientRect();
  }
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
};

/**
 * Certificate Select (V32-BUILD §1L.3): the WAI-ARIA APG select-only combobox. Closed, one field
 * row (square, the fine double rule, the value in Jost, a small caret). Open, a listbox of the same
 * width anchored to it, at most 7 rows before it scrolls, opening upward when there is no room
 * below. Focus stays on the combobox; aria-activedescendant names the active option, which is
 * aria-selected; ■ marks the current value. Option text goes through LabelGlyphs, so the 🟢🔴 walk
 * is SVG, never an emoji font.
 */
export const Select = ({ id, labelledBy, options, value, onChange }: SelectProps): JSX.Element => {
  const selected = options.indexOf(value);
  const [state, setState] = useState<SelectState>(() => closedState(selected));
  const [place, setPlace] = useState({ up: false, maxHeight: 0 });
  const field = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const pick = (i: number): void => {
    setState(closedState(i));
    const next = options[i];
    if (next !== undefined && next !== value) onChange?.(next);
  };

  // Placement is measured when the list opens.
  useLayoutEffect(() => {
    const el = field.current;
    if (!state.open || el === null) return;
    const r = el.getBoundingClientRect();
    const b = boundsOf(el);
    setPlace(placeList(b.bottom - r.bottom, r.top - b.top, r.height, options.length));
  }, [state.open, options.length]);

  // The active option stays in view as it moves.
  useEffect(() => {
    if (!state.open) return;
    list.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-opt-${String(state.active)}`)}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [state.open, state.active, id]);

  // A click outside closes with no change.
  useEffect(() => {
    if (!state.open) return undefined;
    const onDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && root.current?.contains(event.target) === true) return;
      setState(closedState(selected));
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
    };
  }, [state.open, selected]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = selectKey(state, event, options, selected, event.timeStamp);
    if (step.handled) {
      event.preventDefault();
      event.stopPropagation();
    }
    setState(step.state);
    if (step.commit !== undefined) pick(step.commit);
  };

  const rootCls = styles["root"] ?? "select-root";
  const fieldCls = styles["field"] ?? "select-field";
  const valueCls = styles["value"] ?? "select-value";
  const caret = styles["caret"] ?? "select-caret";
  const listCls = styles["list"] ?? "select-list";
  const option = styles["option"] ?? "select-option";
  const mark = styles["mark"] ?? "select-mark";
  const text = styles["text"] ?? "select-text";
  const placement: (typeof variants.placement)[number] = place.up ? "up" : "down";

  return (
    <div ref={root} className={rootCls} data-placement={placement}>
      <div
        ref={field}
        id={id}
        className={fieldCls}
        role="combobox"
        tabIndex={0}
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={state.open}
        aria-controls={`${id}-list`}
        aria-activedescendant={state.open ? `${id}-opt-${String(state.active)}` : undefined}
        onKeyDown={onKeyDown}
        onClick={() => {
          setState(state.open ? closedState(selected) : { ...closedState(selected), open: true });
        }}
        onBlur={() => {
          setState(closedState(selected));
        }}
      >
        <span className={valueCls}>
          <LabelGlyphs text={value} />
        </span>
        <svg className={caret} viewBox="0 0 10 6" focusable="false" aria-hidden="true">
          <path d="M0 0 L10 0 L5 6 Z" />
        </svg>
      </div>
      <ul
        ref={list}
        id={`${id}-list`}
        className={listCls}
        role="listbox"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        hidden={!state.open}
        style={{ "--dyn-list-max": `${String(place.maxHeight)}px` }}
      >
        {options.map((o, i) => {
          const on: (typeof variants.state)[number] = o === value ? "on" : "off";
          const active: (typeof variants.active)[number] = i === state.active ? "true" : "false";
          return (
            <li
              key={o}
              id={`${id}-opt-${String(i)}`}
              aria-selected={i === state.active}
              className={option}
              role="option"
              data-state={on}
              data-active={active}
              onPointerDown={(event) => {
                // Keep focus on the combobox (no blur) while the pointer picks.
                event.preventDefault();
              }}
              onClick={() => {
                pick(i);
              }}
            >
              <span className={mark} aria-hidden="true" />
              <span className={text}>
                <LabelGlyphs text={o} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
