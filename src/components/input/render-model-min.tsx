import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IRenderModelMin {
  renderModelMin: boolean;
  setRenderModelMin: (value: React.SetStateAction<boolean>) => void;
}

const RenderModelMinInput = ({
  renderModelMin,
  setRenderModelMin,
}: IRenderModelMin): JSX.Element => {
  const handleRenderModelMin: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderModelMin(event.target.checked);
      },
      [setRenderModelMin],
    );

  return (
    <div className="input-row">
      <label htmlFor="renderModelMin">{inputLabels.renderModelMin}</label>
      <input
        autoComplete="off"
        checked={renderModelMin}
        id="renderModelMin"
        onChange={handleRenderModelMin}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderModelMinInput;
