import React, { useCallback } from "react";

import { modelMap, models } from "../../data/models";
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
  padding-right: 5px;
`;

const Select = styled.select`
  width: 100%;
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
  const {
    minMaxMultiple,
    model,
    setMinMaxMultiple,
    setModel,
    setVariable,
    setLoadingPriceData,
    variable,
  } = useModel();

  const setLoading = useCallback(() => {
    setLoadingPriceData(true);
    setLoadingVolumeData(true);
  }, [setLoadingPriceData, setLoadingVolumeData]);

  const handleModel: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      if (model !== event.target.value) {
        setLoading();
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
        setLoading();
      },
      [setLoading, setVariable],
    );

  const handleMinMaxMultiple: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        const value = Number.parseFloat(event.target.value);
        if (value < 1.01) setMinMaxMultiple(1.01);
        else setMinMaxMultiple(value);
        setLoading();
      },
      [setLoading, setVariable],
    );

  const hasInput = modelMap[model].varInput !== "";

  return (
    <Container>
      <Select
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
      </Select>
      {hasInput && (
        <Options>
          <label htmlFor="modelVariable">{modelMap[model].varInput}</label>
          <Input
            autoComplete="off"
            id="modelVariable"
            onChange={handleVariable}
            onKeyDown={handleEnterKey}
            step="1"
            type="number"
            value={variable}
          />
          <label htmlFor="minMaxMultiple">{`+/-`}</label>
          <Input
            autoComplete="off"
            id="minMaxMultiple"
            onChange={handleMinMaxMultiple}
            onKeyDown={handleEnterKey}
            step=".1"
            min="1.01"
            type="number"
            value={minMaxMultiple}
          />
        </Options>
      )}
    </Container>
  );
};

export default ModelInput;
