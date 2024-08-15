import React, { useCallback } from "react";

import { modelMap, models } from "../../data/models";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IModelInput {
  model: string;
  setLoading: (value: React.SetStateAction<boolean>) => void;
  setModel: (value: React.SetStateAction<string>) => void;
  setVariable: (value: React.SetStateAction<number>) => void;
  setMinMaxMultiple: (value: React.SetStateAction<number>) => void;
  variable: number;
  minMaxMultiple: number;
}

const ModelInput = ({
  model,
  setLoading,
  setModel,
  setVariable,
  variable,
  setMinMaxMultiple,
  minMaxMultiple,
}: IModelInput): JSX.Element => {
  const handleModel: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      if (model !== event.target.value) {
        setLoading(true);
        setModel(event.target.value);

        if (modelMap[event.target.value].varInput !== "") {
          setVariable(modelMap[event.target.value].default);
        }
      }
    },
    [model, setLoading, setModel, setVariable],
  );

  const handleVariable: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        const value = Number.parseFloat(event.target.value);
        setVariable(value);
        setLoading(true);
      },
      [setLoading, setVariable],
    );

  const handleMinMaxMultiple: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        const value = Number.parseFloat(event.target.value);
        if (value < 1.01) setMinMaxMultiple(1.01);
        else setMinMaxMultiple(value);
        setLoading(true);
      },
      [setLoading, setVariable],
    );

  const hasInput = modelMap[model].varInput !== "";

  return (
    <div className="input-row">
      <select
        className="select-model"
        id="modelInput"
        onChange={handleModel}
        onKeyDown={handleEnterKey}
        value={model}
      >
        {models.map((item) => (
          <option key={item.modelType} value={item.modelType}>
            {item.modelType}
          </option>
        ))}
      </select>
      {hasInput && (
        <div>
          <label htmlFor="modelVariable">{modelMap[model].varInput}</label>
          <input
            autoComplete="off"
            className="input-number"
            id="modelVariable"
            onChange={handleVariable}
            onKeyDown={handleEnterKey}
            step="1"
            type="number"
            value={variable}
          />
          <label htmlFor="minMaxMultiple">{`+/-`}</label>
          <input
            autoComplete="off"
            className="input-number"
            id="minMaxMultiple"
            onChange={handleMinMaxMultiple}
            onKeyDown={handleEnterKey}
            step=".1"
            min="1.01"
            type="number"
            value={minMaxMultiple}
          />
        </div>
      )}
    </div>
  );
};

export default ModelInput;
