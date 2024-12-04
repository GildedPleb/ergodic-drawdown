import { type ChartOptions } from "chart.js";
import { type LineAnnotationOptions } from "chartjs-plugin-annotation";

import { isMobile, MS_PER_WEEK, MS_PER_YEAR } from "../../constants";
import { generateColor } from "../../helpers";
import { type OneOffItem, type ReoccurringItem } from "../../types";

const annotationColor = "rgba(255, 99, 132, 0.2)";

const createDateLabel = (date: Date): string => {
  const today = new Date();

  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return "";
  }

  return date.toLocaleString().split(",")[0];
};

const createVerticalAnnotation = (
  value: number,
  color: string,
  labelContent: string,
): LineAnnotationOptions => ({
  borderColor: color,
  borderWidth: 1,
  label: {
    backgroundColor: "transparent",
    color,
    content: labelContent,
    display: true,
    font: {
      size: 12,
      weight: "bold",
    },
    position: "end",
    rotation: -90,
    xAdjust: 10,
    yAdjust: 0,
  },
  scaleID: "x",
  value,
});

const createHorizontalAnnotation = (
  xMin: number,
  xMax: number,
  color: string,
  labelContent: string,
  index: number,
  startArrow: boolean,
): LineAnnotationOptions => ({
  arrowHeads: {
    end: {
      backgroundColor: "red",
      display: true,
      length: 6,
      width: 3,
    },
    start: {
      backgroundColor: "red",
      display: startArrow,
      length: 6,
      width: 3,
    },
  },
  borderColor: color,
  borderWidth: 1,
  label: {
    backgroundColor: "transparent",
    color,
    content: labelContent,
    display: true,
    position: "center",
    yAdjust: -10,
  },
  xMax,
  xMin,
  yMax: window.innerHeight / 2 - 20 * (index + 1),
  yMin: window.innerHeight / 2 - 20 * (index + 1),
  yScaleID: "y2",
});

const generateReoccurringItemAnnotations = (
  reoccurringItems: ReoccurringItem[],
  oneOffItems: OneOffItem[],
  dataLength: number,
  fiatVariable: Array<{ effectiveWeek: number; endWeek: number; name: string }>,
  now: number,
): LineAnnotationOptions[] => {
  const allItems = [...reoccurringItems, ...fiatVariable, ...oneOffItems];

  return allItems.flatMap((item, index) => {
    if ("active" in item && !item.active) return [];

    const color = generateColor(index, 0.5);
    if ("effectiveWeek" in item) {
      const startTime = now + item.effectiveWeek * MS_PER_WEEK;
      const endTime = now + item.endWeek * MS_PER_WEEK;
      return [
        createVerticalAnnotation(
          startTime,
          color,
          createDateLabel(new Date(startTime)),
        ),
        createHorizontalAnnotation(
          startTime,
          endTime,
          color,
          item.name,
          index,
          true,
        ),
        createVerticalAnnotation(
          endTime,
          color,
          createDateLabel(new Date(endTime)),
        ),
      ];
    } else {
      const startTime = item.effective.getTime();
      if ("amountToday" in item) {
        return [
          {
            ...createVerticalAnnotation(startTime, color, ""),
            label: {
              ...createVerticalAnnotation(startTime, color, "").label,
              content: `${item.name} - ${createDateLabel(new Date(startTime))}`,
              position: "center",
              xAdjust: -10,
            },
          },
        ];
      } else {
        const endTime =
          item.end === undefined
            ? new Date(Date.now() + dataLength * MS_PER_WEEK).getTime()
            : item.end.getTime();
        const annotations = [
          createVerticalAnnotation(
            startTime,
            color,
            createDateLabel(new Date(startTime)),
          ),
          createHorizontalAnnotation(
            startTime,
            endTime,
            color,
            item.name,
            index,
            false,
          ),
        ];
        if (item.end !== undefined) {
          annotations.push(
            createVerticalAnnotation(
              endTime,
              color,
              createDateLabel(new Date(endTime)),
            ),
          );
        }
        return annotations;
      }
    }
  });
};

export const handleChartOptions = (
  _signal: AbortSignal,
  _hash: string,
  halvingAnnotations: LineAnnotationOptions[],
  time: number,
  reoccurringItems: ReoccurringItem[],
  dataLength: number,
  oneOffItems: OneOffItem[],
  showModel: boolean,
  fiatVariable: Array<{ effectiveWeek: number; endWeek: number; name: string }>,
  showHistoric: boolean,
): ChartOptions<"line"> => {
  const mobile = isMobile();
  const font = {
    // eslint-disable-next-line sonarjs/no-all-duplicated-branches
    size: mobile ? 12 : 12,
  };
  return {
    plugins: {
      annotation: {
        annotations: [
          createVerticalAnnotation(time, annotationColor, "Today"),
          ...(showModel
            ? []
            : generateReoccurringItemAnnotations(
                reoccurringItems,
                oneOffItems,
                dataLength,
                fiatVariable,
                time,
              )),
          ...(showHistoric ? halvingAnnotations : []),
        ],
      },
      decimation: {
        enabled: true,
      },
      filler: { propagate: true },
      zoom: mobile
        ? {}
        : {
            pan: { enabled: true, mode: "x" },
            zoom: {
              mode: "x",
              pinch: { enabled: true },
              wheel: { enabled: true, speed: 0.1 },
            },
          },
    },
    scales: {
      x: {
        min: showHistoric
          ? "2010-01-01"
          : new Date(Date.now() - MS_PER_YEAR * 3).toISOString().split("T")[0],
        ticks: {
          autoSkipPadding: 40,
          callback: function (value: number | string) {
            const date = new Date(value).toDateString().split(" ");
            return `${date[1]} ${date[3]}`;
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
          mirror: true,
        },
        title: {
          display: true,
          font,
          padding: { bottom: -5 },
          text: "Price (Log Scale)",
        },
        type: "logarithmic",
      },
      y1: {
        min: 0,
        position: "right",
        ticks: { font, mirror: Boolean(mobile), padding: -3 },
        title: { display: true, font, text: "BTC Volume" },
        type: "linear",
      },
      y2: {
        display: false,
        min: 0,
        position: "right",
        type: "linear",
      },
    },
  } satisfies ChartOptions<"line">;
};
