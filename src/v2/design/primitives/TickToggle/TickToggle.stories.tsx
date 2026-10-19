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
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live initial />
  </div>
);
