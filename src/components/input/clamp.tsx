import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IClampInput {
  clampBottom: boolean;
  clampTop: boolean;
  setClampBottom: (value: React.SetStateAction<boolean>) => void;
  setClampTop: (value: React.SetStateAction<boolean>) => void;
  setLoading: (value: React.SetStateAction<boolean>) => void;
}

const ClampInput = ({
  clampBottom,
  clampTop,
  setClampBottom,
  setClampTop,
  setLoading,
}: IClampInput): JSX.Element => {
  const handleClampTop: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setClampTop(event.target.checked);
        setLoading(true);
      },
      [setClampTop, setLoading],
    );

  const handleClampBottom: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setClampBottom(event.target.checked);
      },
      [setClampBottom],
    );

  return (
    <div className="input-row start">
      <label htmlFor="clampTop">{inputLabels.clampTop}</label>
      <input
        autoComplete="off"
        checked={clampTop}
        id="clampTop"
        onChange={handleClampTop}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
      <label htmlFor="clampBottom">{inputLabels.clampBottom}</label>
      <input
        autoComplete="off"
        checked={clampBottom}
        id="clampBottom"
        onChange={handleClampBottom}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default ClampInput;
