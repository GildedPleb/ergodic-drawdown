import { type JSX, useCallback, useMemo } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import { useModel } from "../../contexts/model";
import { useSettledNumber } from "./settled-number";

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

const VolInput = (): JSX.Element => {
  const { setLoadingVolumeData } = useDrawdown();
  const { setLoadingPriceData, setVolatility, volatility, walk } = useModel();

  const commitVol = useCallback(
    (next: number) => {
      setLoadingPriceData(true);
      setLoadingVolumeData(true);
      setVolatility(next);
    },
    [setLoadingPriceData, setLoadingVolumeData, setVolatility],
  );
  const field = useSettledNumber({
    accept: (next) => next >= 0 && next <= 1,
    commit: commitVol,
    parse: Number.parseFloat,
    value: volatility,
  });

  const volStep = useMemo(() => (walk === "Bubble" ? 0.005 : 0.001), [walk]);

  return (
    <Container>
      <label htmlFor="volInput">{inputLabels.vol}</label>
      <Input
        autoComplete="off"
        id="volInput"
        max="1"
        min="0"
        onBlur={field.onBlur}
        onChange={field.onChange}
        onKeyDown={field.onKeyDown}
        step={volStep}
        type="number"
        value={field.draft}
      />
    </Container>
  );
};

export default VolInput;
