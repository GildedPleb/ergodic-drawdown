import { type JSX, useCallback } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import { useSettledNumber } from "./settled-number";

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
  const commitBitcoin = useCallback(
    (next: number) => {
      setBitcoin(next);
      setLoadingVolumeData(true);
    },
    [setBitcoin, setLoadingVolumeData],
  );
  const field = useSettledNumber({
    accept: (next) => next >= 0,
    commit: commitBitcoin,
    emptyValue: 0,
    parse: Number.parseFloat,
    value: bitcoin,
  });

  return (
    <Container>
      <label htmlFor="totalBitcoin">{inputLabels.totalBitcoin}</label>
      <Input
        autoComplete="off"
        id="totalBitcoin"
        min="0"
        onBlur={field.onBlur}
        onChange={field.onChange}
        onKeyDown={field.onKeyDown}
        step=".1"
        type="number"
        value={field.draft}
      />
    </Container>
  );
};

export default BitcoinInput;
