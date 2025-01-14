/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide14: FC = () => (
  <SlideContent>
    <p>
      We now see the quantile distribution of price and our single drawdown
      event. Hover at the chart's end to see the final median and specific
      quantiles. Consider: what's the worst possible drawdown from a $2,000,000
      house purchase given the price assumptions? With these probability, is it
      worth it?
    </p>
    <p>
      To explore further, click "El Salvador Vacation Home" in Drawdown ▼. In
      the modal, change Currency to BTC and Amount Today to 1, then Save. Notice
      how the quantiles collapse since it's now in bitcoin.
    </p>
    <p>
      Try unchecking "Expense" to see it as an acquisition. Switch back to
      $2,000,000 USD to view the upside spread.
    </p>
    <p>
      Click <strong>Next</strong> to reset and learn about adding new drawdown
      events.
    </p>
  </SlideContent>
);

export const slide14 = {
  component: Slide14,
  requirements: {
    bitcoin: 10,
    inflation: 0,
    oneOffFiatVariables: [],
    renderDrawdownDistribution: "Quantile",
    renderDrawdownWalks: false,
    renderPriceDistribution: "Quantile",
    renderPriceWalks: false,
    reoccurringItems: [],
    samplesToRender: 1,
    showDrawdown: true,
    showModel: false,
    showRender: false,
  } satisfies SlideRequirement,
};
