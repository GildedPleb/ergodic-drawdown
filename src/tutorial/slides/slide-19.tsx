/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";
import styled from "styled-components";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const StyledS = styled.strong`
  justify-self: center;
  align-self: center;
`;

const Slide19: FC = () => (
  <SlideContent>
    <p>
      Assuming 8% inflation, what can you do to last till 110? There are many
      ways to skin this cat. How would you do it?
    </p>
    <p>
      Solving the above problem is hard. Thankfully, Bitcioners are used to
      doing things the hard way, and this is why this app defaults inflation to
      8%.
    </p>
    <p>
      On a lighter note, there is a way to end this problem for all peoples,
      forever, <strong>flip tables</strong>:
    </p>
    <p />
    <p />
    <StyledS>FIAT DELENDA EST</StyledS>
  </SlideContent>
);

export const slide19 = {
  component: Slide19,
  requirements: {
    inflation: 8,
  } satisfies SlideRequirement,
};
