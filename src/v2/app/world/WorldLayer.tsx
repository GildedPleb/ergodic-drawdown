import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import type { PriceBands } from "./bands";
import { drawWorld, readPaint } from "./draw";
import styles from "./WorldLayer.module.css";

export type WorldLayerProps = {
  bands: PriceBands | null;
  now: number;
  horizon: number;
  /** The headline sentence: the chart's accessible name (§1i). */
  label: string;
};

/**
 * The world layer (V32-BUILD §1b) in v32's #w / ly-front / ly-back structure. Slice 1 has one
 * layer, always in front; Slice 2 adds the drawdown layer behind it and the swap.
 */
export const WorldLayer = ({ bands, now, horizon, label }: WorldLayerProps): JSX.Element => {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [fonts, setFonts] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (el === null) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry === undefined) return;
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    observer.observe(el);
    void document.fonts.ready.then(() => {
      setFonts((n) => n + 1);
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (c === null || size.w === 0 || size.h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(size.h * dpr);
    const ctx = c.getContext("2d");
    if (ctx === null) return;
    drawWorld(ctx, readPaint(c), { width: size.w, height: size.h, dpr, now, horizon }, bands);
  }, [bands, now, horizon, size, fonts]);

  const root = styles["root"] ?? "world-root";
  const front = styles["front"] ?? "world-front";
  const surface = styles["canvas"] ?? "world-canvas";
  return (
    <div ref={box} className={root} role="img" aria-label={label} data-layer-root="w">
      <div className={front} data-layer="front">
        <canvas ref={canvas} className={surface} />
      </div>
    </div>
  );
};
