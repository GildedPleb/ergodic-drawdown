import type { JSX } from "react";

import { fmtBTC, fmtUSD } from "../../format/money";
import styles from "./Amount.module.css";

export type AmountProps = {
  value: number;
  unit: "btc" | "usd";
};

/** ₿ prefix + orange / $ + green. Tabular lining. No space after ₿. */
export const Amount = ({ value, unit }: AmountProps): JSX.Element => {
  const root = styles["root"] ?? "amount-root";
  const text = unit === "btc" ? fmtBTC(value) : fmtUSD(value);
  return (
    <span className={root} data-unit={unit}>
      {text}
    </span>
  );
};
