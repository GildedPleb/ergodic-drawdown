import type { ReactElement } from "react";

import { Icon } from "./Icon";

export default { title: "Primitives/Icon" };

export const Default = (): ReactElement => <Icon name="check" />;
export const Focus = (): ReactElement => <Icon name="check" />;
export const LongText = (): ReactElement => <Icon name="check" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Icon name="check" />
  </div>
);
