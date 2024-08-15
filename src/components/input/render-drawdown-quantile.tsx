import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";
// eslint-disable-next-line functional/no-mixed-types
interface IRenderQuantile {
  renderQuantile: boolean;
  setRenderQuantile: (value: React.SetStateAction<boolean>) => void;
}

const RenderDrawdownQuantileInput = ({
  renderQuantile,
  setRenderQuantile,
}: IRenderQuantile): JSX.Element => {
  const handleRenderQuantile: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderQuantile(event.target.checked);
      },
      [setRenderQuantile],
    );
  return (
    <div className="input-row">
      <label htmlFor="renderQuantile">{inputLabels.renderQuantile}</label>
      <input
        autoComplete="off"
        checked={renderQuantile}
        id="renderQuantile"
        onChange={handleRenderQuantile}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderDrawdownQuantileInput;
