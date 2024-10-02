import {
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
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
import { useCallback, useMemo } from "react";
import { Line } from "react-chartjs-2";
import styled from "styled-components";

import { isMobile } from "../constants";
import { useDataProperties } from "../data/datasets";
import { useHalvings } from "../data/effects/use-halvings";

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

const Chart = (): JSX.Element => {
  const dataProperties = useDataProperties();
  const { halvings } = useHalvings();
  const mobile = isMobile();
  const annotations = useCallback(
    (): Array<Record<string, number | object | string>> =>
      Object.entries(halvings).map(([, timestamp], index) => ({
        borderWidth: 0.5,
        label: {
          content: `Halving ${index + 1}`,
          position: "center",
        },
        scaleID: "x",
        type: "line",
        value: timestamp * 1000,
      })),
    [halvings],
  );

  const options = useMemo(() => {
    const font = {
      // eslint-disable-next-line sonarjs/no-all-duplicated-branches
      size: mobile ? 12 : 12,
    };
    return {
      animation: false,
      maintainAspectRatio: false,
      plugins: {
        annotation: {
          annotations: annotations(),
        },
        filler: {
          propagate: true,
        },
        zoom: mobile
          ? {}
          : {
              pan: {
                enabled: true,
                mode: "x",
              },
              zoom: {
                mode: "x",
                pinch: { enabled: true },
                wheel: { enabled: true, speed: 0.1 },
              },
            },
      },
      responsive: true,
      scales: {
        x: {
          min: "2010-01-01",
          ticks: {
            autoSkipPadding: 40,
            callback: function (value: number | string) {
              const date = new Date(value).toDateString().split(" ");
              return `${date[1]} ${date[3]}`;
              // return `${date[3]}`;
            },
            font,
            labelOffset: 25,
            maxRotation: 0,
          },
          time: {
            parser: "yyyy-mm-dd",
            tooltipFormat: "MM/dd/yyyy",
            unit: "week",
          },
          title: { display: false, text: "Date" },
          type: "time",
        },
        y: {
          ticks: {
            autoSkipPadding: 30,
            callback: (value: number | string) => {
              const numericValue =
                typeof value === "string" ? Number.parseFloat(value) : value;
              return `$${numericValue.toLocaleString()}`;
            },
            font,
            // minRotation: 60,
            mirror: true,
          },
          title: {
            display: true,
            font,
            padding: {
              bottom: -5,
            },
            // margin: {
            //   bottom -10,
            // },
            text: "Price (Log Scale)",
          },
          type: "logarithmic",
        },
        y1: {
          // beginAtZero: true,
          // min: 0,
          position: "right",
          ticks: {
            font,
            mirror: Boolean(mobile),
            padding: -3,
          },
          title: {
            display: true,
            font,
            text: "BTC Volume",
          },
          type: "linear",
        },
      },
    } satisfies ChartOptions<"line">;
  }, [annotations, mobile]);

  // eslint-disable-next-line react/react-in-jsx-scope
  return (
    <Container>
      <StyledLine data={dataProperties} options={options} />
    </Container>
  );
};

export default Chart;
