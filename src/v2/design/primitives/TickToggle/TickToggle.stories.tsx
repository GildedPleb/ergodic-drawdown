import type { ReactElement } from "react";
import { useState } from "react";

import { TickToggle } from "./TickToggle";

/** Plain CSF 3, no Storybook/Ladle imports. Each story is stateful so click/Space/Enter really toggle. */
export default { title: "Primitives/TickToggle" };

const Live = ({
  label = "Compare",
  initial,
  disabled = false,
}: {
  label?: string;
  initial: boolean;
  disabled?: boolean;
}): ReactElement => {
  const [checked, setChecked] = useState(initial);
  return <TickToggle label={label} checked={checked} disabled={disabled} onChange={setChecked} />;
};

export const Default = (): ReactElement => <Live initial={false} />;
export const Off = (): ReactElement => <Live initial={false} />;
export const On = (): ReactElement => <Live initial />;
/** Same as Default; the visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live initial={false} />;
export const Disabled = (): ReactElement => <Live initial={false} disabled />;
export const LongText = (): ReactElement => (
  <Live label="A longer control label that wraps to two lines before truncating" initial />
);
/** §1MP 7 Clamp: the compact pair, named for what it does. */
export const Pair = (): ReactElement => {
  const [min, setMin] = useState(false);
  const [max, setMax] = useState(true);
  return (
    <span>
      <TickToggle
        size="pair"
        label="Min"
        name="Clamp minimum price"
        checked={min}
        onChange={setMin}
      />
      <TickToggle
        size="pair"
        label="Max"
        name="Clamp maximum price"
        checked={max}
        onChange={setMax}
      />
    </span>
  );
};
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live initial />
  </div>
);
