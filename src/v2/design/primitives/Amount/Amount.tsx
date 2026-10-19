import type { JSX } from "react";

import { fmtBTC, fmtUSD, nameBTC, nameUSD } from "../../format/money";
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
  /** Fonts failed to load: display `BTC 0.7`; the accessible name stays "bitcoin 0.7". */
  fontsFailed?: boolean;
};

/**
 * ₿ prefix + orange / $ + green. Tabular lining. No space after ₿.
 * The drawn text is aria-hidden; a visually hidden span carries the spoken name
 * ("bitcoin 0.7", "not available" for NaN / ±∞), identical whether fonts loaded or not.
 */
export const Amount = ({
  value,
  unit,
  detail = false,
  fontsFailed = false,
}: AmountProps): JSX.Element => {
  const root = styles["root"] ?? "amount-root";
  const hidden = styles["visuallyHidden"] ?? "amount-hidden";
  const text = unit === "btc" ? fmtBTC(value, { detail, fontsFailed }) : fmtUSD(value);
  const name = unit === "btc" ? nameBTC(value, { detail }) : nameUSD(value);
  return (
    <span className={root} data-unit={unit}>
      <span className={hidden}>{name}</span>
      <span aria-hidden="true">{text}</span>
    </span>
  );
};
