import "chartjs-adapter-date-fns";

import React from "react";
import styled from "styled-components";

import { isMobile } from "./constants";
import { useProcessing } from "./data/effects";

const Tutorial = React.lazy(async () => import("./tutorial"));
const Model = React.lazy(async () => import("./panels/model"));
const RenderOptions = React.lazy(async () => import("./panels/render"));
const Chart = React.lazy(async () => import("./panels/chart"));
const Drawdown = React.lazy(async () => import("./panels/drawdown"));
const Footer = React.lazy(async () => import("./panels/footer"));
const Results = React.lazy(async () => import("./panels/results"));

const App = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  min-height: 100vh;
  max-height: 100vh;
  min-width: 100vw;
  max-width: 100vw;
  gap: 10px;
  overflow: hidden;
`;

const Top = styled.div`
  width: calc(100vw - 20px);
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 5px 10px;
  ${isMobile() ? "margin-bottom: -20px;" : ""}
`;

const LimitHeight = styled.div<{ $zIndex: number }>`
  max-height: ${isMobile() ? "100%" : "22px"};
  flex: 1;
  min-width: 350px;
  z-index: ${({ $zIndex }) => $zIndex};
`;

const StochasticGraph = (): React.ReactNode => {
  useProcessing();
  return (
    <App>
      <Top>
        <Tutorial />
        <LimitHeight $zIndex={5}>
          <Model />
        </LimitHeight>
        <LimitHeight $zIndex={4}>
          <RenderOptions />
        </LimitHeight>
      </Top>
      <Chart />
      <Drawdown />
      <Results />
      <Footer />
    </App>
  );
};

export default StochasticGraph;
