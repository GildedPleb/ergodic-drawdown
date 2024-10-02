import "./App.css";
import "chartjs-adapter-date-fns";

import React from "react";
import styled from "styled-components";

// import ForkUs from "./components/fork-us";
import { useProcessing } from "./data/effects";

const Tutorial = React.lazy(async () => import("./tutorial"));
const Model = React.lazy(async () => import("./panels/model"));
const RenderOptions = React.lazy(async () => import("./panels/render"));
const Chart = React.lazy(async () => import("./panels/chart"));
const Drawdown = React.lazy(async () => import("./panels/drawdown"));
// const More = React.lazy(async () => import("./panels/More"));
// const PayMe = React.lazy(async () => import("./panels/pay-me"));
const Results = React.lazy(async () => import("./panels/results"));
// const Legal = React.lazy(async () => import("./panels/legal"));

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
  gap: 10px;
`;

const LimitHeight = styled.div<{ $zIndex: number }>`
  max-height: 22px;
  flex: 1;
  min-width: 350px;

  z-index: ${({ $zIndex }) => $zIndex};
`;

const StochasticGraph = (): React.ReactNode => {
  console.time("render");
  useProcessing();
  console.timeEnd("render");
  return (
    <App>
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/no-redundant-boolean */}
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
      {/* <More /> */}
      {/* <PayMe /> */}
      {/* <ForkUs /> */}
      {/* <Legal /> */}
    </App>
  );
};

export default StochasticGraph;
