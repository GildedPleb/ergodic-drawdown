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
    <p>This concludes the Tutorial.</p>
    <p>
      <strong>Thank You</strong> for your time and I hope you learned something
      along the way!
    </p>
    <p>
      From initial conception to completion, this project represents about six
      years worth of research, testing, spreadsheets, think-boi walks, and
      coding, drawing from our experience in financial planning, engagement with
      financial markets, academic studies in economics, deep software
      engineering expertise, human-centered design work, and pursuit of Bitcoin.
    </p>
    <p>
      If you find this tool as useful as we do, please follow{" "}
      <a
        aria-label="Follow GildedPleb on 𝕏 (formerly Twitter) - Opens in new tab"
        href="https://x.com/intent/follow?screen_name=gildedpleb"
        rel="noopener noreferrer"
        tabIndex={0}
        target="_blank"
      >
        @GildedPleb
      </a>{" "}
      on 𝕏 and support our work with a{" "}
      <a
        aria-label="Send Lightning tip to gildedpleb@getalby.com"
        href="lightning:gildedpleb@getalby.com"
        tabIndex={0}
      >
        tip!
      </a>
    </p>
    <p>
      The GildedPleb project is always looking for collaboration opportunities.
      If you like what you have seen here, do not hesitate to reach out!
    </p>
  </StyledS>
);

export const slide21 = {
  component: Slide21,
  requirements: {} satisfies SlideRequirement,
};
