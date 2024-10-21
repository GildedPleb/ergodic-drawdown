import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  LogarithmicScale,
  PointElement,
  TimeScale,
  Tooltip,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoom from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import styled from "styled-components";

import { useComputedValues } from "../contexts/computed";
import { type DatasetList } from "../types";

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
  width: 100vw;
  height: 40vh;
  flex: 1;
  transition: all 0.4s ease-in-out;
`;
const defaultData = { datasets: [] as DatasetList };

const Chart = (): JSX.Element => {
  const { chartOptions, dataProperties } = useComputedValues();
  return (
    <Container>
      {/*
        Rendering the chart without options, or with default options, will
        create a chart that will essentially be stuck with the default options
        while annotations pipe through.
      */}
      {chartOptions !== null && (
        <Line data={dataProperties ?? defaultData} options={chartOptions} />
      )}
    </Container>
  );
};

export default Chart;
