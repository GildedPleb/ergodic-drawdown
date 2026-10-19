import type { ReactElement } from "react";

import { Amount } from "./Amount";

export default { title: "Primitives/Amount" };

export const Default = (): ReactElement => <Amount value={13.1} unit="btc" />;
export const Focus = (): ReactElement => <Amount value={13.1} unit="btc" />;
export const LongText = (): ReactElement => <Amount value={13.1} unit="btc" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Amount value={13.1} unit="btc" />
  </div>
);
export const Tiny = (): ReactElement => <Amount value={1e-10} unit="btc" />;
export const Negative = (): ReactElement => <Amount value={-0.4} unit="btc" />;
export const Zero = (): ReactElement => <Amount value={0} unit="btc" />;
export const Unavailable = (): ReactElement => <Amount value={Number.NaN} unit="btc" />;
export const FontsFailed = (): ReactElement => <Amount value={0.7} unit="btc" fontsFailed />;
export const Usd = (): ReactElement => <Amount value={80000} unit="usd" />;
