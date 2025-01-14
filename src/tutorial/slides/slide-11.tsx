/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide11: FC = () => (
  <SlideContent>
    <p>
      So far, we have looked at Bitcoin Price modeling, walks, using these in
      concert to create thousands of price predictions, and the probabilities
      given our assumptions.
    </p>
    <p>
      This, on its own, is a very powerful tool. The key advantage of this
      ergodic Monte Carlo approach is that it allows us to capture market
      uncertainty explicitly. While traditional forecasting methods might tell
      you "Bitcoin will be worth $X in 2028," our simulations tell us, given a
      set of assumptions, there's a 20% chance it'll be above $X, a 50% chance
      above $Y, and so on. This mirrors how real markets behave—they don't
      follow a set path, but rather produce surprising results every second,
      allowing for many possible futures with different probabilities.
    </p>
    <p>
      But we're just scratching the surface of what's possible. Ready to finally
      get some answers to "How much is enough?" Click <strong>Next</strong> to
      continue to Drawdown.
    </p>
  </SlideContent>
);

export default Slide11;

export const slide11 = {
  component: Slide11,
  requirements: {
    bitcoin: 0,
    epochCount: 10,
    renderDrawdownWalks: false,
    renderPriceDistribution: "Quantile",
    renderPriceWalks: false,
    showDrawdown: false,
    showModel: false,
    showRender: false,
  } satisfies SlideRequirement,
};
