import type { ReactElement } from "react";

import { VisuallyHidden } from "./VisuallyHidden";

/** Plain CSF 3. Nothing is painted; the text reaches assistive tech only. */
export default { title: "Primitives/VisuallyHidden" };

export const Default = (): ReactElement => (
  <p>
    Visible text
    <VisuallyHidden> and a hidden continuation</VisuallyHidden>
  </p>
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Default />
  </div>
);
