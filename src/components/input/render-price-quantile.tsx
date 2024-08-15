import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IRenderQuantile {
  renderPriceQuantile: boolean;
  setRenderPriceQuantile: (value: React.SetStateAction<boolean>) => void;
}

const RenderPriceQuantileInput = ({
  renderPriceQuantile,
  setRenderPriceQuantile,
}: IRenderQuantile): JSX.Element => {
  const handleRenderPriceQuantile: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderPriceQuantile(event.target.checked);
      },
      [setRenderPriceQuantile],
    );

  return (
    <div className="input-row">
      <label htmlFor="renderPriceWalkQuantile">
        {inputLabels.renderWalkQuantile}
      </label>
      <input
        autoComplete="off"
        checked={renderPriceQuantile}
        id="renderPriceWalkQuantile"
        onChange={handleRenderPriceQuantile}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderPriceQuantileInput;
