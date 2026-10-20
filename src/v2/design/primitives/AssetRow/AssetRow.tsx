import type { JSX, KeyboardEvent, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs } from "../LabelGlyphs";
import { TickToggle } from "../TickToggle";
import styles from "./AssetRow.module.css";

/** R7: variant keys and values. */
export const variants = {
  /** A modelled asset (its colour mark, a tick box); absent for a stand-in (the neutral mark). */
  kind: ["supported"] as const,
  /** Absent at rest (normal --text); "dim" while another row is open (§1V). */
  state: ["open", "dim"] as const,
  /** §1Y: set by the pane's scroll listener while the open header is stuck (not rendered). */
  stuck: ["true"] as const,
};

/** §1M: the row's body opens over this long (instant under reduced motion). */
const OPEN_MS = 200;

export type AssetRowProps = {
  /** The disclosure button's id; the body is `${id}-body`. */
  id: string;
  /** `data-asset` on the list item. */
  asset: string;
  /** The header's name; while open, `openName` ("Bitcoin · price model") when given. */
  name: string;
  openName?: string | undefined;
  /** One line under the name: the settings in short, or "Not yet modelled". */
  summary: string;
  open: boolean;
  /** Another row is open: this one falls back to muted text (§1V). */
  dim: boolean;
  onToggle: (next: boolean) => void;
  /** Modelled assets: the ON/OFF ledger tick box, a separate 44px target; none for stand-ins. */
  tick?: { on: boolean; label: string; onChange: (next: boolean) => void } | undefined;
  /** The body: the settings, or a stand-in's one line. Rendered only while open. */
  children?: ReactNode;
};

const reduced = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Certificate ledger entry (V32-BUILD §1M, amended by §1V), a listitem (a div: no list reset). The header is a
 * disclosure button: colour mark, name in Jost, a one-line italic summary, ▾/▴; at the right
 * the ON/OFF tick box for a modelled asset (never expands the row). Open: ■ before the name, the
 * --hover fill, the double rule round header and body; the body opens in place (200ms) and
 * scrolls into view. Closed shows nothing below the header. Esc, or the header again, closes it
 * and returns focus to the header.
 */
export const AssetRow = ({
  id,
  asset,
  name,
  openName,
  summary,
  open,
  dim,
  onToggle,
  tick,
  children,
}: AssetRowProps): JSX.Element => {
  const header = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const was = useRef(open);
  const back = useRef(false);

  useLayoutEffect(() => {
    const el = body.current;
    if (!open || was.current || el === null) return;
    el.scrollIntoView({ block: "nearest" });
    if (reduced() || typeof el.animate !== "function") return;
    el.animate(
      [
        { blockSize: "0px", overflow: "hidden" },
        { blockSize: `${String(el.offsetHeight)}px`, overflow: "hidden" },
      ],
      { duration: OPEN_MS, easing: "ease-out" },
    );
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

  const root = styles["root"] ?? "asset-root";
  const head = styles["head"] ?? "asset-head";
  const markCls = styles["mark"] ?? "asset-mark";
  const toggle = styles["toggle"] ?? "asset-toggle";
  const text = styles["text"] ?? "asset-text";
  const nameCls = styles["name"] ?? "asset-name";
  const summaryCls = styles["summary"] ?? "asset-summary";
  const bodyCls = styles["body"] ?? "asset-body";
  const sel = styles["sel"] ?? "asset-sel";
  const kind: (typeof variants.kind)[number] | undefined =
    tick === undefined ? undefined : "supported";
  const rest: (typeof variants.state)[number] | undefined = dim ? "dim" : undefined;
  const state: (typeof variants.state)[number] | undefined = open ? "open" : rest;

  return (
    <div
      className={root}
      role="listitem"
      data-asset={asset}
      data-kind={kind}
      data-state={state}
      onKeyDown={onKey}
    >
      <div className={head}>
        <button
          ref={header}
          type="button"
          id={id}
          className={toggle}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => {
            back.current = open;
            onToggle(!open);
          }}
        >
          <span className={markCls} aria-hidden="true" />
          {/* §1V: ■, the selected marker, before the name while open (a square, not a glyph). */}
          {open ? <span className={sel} aria-hidden="true" /> : null}
          <span className={text}>
            <span className={nameCls}>{open ? (openName ?? name) : name}</span>
            <span className={summaryCls}>
              <LabelGlyphs text={summary} />
            </span>
          </span>
          <Icon name="chevron" />
        </button>
        {tick === undefined ? null : (
          <TickToggle label={tick.label} labelHidden checked={tick.on} onChange={tick.onChange} />
        )}
      </div>
      {open ? (
        <div ref={body} className={bodyCls} id={`${id}-body`}>
          {children}
        </div>
      ) : null}
    </div>
  );
};
