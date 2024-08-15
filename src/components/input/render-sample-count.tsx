import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";
// eslint-disable-next-line functional/no-mixed-types
interface IRenderSampleCount {
  disabled: boolean;
  samplesToRender: number | undefined;
  setSamplesToRender: (value: React.SetStateAction<number | undefined>) => void;
}

const RenderSampleCount = ({
  disabled,
  samplesToRender,
  setSamplesToRender,
}: IRenderSampleCount): JSX.Element => {
  const handleSamplesToRender: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        if (event.target.value === "") {
          setSamplesToRender(undefined);
          return;
        }
        const value = Number.parseInt(event.target.value, 10);
        if (value >= 0 && value <= 100) {
          setSamplesToRender(value);
        }
      },
      [setSamplesToRender],
    );

  return (
    <div className="input-row">
      <label htmlFor="sampleRenderInput">{inputLabels.samplesToRender}</label>
      <input
        autoComplete="off"
        className="input-number"
        disabled={disabled}
        id="sampleRenderInput"
        max="100"
        onChange={handleSamplesToRender}
        onKeyDown={handleEnterKey}
        type="number"
        value={samplesToRender}
      />
    </div>
  );
};

export default RenderSampleCount;
