import React, { useCallback, useState } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import handleEnterKey from "./enter";

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`;

const Input = styled.input`
  max-width: 75px;
  font-size: inherit;
`;

const BitcoinInput = (): JSX.Element => {
  const { bitcoin, setBitcoin, setLoadingVolumeData } = useDrawdown();
  const [localValue, setLocalValue] = useState<string>(bitcoin.toString());

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const inputValue = event.target.value;
      setLocalValue(inputValue);

      // If input is empty, don't update the actual value yet
      if (inputValue === "") return;

      const value = Number.parseFloat(inputValue);
      if (!Number.isNaN(value) && value >= 0) {
        setBitcoin(value);
        setLoadingVolumeData(true);
      }
    },
    [setBitcoin, setLoadingVolumeData],
  );

  const handleBlur = useCallback(() => {
    if (localValue === "") {
      // Reset to default value of 0 when blurring with empty input
      setLocalValue("0");
      setBitcoin(0);
      setLoadingVolumeData(true);
      return;
    }

    // Remove leading zeros and ensure non-negative value
    const parsedValue = Number.parseFloat(localValue);
    if (!Number.isNaN(parsedValue)) {
      const validValue = Math.max(0, parsedValue);
      const formattedValue = validValue.toString();
      setLocalValue(formattedValue);
      setBitcoin(validValue);
      setLoadingVolumeData(true);
    }
  }, [localValue, setBitcoin, setLoadingVolumeData]);

  return (
    <Container>
      <label htmlFor="totalBitcoin">{inputLabels.totalBitcoin}</label>
      <Input
        autoComplete="off"
        id="totalBitcoin"
        min="0"
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleEnterKey}
        step=".1"
        type="number"
        value={localValue}
      />
    </Container>
  );
};

export default BitcoinInput;
