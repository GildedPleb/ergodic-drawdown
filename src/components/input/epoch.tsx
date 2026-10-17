import { type JSX, useCallback, useMemo } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import { useModel } from "../../contexts/model";
import { parseCanonicalInteger, useSettledNumber } from "./settled-number";

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
  const commitEpoch = useCallback(
    (next: number) => {
      setEpochCount(next);
      setLoadingPriceData(true);
      setLoadingVolumeData(true);
    },
    [setEpochCount, setLoadingPriceData, setLoadingVolumeData],
  );
  const field = useSettledNumber({
    accept: (next) => next >= 1 && next <= 100,
    commit: commitEpoch,
    parse: parseCanonicalInteger,
    value: epochCount,
  });

  const epochLength = useMemo(() => ` (~${epochCount * 4} years)`, [epochCount]);

  return (
    <Container>
      <label htmlFor="numberInput">{inputLabels.epoch}</label>
      <Input
        autoComplete="off"
        id="numberInput"
        max="30"
        min="1"
        onBlur={field.onBlur}
        onChange={field.onChange}
        onKeyDown={field.onKeyDown}
        type="number"
        value={field.draft}
      />
      {epochLength}
    </Container>
  );
};

export default EpochInput;
