import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IInflationInput {
  inflation: number;
  setInflation: (value: React.SetStateAction<number>) => void;
  setLoading: (value: React.SetStateAction<boolean>) => void;
}

const InflationInput = ({
  inflation,
  setInflation,
  setLoading,
}: IInflationInput): JSX.Element => {
  const handleInflation: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        const value = Number.parseFloat(event.target.value);
        setInflation(value);
        setLoading(true);
      },
      [setInflation, setLoading],
    );

  return (
    <div className="">
      <label htmlFor="inflation">{inputLabels.inflation}</label>
      <input
        autoComplete="off"
        className="input-number"
        id="inflation"
        onChange={handleInflation}
        onKeyDown={handleEnterKey}
        step="1"
        type="number"
        value={inflation}
      />
    </div>
  );
};

export default InflationInput;
