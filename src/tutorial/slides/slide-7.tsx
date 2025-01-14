/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide7: FC = () => (
  <SlideContent>
    <p>
      Cycle through the models, walks, and volatility together. You will notice
      that some walks respect the min and max while others do not. This is
      because all walks are strategic, relying on a variety of inputs. Some
      walks care about min and max, others care about cycles, momentum, or freak
      accidents. To force a respect of min and/or max, tap the respective
      'clamp' checkbox (Model ▼, Clamp Price).{" "}
    </p>
    <p>
      Get comfortable plotting Bitcoins future. Which combination do you like?
      What seems reasonable? What seems improbable? Missing a walk or model?
      Feel free to submit one on{" "}
      <a
        aria-label="Create new Github issue - Opens in new tab"
        href="https://github.com/GildedPleb/ergodic-drawdown/issues/new"
        rel="noopener noreferrer"
        tabIndex={0}
        target="_blank"
      >
        GitHub
      </a>
      !
    </p>
    <p>
      Alright, now that we understand a single walk, we can begin to address the
      infinitely improbable reality that this single walk will ever occur.
    </p>
    <p>
      After all, one walk, alone, is irrelevant. But what about many in
      aggregate?
    </p>
  </SlideContent>
);

export const slide7 = {
  component: Slide7,
  requirements: {
    samples: 1,
    samplesToRender: 1,
    volatility: 0.1,
  } satisfies SlideRequirement,
};
