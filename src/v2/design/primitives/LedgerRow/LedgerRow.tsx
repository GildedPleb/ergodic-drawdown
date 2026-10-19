import type { JSX, KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";

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
  /** The in-place editor (a NumberField, plus a Slider when the bounds are finite). */
  children?: ReactNode;
  id: string;
};

/**
 * Certificate ledger row (V32-BUILD §1f): the label in --t-row on the left, the value in
 * --t-value tabular on the right, a --hairline below, --row-pad, at least --hit tall. Tapping the
 * row opens its editor in place inside a --rule-double --accent frame on --selected; tapping the
 * row again or Esc closes it and returns focus to the row.
 */
export const LedgerRow = ({
  label,
  value,
  open,
  onToggle,
  children,
  id,
}: LedgerRowProps): JSX.Element => {
  const row = useRef<HTMLButtonElement>(null);
  const editorId = `${id}-editor`;

  const onEditorKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onToggle(false);
    row.current?.focus();
  };

  const root = styles["root"] ?? "ledger-root";
  const button = styles["row"] ?? "ledger-row";
  const labelCls = styles["label"] ?? "ledger-label";
  const valueCls = styles["value"] ?? "ledger-value";
  const editor = styles["editor"] ?? "ledger-editor";
  const editorElement = (
    <div className={editor} id={editorId} role="group" aria-label={label} onKeyDown={onEditorKey}>
      {children}
    </div>
  );

  return (
    <div className={root} data-open={open ? "true" : "false"}>
      <button
        ref={row}
        type="button"
        id={id}
        className={button}
        aria-expanded={open}
        aria-controls={editorId}
        onClick={() => {
          onToggle(!open);
        }}
      >
        <span className={labelCls}>
          <LabelGlyphs text={label} />
        </span>
        <span className={valueCls}>{value}</span>
      </button>
      {open ? editorElement : null}
    </div>
  );
};
