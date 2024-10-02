/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @shopify/strict-component-boundaries */
import { useCallback } from "react";
import styled from "styled-components";

import CaretSVG from "../components/caret";
import ClampInput from "../components/input/clamp";
import EpochInput from "../components/input/epoch";
import ModelInput from "../components/input/model";
import SampleInput from "../components/input/samples";
import VolInput from "../components/input/volatility";
import WalkInput from "../components/input/walk";
import { fieldLabels } from "../content";
import { useModel } from "../contexts/model";
import ModelSize from "./model-size";

const GhostWrapper = styled.div<{ $isOpen: boolean }>``;

const Container = styled.fieldset<{ $isOpen: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-around;
  border: 1px solid gray;
  gap: 10px;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 5px;
  max-height: ${({ $isOpen }) => ($isOpen ? "220px" : "22px")};
  padding-bottom: ${({ $isOpen }) => ($isOpen ? "10px" : "0px")};
  margin-bottom: ${({ $isOpen }) => ($isOpen ? "20px" : "0px")};
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding-bottom 0.4s ease-in-out,
    margin-bottom 0.4s ease-in-out,
    -webkit-backdrop-filter 0.4s ease-in-out,
    backdrop-filter 0.4s ease-in-out;
  backdrop-filter: blur(${({ $isOpen }) => ($isOpen ? "4px" : "0px")});
  -webkit-backdrop-filter: blur(${({ $isOpen }) => ($isOpen ? "4px" : "0px")});
  background-color: rgba(36, 36, 36, 0.5);
`;

const Legend = styled.legend`
  cursor: pointer;
  padding-inline-start: 10px;
  padding-inline-end: 7px;
`;

const Section = styled.section`
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  gap: 10px;
`;

const PriceModel = (): JSX.Element => {
  const { setShowModel, showModel } = useModel();

  const toggleModelExpansion = useCallback(() => {
    setShowModel(!showModel);
  }, [setShowModel, showModel]);

  return (
    <GhostWrapper $isOpen={showModel}>
      <Container $isOpen={showModel}>
        <Legend onClick={toggleModelExpansion}>
          {fieldLabels.model}
          <CaretSVG $isOpen={showModel} />
        </Legend>
        <Section>
          <ModelInput />
          <WalkInput />
          <ClampInput />
        </Section>
        <Section>
          <VolInput />
          <SampleInput />
          <EpochInput />
        </Section>
      </Container>
      <ModelSize isExpanded={showModel} />
    </GhostWrapper>
  );
};

export default PriceModel;
