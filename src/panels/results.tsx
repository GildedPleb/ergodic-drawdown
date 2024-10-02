import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import CaretSVG from "../components/caret";
import { MS_PER_WEEK } from "../constants";
import { useComputedValues } from "../contexts/computed";
import { useDrawdown } from "../contexts/drawdown";
import { useModel } from "../contexts/model";
import { useRender } from "../contexts/render";
import { useTime } from "../contexts/time";
import { useVolumeData } from "../contexts/volume";

const FloatBox = styled.fieldset<{ $isDragging: boolean; $isOpen: boolean }>`
  position: absolute;
  cursor: ${({ $isDragging }) => ($isDragging ? "grabbing" : "grab")};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  background-color: rgba(36, 36, 36, 0.5);
  border-radius: 2px;
  border: 1px solid grey;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 3;
  font-size: 0.8rem;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 5px;
  max-height: ${({ $isOpen }) => ($isOpen ? "175px" : "22px")};
  max-width: ${({ $isOpen }) => ($isOpen ? "350px" : "100px")};
  min-width: 100px;
  padding-bottom: ${({ $isOpen }) => ($isOpen ? "10px" : "0px")};
  margin-bottom: 20px;
  overflow: hidden;
  transition:
    max-height 0.4s ease-in-out,
    padding-bottom 0.4s ease-in-out,
    margin-bottom 0.4s ease-in-out,
    max-width 0.4s ease-in-out;

  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
`;

const Legend = styled.legend`
  padding-inline-start: 10px;
  padding-inline-end: 7px;
  cursor: pointer;
  font-size: 1rem;
`;

const Content = styled.div`
  padding-right: 4px;
`;

const Summary = (): JSX.Element => {
  const [position, setPosition] = useState({
    x: window.innerWidth / 8,
    y: window.innerHeight / 2,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragReference = useRef<{ x: number; y: number } | null>(null);

  const { setShowResults, showResults } = useRender();

  const { loadingVolumeData } = useVolumeData();
  const { volumeStats, zeroCount } = useComputedValues();

  const average = volumeStats === null ? 0 : volumeStats.average;
  const median = volumeStats === null ? 0 : volumeStats.median;
  const zero = zeroCount === null ? 0 : zeroCount.zero;

  const { bitcoin, inflation } = useDrawdown();
  const { model, samples, walk } = useModel();
  const now = useTime();
  const { dataLength, priceData } = useComputedValues();

  const expired = new Date(now + dataLength * MS_PER_WEEK)
    .toDateString()
    .slice(-4);

  const escapeVelocity = useMemo(
    () =>
      loadingVolumeData || samples === 0 ? (
        <div className="loader" />
      ) : (
        `${(100 - (zero / samples) * 100).toFixed(2)}% chance of not exhausting bitcoin holdings ${expired === "" ? expired : "by " + expired}
        with an average of ${Number.isNaN(average) ? bitcoin : average.toFixed(4)} Bitcoin left
        (median ${Number.isNaN(median) ? bitcoin : median.toFixed(4)}),
        expecting ${inflation}% inflation per year,
        assuming ${model} modeling and a ${walk} walk strategy.`
      ),
    [
      loadingVolumeData,
      zero,
      expired,
      average,
      bitcoin,
      median,
      inflation,
      model,
      walk,
      samples,
    ],
  );

  const bitcoinWorth =
    (Number.isNaN(average) ? bitcoin : average) *
    (priceData === null ? 0 : priceData[0]?.at(-1) ?? 0);

  const balanceWorth = useMemo(
    () =>
      loadingVolumeData || samples === 0 ? (
        <div />
      ) : (
        `Remaining average worth $${Number(bitcoinWorth.toFixed(2)).toLocaleString()}
        in ${expired} dollars`
      ),
    [bitcoinWorth, expired, loadingVolumeData, samples],
  );

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      dragReference.current = {
        x: clientX - position.x,
        y: clientY - position.y,
      };
    },
    [position.x, position.y],
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (isDragging && dragReference.current !== null) {
        setPosition({
          x: clientX - dragReference.current.x,
          y: clientY - dragReference.current.y,
        });
      }
    },
    [isDragging],
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    // eslint-disable-next-line unicorn/no-null
    dragReference.current = null;
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handleStart(event.clientX, event.clientY);
    },
    [handleStart],
  );

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent): void => {
      handleMove(event.clientX, event.clientY);
    };

    const handleGlobalMouseUp = (): void => {
      handleEnd();
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      event.stopPropagation();
      const touch = event.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const touch = event.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove],
  );

  const preventDefault = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  const toggleMinimize = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      setShowResults(!showResults);
    },
    [showResults, setShowResults],
  );

  const moveStyle = useMemo(
    () => ({
      left: `${position.x}px`,
      top: `${position.y}px`,
    }),
    [position.x, position.y],
  );

  const results = "Results";

  return (
    <FloatBox
      $isDragging={isDragging}
      $isOpen={showResults}
      onMouseDown={handleMouseDown}
      onTouchEnd={handleEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      style={moveStyle}
    >
      <Legend onClick={toggleMinimize} onMouseDown={preventDefault}>
        {results}
        <CaretSVG $isOpen={showResults} />
      </Legend>
      <Content>
        <span>{escapeVelocity}</span>
        <br />
        <br />
        <span>{balanceWorth}</span>
      </Content>
    </FloatBox>
  );
};

export default Summary;
