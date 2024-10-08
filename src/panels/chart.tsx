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

import { isMobile } from "../constants";
import { useComputedValues } from "../contexts/computed";

const watermarkPlugin = {
  afterDraw: (chart: ChartJS) => {
    const context = chart.ctx;
    context.save();
    const text = `${isMobile() ? "" : "gildedpleb.github.io/ergodic-drawdown | "}@gildedpleb `;
    const fontSize = isMobile() ? 10 : 18;
    context.font = `${fontSize}px Arial`;
    context.textAlign = "right";
    context.textBaseline = "bottom";
    context.fillStyle = "#999";
    const x = chart.chartArea.right;
    const y = chart.chartArea.bottom;
    context.fillText(text, x, y);
    context.restore();
  },
  id: "watermark",
};

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
  watermarkPlugin,
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
