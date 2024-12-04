/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide8: FC = () => (
  <SlideContent>
    <p>
      A Monte Carlo Simulation is were many walks are taken into account, given
      the same assumptions, to find larger patterns in the data. We have added
      10 walks so you can begin to see this effect (Render ▼, Price: Walks ☑️,
      Walk Count: 10): The walks follow similar patterns to{" "}
      <strong>themselves</strong>.
    </p>
    <p>
      Zoom in and examine various areas of the chart. What do you notice? Look
      at today. Notice how price fans out from the current price? Open up the
      Render Tab, and increase the number of walks shown (Render ▼, Walk Count).
      As you increase the number of shown walks you will see that no matter the
      walk, they will begin to converge on filling the available range. Now we
      can start looking at our walks in aggregate.
    </p>
    <p>
      Let's look at some statistics for these walks by clicking{" "}
      <strong>Next</strong>.
    </p>
  </SlideContent>
);

export const slide8 = {
  component: Slide8,
  requirements: {
    renderPriceDistribution: "None",
    renderPriceWalks: true,
    samples: 1000,
    samplesToRender: 10,
    showModel: false,
    showRender: false,
  } satisfies SlideRequirement,
};
