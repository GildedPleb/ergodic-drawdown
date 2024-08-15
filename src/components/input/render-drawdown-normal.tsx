import { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IRenderNormal {
  renderNormal: boolean;
  setRenderNormal: (value: React.SetStateAction<boolean>) => void;
}

const RenderDrawdownNormalInput = ({
  renderNormal,
  setRenderNormal,
}: IRenderNormal): JSX.Element => {
  const handleRenderNormal: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderNormal(event.target.checked);
      },
      [setRenderNormal],
    );

  return (
    <div className="input-row">
      <label htmlFor="renderNormal">{inputLabels.renderNormal}</label>
      <input
        autoComplete="off"
        checked={renderNormal}
        id="renderNormal"
        onChange={handleRenderNormal}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderDrawdownNormalInput;
