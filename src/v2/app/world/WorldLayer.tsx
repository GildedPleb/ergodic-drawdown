import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { TextButton } from "../../design/primitives/TextButton";
import type { InputsPhase } from "../engine/inputs";
import { strings } from "../strings";
import type { PriceBands } from "./bands";
import { drawWorld, readPaint } from "./draw";
import styles from "./WorldLayer.module.css";

export type WorldLayerProps = {
  bands: PriceBands | null;
  now: number;
  horizon: number;
  /** The headline sentence: the chart's accessible name (§1i). */
  label: string;
  /** §1h Chart · no data: "slow" and "failed" put a caption over the empty frame. */
  phase?: InputsPhase;
  onRetry?: () => void;
};

/** The empty frame's caption (Form n11): text, and on failure a quiet "Try again" button. */
const Status = ({ phase, onRetry }: { phase: InputsPhase; onRetry: () => void }): JSX.Element => {
  const note = styles["status"] ?? "world-status";
  const again = styles["retry"] ?? "world-retry";
  return (
    <div className={note} role="status" data-phase={phase}>
      {phase === "slow" ? <span>{strings.chart.loading}</span> : null}
      {phase === "failed" ? (
        <>
          <span>{strings.chart.failed}</span>
          <span className={again}>
            <TextButton label={strings.chart.tryAgain} onClick={onRetry} />
          </span>
        </>
      ) : null}
    </div>
  );
};

const noRetry = (): void => undefined;

/**
 * The world layer (V32-BUILD §1b) in v32's #w / ly-front / ly-back structure. Slice 1 has one
 * layer, always in front; Slice 2 adds the drawdown layer behind it and the swap.
 */
export const WorldLayer = ({
  bands,
  now,
  horizon,
  label,
  phase = "ready",
  onRetry = noRetry,
}: WorldLayerProps): JSX.Element => {
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
    <div ref={box} className={root} data-layer-root="w">
      <div className={front} data-layer="front" role="img" aria-label={label}>
        <canvas ref={canvas} className={surface} />
      </div>
      {phase === "slow" || phase === "failed" ? <Status phase={phase} onRetry={onRetry} /> : null}
    </div>
  );
};
