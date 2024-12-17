/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { MS_PER_YEAR } from "../../constants";
import { type SlideRequirement } from "../../types";

const Slide15: FC = () => (
  <SlideContent>
    <p>
      Click the ➕ button to add a new drawdown event. Select Type:
      "Reoccurring", give it the name "Retirement", choose currency "USD", enter
      the annual cost of this reoccurring event: in USD terms, sitting on 1000
      bitcoin, what is the cost of the lifestyle you would like in retirement?
      $100,000? $10,000,000? The world is yours! Leave the rest unchanged for
      now. Click "Save".
    </p>
    <p>
      A reoccurring event takes the annual expense (or income) amortizes it to a
      weekly basis, and plots that change every week. If you chose $10,000,000,
      you should see around a 15% chance of running out of bitcoin by counting
      the quantiles. You can also choose to start this reoccurring event later,
      or set an end date. You can also make it income.
    </p>
    <p>
      We have one more darwdown event type to cover:{" "}
      <strong>One-Off Fiat Variable-Date</strong>.
    </p>
  </SlideContent>
);

export const slide15 = {
  component: Slide15,
  requirements: {
    bitcoin: 1000,
    inflation: 0,
    oneOffFiatVariables: [],
    oneOffItems: [
      {
        active: true,
        amountToday: 10_000_000,
        effective: new Date(Date.now() + MS_PER_YEAR * 8),
        expense: true,
        id: "tutorial_item_1",
        isFiat: true,
        name: "El Salvador Dream Home",
      },
    ],
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
