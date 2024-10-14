/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @shopify/strict-component-boundaries */

import { useCallback } from "react";
import styled from "styled-components";

import CaretSVG from "../components/caret";
import RenderDrawdownDistribution from "../components/input/render-drawdown-distribution";
import RenderDrawdownWalksInput from "../components/input/render-drawdown-walks";
import RenderModelMaxInput from "../components/input/render-model-max";
import RenderModelMinInput from "../components/input/render-model-min";
import RenderPriceDistribution from "../components/input/render-price-distributions";
import RenderPriceWalkInput from "../components/input/render-price-walks";
import RenderSampleCount from "../components/input/render-sample-count";
import { isMobile } from "../constants";
import { fieldLabels } from "../content";
import { useDrawdown } from "../contexts/drawdown";
import { useModel } from "../contexts/model";
import { useRender } from "../contexts/render";

const Container = styled.fieldset<{ $isOpen: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid gray;
  gap: 10px;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 5px;
  max-height: ${({ $isOpen }) => ($isOpen ? "200px" : "22px")};
  padding-bottom: ${({ $isOpen }) => ($isOpen ? "10px" : "0px")};
  margin-bottom: 20px;
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

const TopBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0px 10px;
`;

const InnerFieldset = styled.fieldset`
  max-width: min(85vw, 1000px);
  display: flex;
  border: 1px solid gray;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 10px;
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
  const { setHideResults, setShowRender, showRender } = useRender();
  const { setShowModel } = useModel();
  const { setShowDrawdown } = useDrawdown();

  const toggleModelExpansion = useCallback(() => {
    if (isMobile()) {
      if (showRender) {
        setShowDrawdown(true);
        setHideResults(false);
      } else {
        setHideResults(true);
        setShowDrawdown(false);
      }
      setShowModel(false);
    }
    setShowRender(!showRender);
  }, [
    setHideResults,
    setShowDrawdown,
    setShowModel,
    setShowRender,
    showRender,
  ]);

  return (
    <Container $isOpen={showRender}>
      <Legend onClick={toggleModelExpansion}>
        {fieldLabels.render}
        <CaretSVG $isOpen={showRender} />
      </Legend>
      <TopBox>
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
      </TopBox>
      <StandAlone>
        <RenderModelMaxInput />
        <RenderModelMinInput />
        <RenderSampleCount />
      </StandAlone>
    </Container>
  );
};

export default RenderOptions;
