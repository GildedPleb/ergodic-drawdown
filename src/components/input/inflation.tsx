import { type JSX, useCallback } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import { useSettledNumber } from "./settled-number";

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
  const commitInflation = useCallback(
    (next: number) => {
      setInflation(next);
      setLoadingVolumeData(true);
    },
    [setInflation, setLoadingVolumeData],
  );
  const field = useSettledNumber({
    accept: (next) => !Number.isNaN(next),
    commit: commitInflation,
    emptyValue: 8,
    parse: Number.parseFloat,
    value: inflation,
  });

  return (
    <Container>
      <label htmlFor="inflation">{inputLabels.inflation}</label>
      <Input
        autoComplete="off"
        id="inflation"
        onBlur={field.onBlur}
        onChange={field.onChange}
        onKeyDown={field.onKeyDown}
        placeholder="%"
        step="1"
        type="number"
        value={field.draft}
      />
    </Container>
  );
};

export default InflationInput;
