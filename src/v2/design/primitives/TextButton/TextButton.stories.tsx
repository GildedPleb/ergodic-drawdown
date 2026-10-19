import type { ReactElement } from "react";

import { TextButton } from "./TextButton";

/** Plain CSF 3. */
export default { title: "Primitives/TextButton" };

const noop = (): void => undefined;

export const Default = (): ReactElement => <TextButton label="Try again" onClick={noop} />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <TextButton label="Try again" onClick={noop} />;
export const LongText = (): ReactElement => (
  <TextButton label="Try loading the prices again from the price service" onClick={noop} />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <TextButton label="Try again" onClick={noop} />
  </div>
);
