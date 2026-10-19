import type { ReactElement } from "react";

import { LabelGlyphs } from "./LabelGlyphs";

export default { title: "Primitives/LabelGlyphs" };

export const Default = (): ReactElement => <LabelGlyphs text="🟢🟢🟢🔴" />;
export const Focus = (): ReactElement => <LabelGlyphs text="🟢🟢🟢🔴" />;
export const LongText = (): ReactElement => <LabelGlyphs text="🟢🟢🟢🔴" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <LabelGlyphs text="🟢🟢🟢🔴" />
  </div>
);
