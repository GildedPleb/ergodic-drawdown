/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide9: FC = () => (
  <SlideContent>
    <p>
      We have two methods for analyzing aggregate walk data:{" "}
      <strong>Quantile Distribution</strong> and{" "}
      <strong>Normal Distribution</strong>
    </p>
    <p>
      <strong>Quantile Distribution</strong> (Render ▼, Price: Quantile) looks
      at all the walks at one point in time and then sorts and divides those
      points into Quantiles—or percentages. Mouse over the edges of the orange
      bands to see the percentile. From the median, it allows you to see data
      shape and asymmetries, where paths gather or were they spread. For
      Quantile, 50% of all data points fall within the inner-most band.
    </p>
    <p>
      <strong>Normal Distribution</strong> (Render ▼, Price: Normal) looks at
      all the walks at 1 point in time and then determines the standard
      deviation from this data and, assuming the data is distributed normally
      (it usually isn't), overlooks asymmetries, and plots those bands from the
      mean.
    </p>
    <p>
      Let's focus on Quantile with a quick discussion of Granularity and
      Limitations by clicking <strong>Next</strong>.
    </p>
  </SlideContent>
);

export const slide9 = {
  component: Slide9,
  requirements: {
    renderPriceDistribution: "Quantile",
    renderPriceWalks: false,
    showModel: false,
    showRender: true,
  } satisfies SlideRequirement,
};
