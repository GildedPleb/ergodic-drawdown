/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide3: FC = () => (
  <SlideContent>
    <p>
      Bitcoin price prediction models have become famous over the years by using
      historical data to forecast future values. The Bitcoin Power Law (shown in
      green) is one of the most recent, well-known examples. Here, it extends
      from current prices to 20 years into the future.
    </p>
    <p>
      Notice anything different between the Orange and Green lines? You should.
      Unlike the model, Bitcoin's price movement is complex, it does not follow
      a nice even line: it's non-linear (not smooth), path-dependent (influenced
      by previous prices), and semi-chaotic (affected by external events like
      exchange hacks and market conditions). This makes precise predictions
      unreliable, even if they might suggest general price ranges or high R
      squared.
    </p>
    <p>This app attempts to reconcile these differences.</p>
    <p>
      To start, let's convert the single price line into a range that better
      reflects this uncertainty. Tap <strong>Next</strong> to define a Range.
    </p>
  </SlideContent>
);

export const slide3 = {
  component: Slide3,
  requirements: {
    epochCount: 5,
    model: "Power Law Regression Median",
    renderModelMax: false,
    renderModelMin: true,
    samples: 0,
    samplesToRender: 0,
    showModel: false,
    showRender: false,
  } satisfies SlideRequirement,
};
