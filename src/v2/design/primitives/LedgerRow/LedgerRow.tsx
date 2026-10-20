import type { JSX, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";

import { LabelGlyphs } from "../LabelGlyphs";
import styles from "./LedgerRow.module.css";

/** R7: variant keys and values. */
export const variants = {
  open: ["true", "false"] as const,
};

export type LedgerRowProps = {
  /** The back end's label, verbatim. */
  label: string;
  /** The value as shown (Jost tabular, right). */
  value: string;
  open: boolean;
  onToggle: (next: boolean) => void;
  /** The in-place editor: a label-hidden NumberField (the value cell), plus a Slider if any. */
  children?: ReactNode;
  id: string;
};

/**
 * Certificate ledger row (V32-BUILD §1f): the label in --t-row on the left, the value in
 * --t-value tabular on the right, a --hairline below, at least --hit tall. §1N edits in place:
 * pressing the row turns the value cell itself into the input (same spot, same height, the text
 * cursor in it); there is no second box and no duplicate value. Messages, the hint and a slider
 * sit under the row. Esc closes it and returns focus to the row.
 */
export const LedgerRow = ({
  label,
  value,
  open,
  onToggle,
  children,
  id,
}: LedgerRowProps): JSX.Element => {
  const button = useRef<HTMLButtonElement>(null);
  const cell = useRef<HTMLDivElement>(null);
  const was = useRef(open);
  const back = useRef(false);
  const editorId = `${id}-editor`;

  // Opened by the person: the cursor goes into the value cell. Closed by Esc: back to the row.
  useEffect(() => {
    if (open && !was.current) cell.current?.querySelector("input")?.focus();
    if (!open && back.current) button.current?.focus();
    back.current = false;
    was.current = open;
  }, [open]);

  const onEditorKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Escape") return;
    // Handled: the sheet's Esc (a document listener) checks defaultPrevented and stays open.
    event.preventDefault();
    event.stopPropagation();
    back.current = true;
    onToggle(false);
  };

  const root = styles["root"] ?? "ledger-root";
  const row = styles["row"] ?? "ledger-row";
  const labelCls = styles["label"] ?? "ledger-label";
  const valueCls = styles["value"] ?? "ledger-value";
  const labelEl = (
    <span className={labelCls}>
      <LabelGlyphs text={label} />
    </span>
  );

  return (
    <div className={root} data-open={open ? "true" : "false"}>
      {open ? (
        <div
          ref={cell}
          className={row}
          id={editorId}
          role="group"
          aria-label={label}
          onKeyDown={onEditorKey}
        >
          {labelEl}
          {children}
        </div>
      ) : (
        <button
          ref={button}
          type="button"
          id={id}
          className={row}
          onClick={() => {
            onToggle(true);
          }}
        >
          {labelEl}
          <span className={valueCls}>{value}</span>
        </button>
      )}
    </div>
  );
};
