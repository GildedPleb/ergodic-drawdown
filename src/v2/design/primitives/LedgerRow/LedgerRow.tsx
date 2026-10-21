import type { JSX, ReactNode } from "react";

import { LabelGlyphs } from "../LabelGlyphs";
import styles from "./LedgerRow.module.css";

/** R7: variant keys and values. */
export const variants = {
  /** "pair": the label shares its line with a pair of 44px toggles that overhang it (Clamp). */
  kind: ["pair"] as const,
};

export type LedgerRowProps = {
  /** The back end's label, verbatim. */
  label: string;
  id: string;
  /** The value cell's input id: the label focuses it. None: the label is plain text. */
  htmlFor?: string;
  /** The right-hand cell: a label-hidden NumberField, a value, or a pair of toggles. */
  value?: ReactNode;
  /** One italic line under the label, across the row. */
  description?: string | undefined;
  /** Lines after the description, the full text-column width (a slider, the colour chips). */
  children?: ReactNode;
  kind?: (typeof variants.kind)[number];
  /** Defaults to a group named by the label. */
  role?: "group" | "radiogroup";
};

/**
 * V32-BUILD §1MP item 7, a setting row: the label in EB Garamond --t-row on the text column, the
 * value right-aligned (always a live field, §1P), the description 1px under the label in italic
 * --text-muted, then a slider on the next line. --s-2 above and below; at least --hit tall; no
 * hairline.
 */
export const LedgerRow = ({
  label,
  id,
  htmlFor,
  value,
  description,
  children,
  kind,
  role = "group",
}: LedgerRowProps): JSX.Element => {
  const row = styles["row"] ?? "ledger-row";
  const labelCls = styles["label"] ?? "ledger-label";
  const desc = styles["desc"] ?? "ledger-desc";
  const line = styles["line"] ?? "ledger-line";
  const text = <LabelGlyphs text={label} />;
  return (
    <div className={row} id={id} role={role} aria-labelledby={`${id}-label`} data-kind={kind}>
      {htmlFor === undefined ? (
        <span className={labelCls} id={`${id}-label`}>
          {text}
        </span>
      ) : (
        <label className={labelCls} id={`${id}-label`} htmlFor={htmlFor}>
          {text}
        </label>
      )}
      {value}
      {description === undefined ? null : <span className={desc}>{description}</span>}
      {children === undefined ? null : <div className={line}>{children}</div>}
    </div>
  );
};
