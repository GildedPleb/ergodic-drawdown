import React, { useCallback } from "react";
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

  const handleInflation: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        const value = Number.parseFloat(event.target.value);
        if (!Number.isNaN(value)) {
          setInflation(value);
          setLoadingVolumeData(true);
        }
      },
      [setInflation, setLoadingVolumeData],
    );

  return (
    <Container>
      <label htmlFor="inflation">{inputLabels.inflation}</label>
      <Input
        autoComplete="off"
        id="inflation"
        onChange={handleInflation}
        onKeyDown={handleEnterKey}
        placeholder="%"
        step="1"
        type="number"
        value={inflation}
      />
    </Container>
  );
};

export default InflationInput;
