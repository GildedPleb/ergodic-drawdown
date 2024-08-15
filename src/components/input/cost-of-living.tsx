import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface ICostOfLivingInput {
  costOfLiving: number;
  setCostOfLiving: (value: React.SetStateAction<number>) => void;
  setLoading: (value: React.SetStateAction<boolean>) => void;
}

const CostOfLivingInput = ({
  costOfLiving,
  setCostOfLiving,
  setLoading,
}: ICostOfLivingInput): JSX.Element => {
  const handleCostOfLiving: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        const value = Number.parseFloat(event.target.value);
        if (value >= 0) {
          setCostOfLiving(value);
          setLoading(true);
        }
      },
      [setCostOfLiving, setLoading],
    );

  return (
    <div className="expenses-input">
      <label htmlFor="costOfLiving">{inputLabels.costOfLiving}</label>
      <input
        autoComplete="off"
        className="input-number"
        id="costOfLiving"
        min="0"
        onChange={handleCostOfLiving}
        onKeyDown={handleEnterKey}
        step="10000"
        type="number"
        value={costOfLiving}
      />
    </div>
  );
};

export default CostOfLivingInput;
