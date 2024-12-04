/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide6: FC = () => (
  <SlideContent>
    <p>
      This is the pure walk pattern without any randomness. Try different walks
      using the selector (Model ▼, Walk Strategy). Some collapse to straight
      lines when volatility is zero, showing how much they depend on price
      swings. This is easiest to see in non-S2F models.
    </p>
    <p>
      Some walks, like the Bubble Walk, are "ergodic" - given enough time,
      they'll naturally hit every possible price level in their range. This is
      crucial because it means past patterns reliably inform future predictions.
      Unlike simpler models (e.g., Rainbow), this property lets us reason
      confidently about future behavior based on historical data. This is the
      first categorical differentiation that sets this modeling paradigm apart.
    </p>
    <p>
      Now, let's increase the volatility back to 0.1 - either click{" "}
      <strong>Next</strong> or set it manually before moving forward.
    </p>
  </SlideContent>
);

export default Slide6;

export const slide6 = {
  component: Slide6,
  requirements: {
    showModel: false,
    showRender: false,
    volatility: 0,
  } satisfies SlideRequirement,
};
