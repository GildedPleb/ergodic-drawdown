import type { JSX, ReactNode } from "react";

import { LabelGlyphs } from "../LabelGlyphs";
import styles from "./LedgerRow.module.css";

export type LedgerRowProps = {
  /** The back end's label, verbatim. */
  label: string;
  /** The live field: a label-hidden NumberField (the value cell), plus a Slider if any. */
  children?: ReactNode;
  id: string;
  /** The value cell's input id: the label focuses it. */
  htmlFor: string;
};

/**
 * Certificate ledger row (V32-BUILD §1f, §1P): the label in --t-row on the left and the live
 * value cell on the right, a --hairline below; the first line is --hit tall and never changes
 * height. §1P: no edit mode. The value cell is always an input and the slider always draggable:
 * under 30rem of container width the slider takes the row's second line; at 30rem and up it sits
 * between the label and the value. Messages and the hint fall to the lines below.
 */
export const LedgerRow = ({ label, children, id, htmlFor }: LedgerRowProps): JSX.Element => {
  const row = styles["row"] ?? "ledger-row";
  const labelCls = styles["label"] ?? "ledger-label";
  return (
    <div className={row} id={id} role="group" aria-labelledby={`${id}-label`}>
      <label className={labelCls} id={`${id}-label`} htmlFor={htmlFor}>
        <LabelGlyphs text={label} />
      </label>
      {children}
    </div>
  );
};
