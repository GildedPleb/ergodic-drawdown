import type { ReactElement } from "react";
import { useState } from "react";

import { Slider } from "./Slider";

/** Plain CSF 3. Stateful so drag and keys really commit. */
export default { title: "Primitives/Slider" };

const Live = ({
  label = "Volatility (0-1):",
  disabled = false,
}: {
  label?: string;
  disabled?: boolean;
}): ReactElement => {
  const [value, setValue] = useState(0.1);
  return (
    <Slider
      label={label}
      value={value}
      min={0}
      max={1}
      step={0.005}
      disabled={disabled}
      onCommit={setValue}
    />
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live />;
export const Disabled = (): ReactElement => <Live disabled />;
export const LongText = (): ReactElement => (
  <Live label="A longer slider name that only assistive technology hears, read in full" />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live />
  </div>
);
