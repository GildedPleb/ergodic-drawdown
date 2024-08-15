import React, { useCallback, useMemo } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IEpochInput {
  epochCount: number;
  setEpochCount: (value: React.SetStateAction<number>) => void;
  setLoading: (value: React.SetStateAction<boolean>) => void;
}

const EpochInput = ({
  epochCount,
  setEpochCount,
  setLoading,
}: IEpochInput): JSX.Element => {
  const handleEpoch: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = Number.parseInt(event.target.value, 10);
      if (value >= 1 && value <= 100) {
        setEpochCount(value);
        setLoading(true);
      }
    },
    [setEpochCount, setLoading],
  );

  const epochLength = useMemo(
    () => ` (~${epochCount * 4} years)`,
    [epochCount],
  );

  return (
    <div className="input-row">
      <label htmlFor="numberInput">{inputLabels.epoch}</label>
      <input
        autoComplete="off"
        className="input-number"
        id="numberInput"
        max="100"
        min="1"
        onChange={handleEpoch}
        onKeyDown={handleEnterKey}
        type="number"
        value={epochCount}
      />
      {epochLength}
    </div>
  );
};

export default EpochInput;
