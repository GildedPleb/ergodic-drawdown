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
      historical regression to forecast future values. The Bitcoin Power Law
      (shown in green) is one of the most recent, well-known examples, extending
      from current prices into the future.
    </p>
    <p>
      Notice anything different about the Orange and Green lines? You should.
      Bitcoin's price movement is complex, it does not follow a nice even line:
      it's non-linear (not smooth), path-dependent (influenced by previous
      prices), and semi-chaotic (affected by external events like exchange hacks
      and market conditions). This makes precise predictions unreliable, even if
      they might suggest general price ranges or high R squared.
    </p>
    <p>
      Let's improve on this by converting the single price line into a range
      that better reflects this uncertainty. Tap <strong>Next</strong> to define
      a Range.
    </p>
  </SlideContent>
);

export const slide3 = {
  component: Slide3,
  requirements: {
    model: "Power Law Regression Median",
    renderModelMax: false,
    renderModelMin: true,
    samples: 0,
    samplesToRender: 0,
    showModel: false,
    showRender: false,
  } satisfies SlideRequirement,
};
