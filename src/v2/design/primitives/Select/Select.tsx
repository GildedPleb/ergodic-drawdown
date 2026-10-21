import type { FocusEvent, JSX, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs } from "../LabelGlyphs";
import { listKey, REVEAL } from "./logic";
import styles from "./Select.module.css";

/** R7: variant keys and values. */
export const variants = {
  /** Open, in two columns (the desktop walk list). */
  cols: ["2"] as const,
  /** The current pick while the list is open (--accent name, gold ✓). */
  state: ["pick"] as const,
};

export type SelectProps = {
  /** The listbox id; option i is `${id}-opt-${i}`. */
  id: string;
  /** Id of the visible text that names the list, or the name itself. */
  labelledBy?: string;
  label?: string;
  /** The back end's names, unchanged (Rule 0), in engine order. */
  options: readonly string[];
  value: string;
  /** Each option's one-line description. */
  describe: (option: string) => string;
  onChange?: (next: string) => void;
  onOpenChange?: (open: boolean) => void;
  /** Open in two columns (desktop, ≥64rem). */
  columns?: boolean;
};

/**
 * V32-BUILD §1MP item 6, the in-place selector (a listbox; §1U: it opens in place, so it is never
 * clipped). Closed, only the pick shows: its engine name in SM Cormorant, a quiet ▾ at the right,
 * its description below. Pressing it opens every choice in engine order, each with its
 * description; the pick's name turns --accent with a gold ✓. Pressing any row picks it and closes
 * the list; Esc closes it with no change. Focus always comes back to the pick. Option text goes
 * through LabelGlyphs, so the 🟢🔴 walk is SVG, never an emoji font.
 */
export const Select = ({
  id,
  labelledBy,
  label,
  options,
  value,
  describe,
  onChange,
  onOpenChange,
  columns = false,
}: SelectProps): JSX.Element => {
  const selected = Math.max(0, options.indexOf(value));
  const [open, setOpenState] = useState(false);
  const [active, setActive] = useState(selected);
  const root = useRef<HTMLDivElement>(null);
  const focusTo = useRef<number | null>(null);

  const setOpen = (next: boolean, focus: number): void => {
    focusTo.current = focus;
    setActive(focus);
    if (next !== open) {
      setOpenState(next);
      onOpenChange?.(next);
    }
  };

  useEffect(() => {
    const i = focusTo.current;
    focusTo.current = null;
    if (i === null) return;
    root.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-opt-${String(i)}`)}`)?.focus();
  });

  // Form §1MP ruling 5: opened in place, the list asks its scroller to show all of it (PaneScroll
  // listens; elsewhere the event goes unheard). Nothing is locked: the pane and sheet still move.
  useEffect(() => {
    if (open) root.current?.dispatchEvent(new CustomEvent(REVEAL, { bubbles: true }));
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = listKey(open, active, options.length, event.key);
    if (!step.handled) return;
    // Esc closes only the list: the asset and the sheet never see it.
    event.preventDefault();
    event.stopPropagation();
    setOpen(step.open, step.open ? step.active : selected);
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
    const to = event.relatedTarget;
    if (open && !(to instanceof Node && root.current?.contains(to) === true)) {
      setOpenState(false);
      onOpenChange?.(false);
    }
  };

  const rootCls = styles["root"] ?? "select-root";
  const opt = styles["opt"] ?? "select-opt";
  const name = styles["name"] ?? "select-name";
  const end = styles["end"] ?? "select-end";
  const check = styles["check"] ?? "select-check";
  const desc = styles["desc"] ?? "select-desc";
  const cols: (typeof variants.cols)[number] | undefined = open && columns ? "2" : undefined;

  return (
    <div
      ref={root}
      id={id}
      className={rootCls}
      role="listbox"
      aria-labelledby={labelledBy}
      aria-label={label}
      data-cols={cols}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      {options.map((o, i) => {
        const pick = i === selected;
        if (!open && !pick) return null;
        const mark: (typeof variants.state)[number] | undefined = open && pick ? "pick" : undefined;
        return (
          <button
            key={o}
            type="button"
            id={`${id}-opt-${String(i)}`}
            className={opt}
            role="option"
            aria-selected={pick}
            tabIndex={!open || i === active ? 0 : -1}
            data-state={mark}
            onClick={() => {
              if (!open) {
                setOpen(true, selected);
                return;
              }
              setOpen(false, i);
              if (!pick) onChange?.(o);
            }}
          >
            <span className={name}>
              <LabelGlyphs text={o} />
            </span>
            {open && !pick ? null : open ? (
              <span className={check} aria-hidden="true">
                <Icon name="check" />
              </span>
            ) : (
              <span className={end} aria-hidden="true" />
            )}
            <span className={desc}>{describe(o)}</span>
          </button>
        );
      })}
    </div>
  );
};
