import React, { useCallback, useMemo } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IVolInput {
  setLoading: (value: React.SetStateAction<boolean>) => void;
  setVolatility: (value: React.SetStateAction<number>) => void;
  volatility: number;
  walk: string;
}

const VolInput = ({
  setLoading,
  setVolatility,
  volatility,
  walk,
}: IVolInput): JSX.Element => {
  const handleVol: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = Number.parseFloat(event.target.value);
      if (value >= 0 && value <= 1) {
        setLoading(true);
        setVolatility(value);
      }
    },
    [setLoading, setVolatility],
  );

  const volStep = useMemo(() => (walk === "Bubble" ? 0.005 : 0.001), [walk]);

  return (
    <div className="input-row">
      <label htmlFor="volInput">{inputLabels.vol}</label>
      <input
        autoComplete="off"
        className="input-number"
        id="volInput"
        max="1"
        min="0"
        onChange={handleVol}
        onKeyDown={handleEnterKey}
        step={volStep}
        type="number"
        value={volatility}
      />
    </div>
  );
};

export default VolInput;
