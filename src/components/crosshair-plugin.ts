import { type Chart as ChartJS, type ChartEvent, type Plugin } from "chart.js";

declare module "chart.js" {
  interface Chart {
    crosshairX: null | number;
    crosshairY: null | number;
    drawCrosshair: boolean;
  }
}

interface CrosshairOptions {
  backgroundColor: string;
  color: string;
  dash: number[];
  fontColor: string;
  fontFamily: string;
  fontSize: number;
  padding: number;
  width: number;
}

export const crosshairPlugin: Plugin<"line"> = {
  afterDatasetsDraw(chart: ChartJS, _, options: CrosshairOptions) {
    const { chartArea, ctx, scales } = chart;
    const { bottom, left, right, top } = chartArea;

    if (
      !chart.drawCrosshair ||
      chart.crosshairX === null ||
      chart.crosshairY === null
    ) {
      return;
    }

    const x = chart.crosshairX;
    const y = chart.crosshairY;

    // Setup text rendering
    ctx.font = `${options.fontSize}px ${options.fontFamily}`;
    ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Get values from scales
    const xValue = scales.x.getValueForPixel(x);
    const yValue = scales.y.getValueForPixel(y);
    const y1Value = scales.y1.getValueForPixel(y);

    // Format values
    const xText = typeof xValue === "number" ? xValue : Number(xValue);
    const yText =
      typeof yValue === "number" ? yValue.toFixed(0) : String(yValue);
    const y1Text =
      typeof y1Value === "number" ? y1Value.toFixed(2) : String(xValue);

    // Measure the Y-axis text width
    const formattedYText = `$${Number(yText).toLocaleString()}`;
    const textMetrics = ctx.measureText(formattedYText);
    const textWidth = textMetrics.width;
    const textPadding = options.padding;

    // Format and measure X-axis text (date)
    const date = new Date(xText);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    const xTextMetrics = ctx.measureText(formattedDate);
    const xTextWidth = xTextMetrics.width;
    const rotatedTextHeight =
      xTextWidth * Math.cos(Math.PI / 2) + options.fontSize;

    // Draw crosshair
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = options.width;
    ctx.strokeStyle = options.color;
    ctx.setLineDash(options.dash);

    // Vertical line
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom - rotatedTextHeight - 60);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(left + textWidth + textPadding * 2, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    // Draw X value at bottom
    ctx.save();
    ctx.translate(x, bottom + options.fontSize - 75);
    ctx.rotate(-(Math.PI / 2));
    ctx.textAlign = "right";
    ctx.fillText(formattedDate, 0, 0);
    ctx.restore();

    // Draw Y value at left
    ctx.textAlign = "left";
    ctx.fillText(formattedYText, left + options.padding - 1, y);

    // Draw Y1 value at right if it exists
    ctx.fillText(y1Text, right + options.padding, y);
    ctx.restore();
  },

  afterEvent(chart: ChartJS, events: { event: ChartEvent }) {
    const { chartArea } = chart;
    const { bottom, left, right, top } = chartArea;
    const { x, y } = events.event;

    // Check if mouse is in chart area
    const inChartArea = Boolean(
      x !== null &&
        y !== null &&
        x >= left &&
        x <= right &&
        y >= top &&
        y <= bottom,
    );

    // Update crosshair position
    chart.crosshairX = x;
    chart.crosshairY = y;
    chart.drawCrosshair = inChartArea;

    chart.draw();
  },

  beforeInit(chart: ChartJS) {
    chart.drawCrosshair = false;
  },

  defaults: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    color: "rgba(100, 100, 100, 0.5)",
    dash: [0, 0],
    fontColor: "#666",
    fontFamily: "Arial",
    fontSize: 12,
    padding: 4,
    width: 0.5,
  },

  id: "crosshair",
};
