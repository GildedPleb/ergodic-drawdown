import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface ISampleInput {
  samples: number;
  setLoading: (value: React.SetStateAction<boolean>) => void;
  setSamples: (value: React.SetStateAction<number>) => void;
}

const SampleInput = ({
  samples,
  setLoading,
  setSamples,
}: ISampleInput): JSX.Element => {
  const handleSamples: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.target.value === "") {
        setSamples(1000);
        return;
      }
      const value = Number.parseInt(event.target.value, 10);
      if (value >= 0 && value <= 10_000) {
        setLoading(true);
        setSamples(value);
      }
    },
    [setLoading, setSamples],
  );

  return (
    <div className="input-row">
      <label htmlFor="sampleInput">{inputLabels.samples}</label>
      <input
        autoComplete="off"
        className="input-number"
        id="sampleInput"
        max="10000"
        min="1000"
        onChange={handleSamples}
        onKeyDown={handleEnterKey}
        type="number"
        value={samples}
      />
    </div>
  );
};

export default SampleInput;
