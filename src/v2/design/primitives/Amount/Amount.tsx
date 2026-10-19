import type { JSX } from "react";

import { useFontsFailed } from "../../fonts/status";
import { fmtBTC, fmtUSD, nameBTC, nameUSD, sciRuns } from "../../format/money";
import { VisuallyHidden } from "../VisuallyHidden";
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
  /** Force the fonts-failed display; by default it follows runtime detection (fonts/status). */
  fontsFailed?: boolean;
};

/**
 * ₿ prefix + orange / $ + green. Tabular lining. No space after ₿.
 * The drawn text is aria-hidden; the sr-only utility carries the spoken name ("bitcoin 0.7",
 * "not available" for NaN / ±∞), identical whether fonts loaded or not.
 */
export const Amount = ({ value, unit, detail = false, fontsFailed }: AmountProps): JSX.Element => {
  const root = styles["root"] ?? "amount-root";
  const exp = styles["exp"] ?? "amount-exp";
  const detected = useFontsFailed();
  const failed = fontsFailed ?? detected;
  const text = unit === "btc" ? fmtBTC(value, { detail, fontsFailed: failed }) : fmtUSD(value);
  const name = unit === "btc" ? nameBTC(value, { detail }) : nameUSD(value);
  return (
    <span className={root} data-unit={unit}>
      <VisuallyHidden>{name}</VisuallyHidden>
      <span aria-hidden="true">
        {sciRuns(text).map((run, k) =>
          run.sup ? (
            <span key={k} className={exp} data-sup="true">
              {run.text}
            </span>
          ) : (
            run.text
          ),
        )}
      </span>
    </span>
  );
};
