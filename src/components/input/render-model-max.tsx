import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IRenderModelMax {
  renderModelMax: boolean;
  setRenderModelMax: (value: React.SetStateAction<boolean>) => void;
}

const RenderModelMaxInput = ({
  renderModelMax,
  setRenderModelMax,
}: IRenderModelMax): JSX.Element => {
  const handleRenderModelMax: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderModelMax(event.target.checked);
      },
      [setRenderModelMax],
    );

  return (
    <div className="input-row">
      <label htmlFor="renderModelMax">{inputLabels.renderModelMax}</label>
      <input
        autoComplete="off"
        checked={renderModelMax}
        id="renderModelMax"
        onChange={handleRenderModelMax}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderModelMaxInput;
