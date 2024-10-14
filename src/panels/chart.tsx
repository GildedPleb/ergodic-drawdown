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

const StyledLine = styled(Line)``;

const defaultCart = { datasets: [] };

const Chart = (): JSX.Element => {
  const { chartOptions, dataProperties } = useComputedValues();
  return (
    <Container>
      {chartOptions !== null && (
        <StyledLine
          data={dataProperties ?? defaultCart}
          options={chartOptions}
        />
      )}
    </Container>
  );
};

export default Chart;
