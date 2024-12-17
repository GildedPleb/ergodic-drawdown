/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";
import styled from "styled-components";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const StyledS = styled(SlideContent)`
  align-items: center;
`;

const Slide21: FC = () => (
  <StyledS>
    <p>
      This concludes the Tutorial. Thank you for your time and I hope you
      learned some things along the way!
    </p>
    <p>
      If you find this tool useful, please follow{" "}
      <a
        aria-label="Visit GildedPleb on X (formerly Twitter) - Opens in new tab"
        href="https://x.com/gildedpleb"
        rel="noopener noreferrer"
        tabIndex={0}
        target="_blank"
      >
        @GildedPleb
      </a>{" "}
      and support our work with a{" "}
      <a
        aria-label="Send Lightning tip to gildedpleb@getalby.com"
        href="lightning:gildedpleb@getalby.com"
        tabIndex={0}
      >
        tip!
      </a>
    </p>
  </StyledS>
);

export const slide21 = {
  component: Slide21,
  requirements: {} satisfies SlideRequirement,
};
