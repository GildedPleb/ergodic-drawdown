import { type JSX, useCallback } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useHalvings } from "../../contexts/computed/hooks/use-halvings";
import { useDrawdown } from "../../contexts/drawdown";
import { useModel } from "../../contexts/model";
import { weeksSinceLastHalving } from "../../halvings";
import { maxYears } from "../../horizon";
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

const YearsInput = (): JSX.Element => {
  const { setLoadingVolumeData } = useDrawdown();
  const { setLoadingPriceData, setYears, years } = useModel();
  const { halvings } = useHalvings();
  const cap = maxYears(weeksSinceLastHalving(halvings));
  const commitYears = useCallback(
    (next: number) => {
      setYears(next);
      setLoadingPriceData(true);
      setLoadingVolumeData(true);
    },
    [setLoadingPriceData, setLoadingVolumeData, setYears],
  );
  const field = useSettledNumber({
    accept: (next) => next >= 1 && next <= cap,
    commit: commitYears,
    parse: parseCanonicalInteger,
    value: years,
  });

  return (
    <Container>
      <label htmlFor="numberInput">{inputLabels.years(cap)}</label>
      <Input
        autoComplete="off"
        id="numberInput"
        max={cap}
        min="1"
        onBlur={field.onBlur}
        onChange={field.onChange}
        onKeyDown={field.onKeyDown}
        type="number"
        value={field.draft}
      />
    </Container>
  );
};

export default YearsInput;
