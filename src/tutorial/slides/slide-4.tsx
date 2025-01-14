/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide4: FC = () => (
  <SlideContent>
    <p>
      The original{" "}
      <a
        aria-label="View Bitcoin Rainbow Chart - Opens in new tab"
        href="https://www.blockchaincenter.net/bitcoin-rainbow-chart/"
        rel="noopener noreferrer"
        tabIndex={0}
        target="_blank"
      >
        Bitcoin Rainbow Chart
      </a>{" "}
      (approximation shown) became famous for plotting the bitcoin price in a
      Rainbow Range. And rightly so, for it takes the 'price predicting' out of
      the equation. Now that we have a range (Green marking the lower bound of
      the range, and Red the upper bound) we can think of these lines as
      containing most (but not all) future price movements for any model. Let's
      explore different models (tap "Model ▼", Select "Rainbow Chart", and
      choose something else). Notice the shape, scale, tapering and options they
      have.
    </p>
    <p>
      Simply having a range is not enough, however. If Bitcoin were to mostly
      trade at the top of the range, or mostly at the bottom, or hit top and
      bottom in some asymmetric way, we could have wildly different projected
      outcomes, spanning orders of magnitude and quickly becoming unless.
    </p>
    <p>
      Let's begin to think about solving for this by looking at one potential
      bitcoin future. Click <strong>Next</strong>.{" "}
    </p>
  </SlideContent>
);

export const slide4 = {
  component: Slide4,
  requirements: {
    epochCount: 10,
    model: "Rainbow Chart",
    renderModelMax: true,
    samplesToRender: 0,
    showModel: false,
    showRender: false,
  } satisfies SlideRequirement,
};
