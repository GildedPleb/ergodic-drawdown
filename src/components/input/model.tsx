import React, { type JSX, useCallback } from "react";

import { isModelName, modelMap, models } from "../../data/models";
import handleEnterKey from "./enter";
import { useModel } from "../../contexts/model";
import styled from "styled-components";
import { useDrawdown } from "../../contexts/drawdown";

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
`;

const Select = styled.select`
  width: 100%;
  font-size: inherit;
`;

const Choice = styled.select`
  flex-shrink: 0;
  font-size: inherit;
`;

const Input = styled.input`
  max-width: 75px;
  font-size: inherit;
  width: 55px;
  min-width: 1px;
  flex-grow: 1;
  text-align: right;
`;

const Options = styled.div`
  flex-shrink: 1;
  display: flex;
  gap: 5px;
`;

const ModelInput = (): JSX.Element => {
  const { setLoadingVolumeData } = useDrawdown();
  const { model, setLoadingPriceData, setModel, setSetting, settings } = useModel();

  const setLoading = useCallback(() => {
    setLoadingPriceData(true);
    setLoadingVolumeData(true);
  }, [setLoadingPriceData, setLoadingVolumeData]);

  const handleModel: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      const value = event.target.value;
      if (!isModelName(value) || model === value) return;
      setLoading();
      setModel(value);
    },
    [model, setLoading, setModel],
  );

  const handleParam: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const setting = modelMap[model].params.find((param) => param.key === event.target.name);
      if (setting === undefined || setting.kind !== "number") return;
      const value = Number.parseFloat(event.target.value);
      let next: number;
      if (Number.isFinite(setting.max)) {
        if (!(value <= setting.max && value >= setting.min)) return;
        next = value;
      } else {
        next = value < setting.min ? setting.min : value;
      }
      setSetting(model, setting.key, next);
      setLoading();
    },
    [model, setLoading, setSetting],
  );

  const handleChoice: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      const setting = modelMap[model].params.find((param) => param.key === event.target.name);
      if (setting === undefined || setting.kind !== "choice") return;
      const value = event.target.value;
      if (!setting.options.some((option) => option.value === value)) return;
      setSetting(model, setting.key, value);
      setLoading();
    },
    [model, setLoading, setSetting],
  );

  return (
    <Container>
      <Select id="modelInput" onChange={handleModel} onKeyDown={handleEnterKey} value={model}>
        {models.map((item) => (
          <option key={item.name} value={item.name}>
            {item.name}
          </option>
        ))}
      </Select>
      <Options>
        {modelMap[model].params.map((param) => {
          if (param.kind === "choice") {
            const stored = settings[param.key];
            if (typeof stored !== "string") return null;
            return (
              <React.Fragment key={param.key}>
                <label htmlFor={param.key}>{param.label}</label>
                <Choice
                  id={param.key}
                  name={param.key}
                  onChange={handleChoice}
                  onKeyDown={handleEnterKey}
                  value={stored}
                >
                  {param.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Choice>
              </React.Fragment>
            );
          }
          const stored = settings[param.key];
          if (typeof stored !== "number") return null;
          const inputId = param.key === "variable" ? "modelVariable" : param.key;
          return (
            <React.Fragment key={param.key}>
              <label htmlFor={inputId}>{param.label}</label>
              <Input
                autoComplete="off"
                id={inputId}
                max={Number.isFinite(param.max) ? param.max : undefined}
                min={param.min}
                name={param.key}
                onChange={handleParam}
                onKeyDown={handleEnterKey}
                step={param.step}
                type="number"
                value={stored}
              />
            </React.Fragment>
          );
        })}
      </Options>
    </Container>
  );
};

export default ModelInput;
