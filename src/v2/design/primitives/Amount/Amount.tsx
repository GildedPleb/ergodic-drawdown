import type { JSX } from "react";

import { fmtBTC, fmtUSD } from "../../format/money";
import styles from "./Amount.module.css";

/** R7: variant keys and values. */
export const variants = {
  unit: ["btc", "usd"] as const,
};

export type AmountProps = {
  value: number;
  unit: (typeof variants.unit)[number];
  /** Exact sats (detail views); ₿ only. */
  detail?: boolean;
};

/** ₿ prefix + orange / $ + green. Tabular lining. No space after ₿. */
export const Amount = ({ value, unit, detail = false }: AmountProps): JSX.Element => {
  const root = styles["root"] ?? "amount-root";
  const text = unit === "btc" ? fmtBTC(value, { detail }) : fmtUSD(value);
  return (
    <span className={root} data-unit={unit}>
      {text}
    </span>
  );
};
