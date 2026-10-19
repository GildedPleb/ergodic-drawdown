import type { ReactElement } from "react";

import { LabelGlyphs } from "./LabelGlyphs";

export default { title: "Primitives/LabelGlyphs" };

export const Default = (): ReactElement => <LabelGlyphs text="🟢🟢🟢🔴" />;
export const LongText = (): ReactElement => (
  <LabelGlyphs text="Walk 🟢🟢🟢🔴 then a long trailing label" />
);
export const PlainText = (): ReactElement => <LabelGlyphs text="Vote Count" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <LabelGlyphs text="🟢🟢🟢🔴" />
  </div>
);
