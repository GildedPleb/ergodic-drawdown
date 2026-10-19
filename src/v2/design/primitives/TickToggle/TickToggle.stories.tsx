import type { ReactElement } from "react";

import { TickToggle } from "./TickToggle";

/** Plain CSF 3 — no Storybook/Ladle imports. */
export default { title: "Primitives/TickToggle" };

export const Default = (): ReactElement => <TickToggle label="Compare" checked={false} />;
export const Off = (): ReactElement => <TickToggle label="Compare" checked={false} />;
export const On = (): ReactElement => <TickToggle label="Compare" checked />;
export const Focus = (): ReactElement => <TickToggle label="Compare" checked={false} />;
export const Disabled = (): ReactElement => <TickToggle label="Compare" checked={false} disabled />;
export const LongText = (): ReactElement => (
  <TickToggle label="A longer control label that wraps to two lines before truncating" checked />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <TickToggle label="Compare" checked />
  </div>
);
