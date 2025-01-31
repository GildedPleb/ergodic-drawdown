/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide17: FC = () => (
  <SlideContent>
    <p>
      Next to your starting bitcoin amount (10), you'll see an Inflation box
      presently at 0%. Increase inflation by a few %. As expected, increasing
      the inflation moves the Boat event out in time. At some level of
      inflation, you may never be able to afford the boat! Also notice that as
      you increase inflation, your retirement becomes more expensive, too.
    </p>
    <p>
      The Inflation box applies to drawdowns only and not bitcoin price. If it
      did, all price models would eventually be S-curves. Inflation is applied
      evenly to all drawdown event costs, and compounds. A reoccurring drawdown
      event that costs $100,000 this year with 10% inflation will cost $110,000
      next year, and $121,000 two years from now, etc. Because the timelines are
      long, this will catch up to and exceed all non-exponential price models.
      So, <strong>watch out!</strong> If you think you have added a drawdown
      event, but do not see it, it may be because inflation outpaces the
      assumptive rise of bitcoin{" "}
      <strong>forever precluding affordability</strong>.
    </p>
    <p>
      Bad enough, to be sure. But we can not state how evil inflation truly is
      by this metric alone. Let's see a more realistic scenario...
    </p>
  </SlideContent>
);

export const slide17 = {
  component: Slide17,
  requirements: {} satisfies SlideRequirement,
};
