import type { JSX, KeyboardEvent, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { LabelGlyphs } from "../LabelGlyphs";
import { closedState, listPlace, lockWhileOpen, selectKey, type SelectState } from "./logic";
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
  /**
   * §1N: the fields that exist only because of this choice. They hang in the Select's tray, a
   * group named `trayLabel` that the combobox controls. None (or null): no tray is drawn.
   */
  tray?: ReactNode;
  trayLabel?: string;
};

/** §1N: the tray's contents cross-fade when the choice changes (instant under reduced motion). */
const TRAY_FADE_MS = 150;

type Place = { up: boolean; maxHeight: number; x: number; y: number; w: number };

/**
 * Certificate Select (V32-BUILD §1L.3): the WAI-ARIA APG select-only combobox. Closed, one field
 * row (square, the fine double rule, the value in Jost, a small caret). Open, a listbox of the same
 * width in the top layer (§1U: a popover, so no scroll box clips it), flush to the field and
 * sharing its frame, every row shown, below if it fits, else above. Focus stays on the combobox; aria-activedescendant names the active option, which is
 * aria-selected; ■ marks the current value. Option text goes through LabelGlyphs, so the 🟢🔴 walk
 * is SVG, never an emoji font.
 */
export const Select = ({
  id,
  labelledBy,
  options,
  value,
  onChange,
  tray,
  trayLabel,
}: SelectProps): JSX.Element => {
  const selected = options.indexOf(value);
  const [state, setState] = useState<SelectState>(() => closedState(selected));
  const [place, setPlace] = useState<Place>({ up: false, maxHeight: 0, x: 0, y: 0, w: 0 });
  const field = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const shown = useRef(value);
  const hasTray = tray !== undefined && tray !== null && tray !== false;
  const trayId = `${id}-tray`;

  // A new choice swaps the tray's contents in place, with a short cross-fade.
  useLayoutEffect(() => {
    if (shown.current === value) return;
    shown.current = value;
    const el = trayRef.current;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (el === null || still || typeof el.animate !== "function") return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: TRAY_FADE_MS,
      easing: "ease-out",
    });
  }, [value]);

  const pick = (i: number): void => {
    setState(closedState(i));
    const next = options[i];
    if (next !== undefined && next !== value) onChange?.(next);
  };

  // §1U: the list opens in the top layer, placed against the field in the viewport.
  useLayoutEffect(() => {
    const el = field.current;
    const ul = list.current;
    if (!state.open || el === null || ul === null) return undefined;
    if (typeof ul.showPopover === "function") ul.showPopover();
    const r = el.getBoundingClientRect();
    // Rows measured at the field's width, unclipped, before the placement renders.
    ul.style.setProperty("--dyn-list-w", `${String(r.width)}px`);
    ul.style.setProperty("--dyn-list-max", "none");
    const row = ul.querySelector("li")?.getBoundingClientRect().height ?? r.height;
    setPlace(
      listPlace(r, window.innerHeight, row, options.length, ul.offsetHeight - ul.clientHeight),
    );
    return () => {
      if (typeof ul.hidePopover === "function" && ul.matches(":popover-open")) ul.hidePopover();
    };
  }, [state.open, options.length]);

  // While open the sheet doesn't scroll: a wheel or touch-move outside the list, any scroll
  // outside it, or a resize closes it with no change (a sheet drag starts with a pointerdown).
  useEffect(() => {
    if (!state.open) return undefined;
    return lockWhileOpen(
      document,
      window,
      (t) => t instanceof Node && list.current?.contains(t) === true,
      () => {
        setState(closedState(selected));
      },
    );
  }, [state.open, selected]);

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

  const trayCls = styles["tray"] ?? "select-tray";
  const select = (
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
        aria-controls={hasTray ? `${id}-list ${trayId}` : `${id}-list`}
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
        popover="manual"
        hidden={!state.open}
        style={{
          "--dyn-list-max": `${String(place.maxHeight)}px`,
          "--dyn-list-x": `${String(place.x)}px`,
          "--dyn-list-y": `${String(place.y)}px`,
          "--dyn-list-w": `${String(place.w)}px`,
        }}
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
  if (!hasTray) return select;
  // One unit: the Select, and its tray hanging from the frame with no gap.
  return (
    <div>
      {select}
      <div ref={trayRef} id={trayId} className={trayCls} role="group" aria-label={trayLabel}>
        {tray}
      </div>
    </div>
  );
};
