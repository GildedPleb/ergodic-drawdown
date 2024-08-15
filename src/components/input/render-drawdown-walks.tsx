import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IRenderDrawdown {
  renderDrawdown: boolean;
  setRenderDrawdown: (value: React.SetStateAction<boolean>) => void;
}

const RenderDrawdownWalksInput = ({
  renderDrawdown,
  setRenderDrawdown,
}: IRenderDrawdown): JSX.Element => {
  const handleRenderDrawdown: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderDrawdown(event.target.checked);
      },
      [setRenderDrawdown],
    );

  return (
    <div className="input-row">
      <label htmlFor="renderDrawdown">{inputLabels.renderDrawdown}</label>
      <input
        autoComplete="off"
        checked={renderDrawdown}
        id="renderDrawdown"
        onChange={handleRenderDrawdown}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderDrawdownWalksInput;
