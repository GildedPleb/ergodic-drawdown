import React, { useCallback, useMemo } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import { useModel } from "../../contexts/model";
import handleEnterKey from "./enter";

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
`;

const Input = styled.input`
  max-width: 75px;
  font-size: inherit;
`;

const EpochInput = (): JSX.Element => {
  const { setLoadingVolumeData } = useDrawdown();
  const { epochCount, setEpochCount, setLoadingPriceData } = useModel();
  const handleEpoch: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = Number.parseInt(event.target.value, 10);
      if (value >= 1 && value <= 100) {
        setEpochCount(value);
        setLoadingPriceData(true);
        setLoadingVolumeData(true);
      }
    },
    [setEpochCount, setLoadingPriceData, setLoadingVolumeData],
  );

  const epochLength = useMemo(
    () => ` (~${epochCount * 4} years)`,
    [epochCount],
  );

  return (
    <Container>
      <label htmlFor="numberInput">{inputLabels.epoch}</label>
      <Input
        autoComplete="off"
        id="numberInput"
        max="30"
        min="1"
        onChange={handleEpoch}
        onKeyDown={handleEnterKey}
        type="number"
        value={epochCount}
      />
      {epochLength}
    </Container>
  );
};

export default EpochInput;
