import type { ReactElement } from "react";
import { useState } from "react";

import { GrabPoint } from "./GrabPoint";

/** Plain CSF 3. Stateful so a click really toggles aria-expanded. */
export default { title: "Primitives/GrabPoint" };

const Live = ({ label = "Open the Models sheet" }: { label?: string }): ReactElement => {
  const [open, setOpen] = useState(false);
  return (
    <GrabPoint
      label={label}
      expanded={open}
      onToggle={() => {
        setOpen((o) => !o);
      }}
    />
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live />;
/** The name is never shown; a long one must not change the 26px mark. */
export const LongText = (): ReactElement => (
  <Live label="Open the Models sheet to change the price model, the walk and the simulation" />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live />
  </div>
);
