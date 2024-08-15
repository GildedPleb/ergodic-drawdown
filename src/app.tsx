import "./App.css";
import "chartjs-adapter-date-fns";

import React from "react";

import ForkUs from "./components/fork-us";
import useProcessing from "./data/effects";

const Header = React.lazy(async () => import("./panels/header"));
const Tutorial = React.lazy(async () => import("./panels/tutorial"));
const PriceModel = React.lazy(async () => import("./panels/price-model"));
const RenderOptions = React.lazy(async () => import("./panels/render-options"));
const Chart = React.lazy(async () => import("./panels/chart"));
const Drawdown = React.lazy(async () => import("./panels/drawdown"));
const More = React.lazy(async () => import("./panels/More"));
const PayMe = React.lazy(async () => import("./panels/pay-me"));
const Summary = React.lazy(async () => import("./panels/summary"));
const Legal = React.lazy(async () => import("./panels/legal"));

const StochasticGraph = (): React.ReactNode => {
  console.time("render");
  useProcessing();
  console.timeEnd("render");

  return (
    <div className="container">
      <Header />
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/no-redundant-boolean */}
      {false && <Tutorial />}
      <PriceModel />
      <RenderOptions />
      <Chart />
      <Drawdown />
      <Summary />
      <More />
      <PayMe />
      <ForkUs />
      <Legal />
    </div>
  );
};

export default StochasticGraph;
