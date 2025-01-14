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
      the annual cost of this reoccurring event: in USD terms, sitting on 10
      bitcoin, what is the cost of the lifestyle you would like in retirement?
      $50,000? $200,000? Leave the rest unchanged for now. Click "Save".
    </p>
    <p>
      A reoccurring event takes the annual expense (or income) amortizes it to a
      weekly basis, and plots that change every week. If you chose $200,000 or
      more, depending on your model, you may have a % chance of running out of
      bitcoin. In Render ▼, check Results ☑️. Open the Results box by clicking
      Results ▼. What is your actual survival rate, and how much bitcoin do you
      have left? You can also choose to start this reoccurring event later, or
      set an end date. You can also make it income. When we move on, we will set
      it to $100,000.
    </p>
    <p>
      We have one more drawdown event type to cover:{" "}
      <strong>One-Off Fiat Variable-Date</strong>.
    </p>
  </SlideContent>
);

export const slide15 = {
  component: Slide15,
  requirements: {
    bitcoin: 10,
    inflation: 0,
    oneOffFiatVariables: [],
    oneOffItems: [
      {
        active: true,
        amountToday: 2_000_000,
        effective: new Date(Date.now() + MS_PER_YEAR * 8),
        expense: true,
        id: "tutorial_item_1",
        isFiat: true,
        name: "El Salvador Vacation Home",
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
