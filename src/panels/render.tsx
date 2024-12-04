/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @shopify/strict-component-boundaries */

import { useCallback } from "react";
import styled from "styled-components";

import CaretSVG from "../components/caret";
import RenderDrawdownDistribution from "../components/input/render-drawdown-distribution";
import RenderDrawdownWalksInput from "../components/input/render-drawdown-walks";
import RenderHistoric from "../components/input/render-historic";
import RenderModelMaxInput from "../components/input/render-model-max";
import RenderModelMinInput from "../components/input/render-model-min";
import RenderPriceDistribution from "../components/input/render-price-distributions";
import RenderPriceWalkInput from "../components/input/render-price-walks";
import RenderShowResults from "../components/input/render-results";
import RenderSampleCount from "../components/input/render-sample-count";
import { isMobile } from "../constants";
import { fieldLabels } from "../content";
import { useDrawdown } from "../contexts/drawdown";
import { useModel } from "../contexts/model";
import { useRender } from "../contexts/render";

const Container = styled.fieldset<{ $isOpen: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid gray;
  gap: 10px;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 5px;
  max-height: ${({ $isOpen }) => ($isOpen ? "240px" : "22px")};
  padding-bottom: ${({ $isOpen }) => ($isOpen ? "10px" : "0px")};
  margin-bottom: 5px;
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding-bottom 0.4s ease-in-out,
    margin-bottom 0.4s ease-in-out;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  background-color: rgba(36, 36, 36, 0.5);
`;

const Legend = styled.legend`
  cursor: pointer;
  padding-inline-start: 10px;
  padding-inline-end: 7px;
`;

const InnerFieldset = styled.fieldset`
  max-width: min(85vw, 1000px);
  display: flex;
  border: 1px solid gray;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 5px;
  flex-direction: row;
  align-content: baseline;
  flex-grow: 1;
  align-self: stretch;
  justify-content: flex-start;
  gap: 0px 10px;
`;

const StandAlone = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0px 10px;
`;

const RenderOptions = (): JSX.Element => {
  const { setShowRender, showRender } = useRender();
  const { setShowModel } = useModel();
  const { setShowDrawdown } = useDrawdown();

  const toggleModelExpansion = useCallback(() => {
    if (isMobile()) {
      if (showRender) {
        setShowDrawdown(true);
      } else {
        setShowDrawdown(false);
      }
      setShowModel(false);
    }
    setShowRender(!showRender);
  }, [setShowDrawdown, setShowModel, setShowRender, showRender]);

  return (
    <Container $isOpen={showRender}>
      <Legend onClick={toggleModelExpansion}>
        {fieldLabels.render}
        <CaretSVG $isOpen={showRender} />
      </Legend>
      <InnerFieldset>
        <Legend>{fieldLabels.model}</Legend>
        <RenderHistoric />
        <RenderModelMaxInput />
        <RenderModelMinInput />
      </InnerFieldset>
      <InnerFieldset>
        <Legend>{fieldLabels.price}</Legend>
        <RenderPriceWalkInput />
        <RenderPriceDistribution />
      </InnerFieldset>
      <InnerFieldset>
        <Legend>{fieldLabels.drawdown}</Legend>
        <RenderDrawdownWalksInput />
        <RenderDrawdownDistribution />
      </InnerFieldset>
      <StandAlone>
        <RenderSampleCount />
        <RenderShowResults />
      </StandAlone>
    </Container>
  );
};

export default RenderOptions;
