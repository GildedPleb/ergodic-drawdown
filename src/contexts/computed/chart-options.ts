import { type ChartOptions } from "chart.js";

import { isMobile } from "../../constants";

export const handleChartOptions = (
  _signal: AbortSignal,
  _hash: string,
  halvingAnnotations: Array<Record<string, number | object | string>>,
): ChartOptions<"line"> => {
  const mobile = isMobile();
  const font = {
    // eslint-disable-next-line sonarjs/no-all-duplicated-branches
    size: mobile ? 12 : 12,
  };
  return {
    animation: false,
    maintainAspectRatio: false,
    plugins: {
      annotation: {
        annotations: halvingAnnotations,
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
};
