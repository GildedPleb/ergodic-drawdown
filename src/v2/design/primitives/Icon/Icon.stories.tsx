import type { ReactElement } from "react";

import { Icon } from "./Icon";

export default { title: "Primitives/Icon" };

export const Default = (): ReactElement => <Icon name="check" />;
export const Warning = (): ReactElement => <Icon name="warning" />;
export const Search = (): ReactElement => <Icon name="search" />;
export const Gear = (): ReactElement => <Icon name="gear" />;
export const Chevron = (): ReactElement => <Icon name="chevron" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Icon name="check" />
  </div>
);
