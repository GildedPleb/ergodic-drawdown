/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide1: FC = () => (
  <SlideContent>
    <p>
      <strong>How Much Bitcoin is Enough?</strong>
    </p>
    <p>
      Is it 10? 6.15? 1? .21? What about 1 block reward from two halving epochs
      ago? Trying to figure out an answer can be overwhelming, and is generally
      unanswerable simply because it relies on big assumptions and personal
      circumstances that traditional financial tools are not robust enough to
      account for (it's 6.15, btw).
    </p>
    <p>
      However, this question can be answered probabilistically with the right
      tools. To this end, we have built this Monte Carlo Simulator to model
      ergodic bitcoin price movements, and map those to drawdown needs. Don't
      worry about the terminology just yet, we'll go through it. At the end of
      this tutorial, you should have a robust understanding of how to make good
      use of this tool to answer the question "How much is enough?" for you and
      your goals.
    </p>
    <p>
      The tutorial will take full control of the app, resetting any changes you
      have already made, so be sure to save if you want to keep your work. Ready
      to get started? Let's 0 out everything by clicking <strong>Next</strong>.
    </p>
  </SlideContent>
);

export const slide1 = {
  component: Slide1,
  requirements: {
    model: "Power Law Regression Median",
    renderDrawdownDistribution: "Quantile",
    renderModelMax: true,
    renderModelMin: true,
    renderPriceDistribution: "Quantile",
    samples: 1000,
    samplesToRender: 10,
    volatility: 0.1,
  } satisfies SlideRequirement,
};
