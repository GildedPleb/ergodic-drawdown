import type { ReactElement } from "react";
import { useState } from "react";

import { NumberField } from "../NumberField";
import { Slider } from "../Slider";
import { LedgerRow } from "./LedgerRow";

/** Plain CSF 3. Stateful so the live field really commits (§1P: no edit mode). */
export default { title: "Primitives/LedgerRow" };

const Live = ({ label = "Volatility (0-1):" }: { label?: string }): ReactElement => {
  const [value, setValue] = useState(0.1);
  return (
    <LedgerRow
      id="ledger-story"
      label={label}
      htmlFor="ledger-story-input"
      description="How big each week\u2019s random step is."
      value={
        <NumberField
          id="ledger-story-input"
          label={label}
          labelHidden
          value={value}
          bounds={{ min: 0, max: 1 }}
          step={0.005}
          onCommit={setValue}
        />
      }
    >
      <Slider label={label} value={value} min={0} max={1} step={0.005} onCommit={setValue} />
    </LedgerRow>
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live />;
export const LongText = (): ReactElement => (
  <Live label="Statistical Sample Count (1k-10k): a label long enough to wrap in a narrow pane" />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live />
  </div>
);
