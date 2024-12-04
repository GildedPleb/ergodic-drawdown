/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide2: FC = () => (
  <SlideContent>
    <p>
      In this chart, we now only see the historic bitcoin price (Orange Line),
      vertical past halving dates (Vertical Grey Lines), and today (Pink line).
      This should be familiar to you. But if it's not, it is highly recommended
      to pause here and go buy some Bitcoin.
    </p>
    <p>Seriously.</p>
    <p>
      Got some Bitcoin (off exchange) and a little price history under your
      belt? Great! Click <strong>Next</strong> to visualize our first Bitcoin
      price model.
    </p>
  </SlideContent>
);

export const slide2 = {
  component: Slide2,
  requirements: {
    bitcoin: 0,
    epochCount: 10,
    hideResults: true,
    oneOffFiatVariables: [],
    oneOffItems: [],
    renderDrawdownDistribution: "None",
    renderDrawdownWalks: false,
    renderModelMax: false,
    renderModelMin: false,
    renderPriceDistribution: "None",
    renderPriceWalks: false,
    reoccurringItems: [],
    samples: 0,
    samplesToRender: 0,
    showDrawdown: false,
    showModel: false,
    showRender: false,
    showResults: false,
  } satisfies SlideRequirement,
};
