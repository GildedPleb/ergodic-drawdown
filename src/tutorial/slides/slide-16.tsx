/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide16: FC = () => (
  <SlideContent>
    <p>
      What if you have low time preference and instead of needing an item by a
      specific date, would rather wait to spend a specific amount of bitcoin?
      Enter One-Off Fiat Variable-Date Event type.
    </p>
    <p>
      Click the ➕ button to add another drawdown event. Select Type: "One-Off
      Fiat Variable-Date", give it the name "Skyscraper", enter $1,000,000,000
      USD. Let's start with willing to spend 500 bitcoin. Leave the other fields
      as they are and click "Save". As you can see we now have a new drawdown
      event, but unlike other one-off events this event has a strange shape and
      a range. Why?
    </p>
    <p>
      If you are only willing to spend a specific amount of bitcoin, and can
      wait, that means that your spend date will be different for each sample
      and may be price improved. To get a better sense of Start and Delay, check
      out the FAQ below.
    </p>
    <p>
      If your model assumes the price of bitcoin will go up over time,
      increasing the bitcoin willing to spend, will bring the range close to the
      present, and decreasing it will push it further into the future.
    </p>
  </SlideContent>
);

export const slide16 = {
  component: Slide16,
  requirements: {} satisfies SlideRequirement,
};
