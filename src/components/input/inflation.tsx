import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import handleEnterKey from "./enter";

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  white-space: nowrap;
  align-items: center;
  gap: 0 5px;
  padding-right: 5px;
`;

const Input = styled.input`
  max-width: 40px;
  font-size: 1rem;
`;

const InflationInput = (): JSX.Element => {
  const { inflation, setInflation, setLoadingVolumeData } = useDrawdown();
  const [localValue, setLocalValue] = useState<string>(inflation.toString());

  useEffect(() => {
    if (inflation !== Number(localValue)) setLocalValue(String(inflation));
  }, [inflation, localValue]);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const inputValue = event.target.value;
      setLocalValue(inputValue);

      // If input is empty, don't update the actual value yet
      if (inputValue === "") return;

      const value = Number.parseFloat(inputValue);
      if (!Number.isNaN(value)) {
        setInflation(value);
        setLoadingVolumeData(true);
      }
    },
    [setInflation, setLoadingVolumeData],
  );

  const handleBlur = useCallback(() => {
    if (localValue === "") {
      // Reset to default value of 8 when blurring with empty input
      setLocalValue("8");
      setInflation(8);
      setLoadingVolumeData(true);
      return;
    }

    // Remove leading zeros and update both local and global state
    const parsedValue = Number.parseFloat(localValue);
    if (!Number.isNaN(parsedValue)) {
      const formattedValue = parsedValue.toString();
      setLocalValue(formattedValue);
      setInflation(parsedValue);
      setLoadingVolumeData(true);
    }
  }, [localValue, setInflation, setLoadingVolumeData]);

  return (
    <Container>
      <label htmlFor="inflation">{inputLabels.inflation}</label>
      <Input
        autoComplete="off"
        id="inflation"
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleEnterKey}
        placeholder="%"
        step="1"
        type="number"
        value={localValue}
      />
    </Container>
  );
};

export default InflationInput;
