import React, { useCallback } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import { useVolumeData } from "../../contexts/volume";
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
  const { bitcoin, setBitcoin } = useDrawdown();
  const { setLoadingVolumeData } = useVolumeData();

  const handleBtc: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = Number.parseFloat(event.target.value);
      if (value >= 0) {
        setBitcoin(value);
        setLoadingVolumeData(true);
      } else setBitcoin(0);
    },
    [setBitcoin, setLoadingVolumeData],
  );

  return (
    <Container>
      <label htmlFor="totalBitcoin">{inputLabels.totalBitcoin}</label>
      <Input
        autoComplete="off"
        id="totalBitcoin"
        min="0"
        onChange={handleBtc}
        onKeyDown={handleEnterKey}
        step=".1"
        type="number"
        value={bitcoin}
      />
    </Container>
  );
};

export default BitcoinInput;
