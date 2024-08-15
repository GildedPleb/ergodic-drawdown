import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IRenderPriceWalks {
  renderPriceWalks: boolean;
  setRenderPriceWalks: (value: React.SetStateAction<boolean>) => void;
}

const RenderPriceWalkInput = ({
  renderPriceWalks,
  setRenderPriceWalks,
}: IRenderPriceWalks): JSX.Element => {
  const handleRenderPriceWalks: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderPriceWalks(event.target.checked);
      },
      [setRenderPriceWalks],
    );

  return (
    <div className="input-row">
      <label htmlFor="renderWalk">{inputLabels.renderWalk}</label>
      <input
        autoComplete="off"
        checked={renderPriceWalks}
        id="renderWalk"
        onChange={handleRenderPriceWalks}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderPriceWalkInput;
