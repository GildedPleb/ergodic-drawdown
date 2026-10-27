import type { JSX, KeyboardEvent, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

import { LabelGlyphs } from "../LabelGlyphs";
import styles from "./AssetRow.module.css";

/** R7: variant keys and values. */
export const variants = {
  /** Absent while closed: header only. */
  state: ["open"] as const,
};

type AssetKey = {
  on: boolean;
  /** The square's accessible name ("Show Bitcoin on chart"). */
  label: string;
  /** Not modelled yet: shows off, never toggles, no hover (aria-disabled, still focusable). */
  inert?: boolean;
  onChange?: (next: boolean) => void;
};

export type AssetRowProps = {
  /** The disclosure button's id; the body is `${id}-body`. */
  id: string;
  /** `data-asset` on the list item. */
  asset: string;
  name: string;
  /** Collapsed only: one italic line under the name; wraps, never truncated. */
  summary: string;
  /** The asset's colour (a `var(--path-…)` token): its square. */
  colour: string;
  open: boolean;
  onToggle: (next: boolean) => void;
  /** The colour square: the asset's chart switch, a separate 44px target. */
  square: AssetKey;
  /** The body (settings, or a stand-in's one line), rendered only while open. */
  children?: ReactNode;
};

/** The nearest ancestor that scrolls vertically (the pane's zone). */
const scrollerOf = (el: HTMLElement): HTMLElement | null => {
  for (let p = el.parentElement; p !== null; p = p.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return p;
  }
  return null;
};

/**
 * Opening scrolls the asset's header to the top of the scroll region (where it pins), as far as
 * the content allows: smooth, or instant under reduced motion.
 */
const headerToTop = (row: HTMLElement): void => {
  const zone = scrollerOf(row);
  if (zone === null) return;
  const top = zone.scrollTop + row.getBoundingClientRect().top - zone.getBoundingClientRect().top;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  zone.scrollTo({ top, behavior: still ? "instant" : "smooth" });
};

/**
 * V32-BUILD §1MP item 4/5: one asset of the ledger, a listitem. The colour square hangs in the
 * gutter and is the asset's chart switch (a toggle button, never opens the row); the name button
 * is the disclosure (name, ▾/▴, and the summary while collapsed). Open: the header pins to the
 * top of the scroll region on the surface, the body shows at once. Esc in the body (unless a
 * control took it) collapses the asset and puts focus back on its header.
 */
export const AssetRow = ({
  id,
  asset,
  name,
  summary,
  colour,
  open,
  onToggle,
  square,
  children,
}: AssetRowProps): JSX.Element => {
  const header = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const was = useRef(open);
  const back = useRef(false);

  useLayoutEffect(() => {
    const el = root.current;
    if (open && !was.current && el !== null) headerToTop(el);
  }, [open]);

  useEffect(() => {
    if (!open && back.current) header.current?.focus();
    back.current = false;
    was.current = open;
  }, [open]);

  const onKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Escape" || !open || event.defaultPrevented) return;
    // Handled: the sheet's own Esc (a document listener) sees defaultPrevented and stays open.
    event.preventDefault();
    back.current = true;
    onToggle(false);
  };

  const rootCls = styles["root"] ?? "asset-root";
  const head = styles["head"] ?? "asset-head";
  const keyCls = styles["key"] ?? "asset-key";
  const toggle = styles["toggle"] ?? "asset-toggle";
  const nameCls = styles["name"] ?? "asset-name";
  const summaryCls = styles["summary"] ?? "asset-summary";
  const chev = styles["chev"] ?? "asset-chev";
  const on = square.inert === true ? false : square.on;
  const state: (typeof variants.state)[number] | undefined = open ? "open" : undefined;

  return (
    <div
      ref={root}
      className={rootCls}
      role="listitem"
      data-asset={asset}
      data-state={state}
      style={{ "--dyn-asset": colour }}
      onKeyDown={onKey}
    >
      <div className={head} data-pin={open ? "" : undefined}>
        <button
          type="button"
          className={keyCls}
          aria-pressed={on}
          aria-disabled={square.inert === true ? true : undefined}
          aria-label={square.label}
          onClick={() => {
            if (square.inert !== true) square.onChange?.(!on);
          }}
        />
        <button
          ref={header}
          type="button"
          id={id}
          className={toggle}
          aria-expanded={open}
          aria-controls={open ? `${id}-body` : undefined}
          onClick={() => {
            back.current = open;
            onToggle(!open);
          }}
        >
          <span className={nameCls}>
            {name}
            <span className={chev} aria-hidden="true" />
          </span>
          {open ? null : (
            <span className={summaryCls}>
              <LabelGlyphs text={summary} />
            </span>
          )}
        </button>
      </div>
      {open ? <div id={`${id}-body`}>{children}</div> : null}
    </div>
  );
};
