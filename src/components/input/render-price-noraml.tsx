import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IRenderPriceNormal {
  renderPriceNormal: boolean;
  setRenderPriceNormal: (value: React.SetStateAction<boolean>) => void;
}

const RenderPriceNormalInput = ({
  renderPriceNormal,
  setRenderPriceNormal,
}: IRenderPriceNormal): JSX.Element => {
  const handleRenderPriceNormal: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderPriceNormal(event.target.checked);
      },
      [setRenderPriceNormal],
    );

  return (
    <div className="input-row">
      <label htmlFor="renderPriceWalkNormal">{inputLabels.renderNormal}</label>
      <input
        autoComplete="off"
        checked={renderPriceNormal}
        id="renderPriceWalkNormal"
        onChange={handleRenderPriceNormal}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderPriceNormalInput;
