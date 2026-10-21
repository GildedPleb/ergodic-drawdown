import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide10: FC = () => (
  <SlideContent>
    <p>
      Two key inputs significantly impact this tool's quality: <strong>Years</strong> and{" "}
      <strong>Sample Count</strong>.
    </p>
    <p>
      <strong>Years</strong> (Model ▼, Years) is how many years the chart runs from today. Monte
      Carlo Simulators are resource-intensive, especially in browsers. While limits are in place,
      exercise caution with your device as this app can easily eat all memory. Remember, longer
      projections are more computationally expensive and less relevant (e.g. if fiat collapses, this
      entire app is irrelevant, and we know that's coming eventually).
    </p>
    <p>
      <strong>Samples</strong> (Model ▼, Statistical Sample Count) determine data granularity. More
      samples result in smoother Quantile bands but impacts performance. Keep samples at 1000 while
      adjusting other parameters and drawdowns, then increase to finalize results. The app's limit
      is 10,000, which is the typical minimum for serious Monte Carlo Simulations. We've provided an
      estimated data size for reference, though actual size will vary across browsers.
    </p>
    <p>
      Before we get some answers to "How much is enough?" we have one more preliminary concept to
      cover.
    </p>
  </SlideContent>
);

export const slide10 = {
  component: Slide10,
  requirements: {
    renderPriceDistribution: "Quantile",
    renderPriceWalks: false,
    samples: 1000,
    showModel: true,
    showRender: false,
  } satisfies SlideRequirement,
};
