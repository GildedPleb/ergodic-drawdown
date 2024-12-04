import {
  CategoryScale,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  Filler,
  LinearScale,
  LineElement,
  LogarithmicScale,
  type Point,
  PointElement,
  TimeScale,
  Tooltip,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoom from "chartjs-plugin-zoom";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import styled from "styled-components";

import { useComputedValues } from "../contexts/computed";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  LogarithmicScale,
  annotationPlugin,
  zoom,
  TimeScale,
  Filler,
);

const Container = styled.section`
  width: 100%;
  height: 100%;
  will-change: height;
  contain: strict;
  transition: all 0.2s ease-in-out;
`;

const defaultData: ChartData<"line", Point[]> = { datasets: [] };

const staticOptions: ChartOptions<"line"> = {
  animation: false,
  // devicePixelRatio: 1, this produces unfavorable results
  maintainAspectRatio: false,
  resizeDelay: 1,
  responsive: true,
};

const Chart = (): JSX.Element => {
  const { chartOptions, dataProperties } = useComputedValues();

  const fullOption = useMemo(
    () => ({ ...chartOptions, ...staticOptions }),
    [chartOptions],
  );

  return (
    <Container>
      {/*
        Rendering the chart without options, or with default options, will
        create a chart that will essentially be stuck with the default options
        while annotations pipe through.
      */}
      {chartOptions !== null && (
        <Line data={dataProperties ?? defaultData} options={fullOption} />
      )}
    </Container>
  );
};

export default Chart;
