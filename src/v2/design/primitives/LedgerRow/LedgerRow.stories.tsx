import type { ReactElement } from "react";
import { useState } from "react";

import { NumberField } from "../NumberField";
import { Slider } from "../Slider";
import { LedgerRow } from "./LedgerRow";

/** Plain CSF 3. Stateful so the row really opens its editor. */
export default { title: "Primitives/LedgerRow" };

const Live = ({
  label = "Volatility (0-1):",
  initialOpen = false,
}: {
  label?: string;
  initialOpen?: boolean;
}): ReactElement => {
  const [open, setOpen] = useState(initialOpen);
  const [value, setValue] = useState(0.1);
  return (
    <LedgerRow id="ledger-story" label={label} value={String(value)} open={open} onToggle={setOpen}>
      <NumberField
        label={label}
        labelHidden
        value={value}
        bounds={{ min: 0, max: 1 }}
        step={0.005}
        onCommit={setValue}
      />
      <Slider label={label} value={value} min={0} max={1} step={0.005} onCommit={setValue} />
    </LedgerRow>
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live />;
export const Editing = (): ReactElement => <Live initialOpen />;
export const LongText = (): ReactElement => (
  <Live label="Statistical Sample Count (1k-10k): a label long enough to wrap in a narrow pane" />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live initialOpen />
  </div>
);
