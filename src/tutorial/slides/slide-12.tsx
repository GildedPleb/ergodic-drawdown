/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide12: FC = () => (
  <SlideContent>
    <p>Congratulations!</p>
    <p>
      A Nigerian Prince recently passed away and you have inherited 1000 bitcoin
      from his estate! You can now see that you have 1000 bitcoin in the
      Drawdown Box on the bottom. This number represent the current starting
      drawdown amount; the amount of bitcoin held today.
    </p>
    <p>
      It is important to note that you should never enter how much bitcoin you
      have online. Ever. Because this tool is for educational and entertainment
      purposes only and should not be used as a substitute for real life
      financial planning, this shouldn't be an issue here. But just in case you
      slip up, this app does not transmit or record how much bitcoin is entered
      in this box. Further, this app is fully FOSS so this claim can be
      verified. Please see the <strong>Legal</strong> and{" "}
      <strong>Source</strong> links at the bottom of this page.
    </p>
    <p>
      You will also notice that a new horizontal line has appeared in the chart.
      This is how much bitcoin you have over time (in this case 1000). We will
      start as we started for bitcoin price projections: with 1 drawdown sample.
    </p>
  </SlideContent>
);

export const slide12 = {
  component: Slide12,
  requirements: {
    bitcoin: 1000,
    inflation: 0,
    oneOffFiatVariables: [],
    oneOffItems: [],
    renderDrawdownWalks: true,
    renderPriceDistribution: "None",
    renderPriceWalks: true,
    reoccurringItems: [],
    samples: 1000,
    samplesToRender: 1,
    showDrawdown: true,
    showModel: false,
    showRender: false,
  } satisfies SlideRequirement,
};
