import type { ReactElement } from "react";

import { CheckMark } from "./CheckMark";

/** Plain CSF 3. The mark alone draws in currentColor; it is aria-hidden, so it has no Focus story. */
export default { title: "Primitives/CheckMark" };

export const Default = (): ReactElement => <CheckMark on />;
export const Off = (): ReactElement => <CheckMark on={false} />;
export const Disabled = (): ReactElement => <CheckMark on disabled />;
export const Large = (): ReactElement => <CheckMark on size="large" />;
export const LargeOff = (): ReactElement => <CheckMark on={false} size="large" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <CheckMark on />
  </div>
);
