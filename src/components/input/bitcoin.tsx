import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IBitcoinInput {
  bitcoin: number;
  setBitcoin: (value: React.SetStateAction<number>) => void;
  setLoading: (value: React.SetStateAction<boolean>) => void;
}

const BitcoinInput = ({
  bitcoin,
  setBitcoin,
  setLoading,
}: IBitcoinInput): JSX.Element => {
  const handleBtc: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = Number.parseFloat(event.target.value);
      if (value >= 0) {
        setBitcoin(value);
        setLoading(true);
      } else setBitcoin(0);
    },
    [setBitcoin, setLoading],
  );

  return (
    <div className="">
      <label htmlFor="totalBitcoin">{inputLabels.totalBitcoin}</label>
      <input
        autoComplete="off"
        className="input-number"
        id="totalBitcoin"
        min="0"
        onChange={handleBtc}
        onKeyDown={handleEnterKey}
        step="1"
        type="number"
        value={bitcoin}
      />
    </div>
  );
};

export default BitcoinInput;
