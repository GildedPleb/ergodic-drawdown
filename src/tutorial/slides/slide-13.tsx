/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { MS_PER_YEAR } from "../../constants";
import { type SlideRequirement } from "../../types";

const Slide13: FC = () => (
  <SlideContent>
    <p>
      With your new-found massive net worth (but pleb ways), you plan to buy a
      dream home in 8 years, presently valued at $10,000,000, in El Salvador! We
      have now added this drawdown event. You should see a new vertical line
      with a label and a change in your total remaining bitcoin. Zoom into the
      event, you should notice that your total bitcoin has been drawn down by
      the cost of the event, divided by the first price after the event
      ($10,000,000 / bitcoin price in 8 years).
    </p>
    <p>
      Now, again, no one can know the price of bitcoin 8 years in advance making
      this event meaningless, so, let's bump up the sample count. Open Render ▼,
      and increase the Walk Count. As you do, notice the new bitcoin price at
      the event date, and how much bitcoin you are left with after each walk. In
      aggregate we start to see some probabilities.
    </p>
    <p>
      Click <strong>Next</strong> to check out the stats.
    </p>
  </SlideContent>
);

export const slide13 = {
  component: Slide13,
  requirements: {
    oneOffFiatVariables: [],
    oneOffItems: [
      {
        active: true,
        amountToday: 10_000_000,
        effective: new Date(Date.now() + 8 * MS_PER_YEAR),
        expense: true,
        id: "tutorial_item_1",
        isFiat: true,
        name: "El Salvador Dream Home",
      },
    ],
    renderDrawdownDistribution: "None",
    renderDrawdownWalks: true,
    renderPriceDistribution: "None",
    renderPriceWalks: true,
    reoccurringItems: [],
  } satisfies SlideRequirement,
};
