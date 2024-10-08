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

const VolInput = (): JSX.Element => {
  const { setLoadingVolumeData } = useDrawdown();
  const { setLoadingPriceData, setVolatility, volatility, walk } = useModel();

  const handleVol: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = Number.parseFloat(event.target.value);
      if (value >= 0 && value <= 1) {
        setLoadingPriceData(true);
        setLoadingVolumeData(true);
        setVolatility(value);
      }
    },
    [setLoadingPriceData, setLoadingVolumeData, setVolatility],
  );

  const volStep = useMemo(() => (walk === "Bubble" ? 0.005 : 0.001), [walk]);

  return (
    <Container>
      <label htmlFor="volInput">{inputLabels.vol}</label>
      <Input
        autoComplete="off"
        id="volInput"
        max="1"
        min="0"
        onChange={handleVol}
        onKeyDown={handleEnterKey}
        step={volStep}
        type="number"
        value={volatility}
      />
    </Container>
  );
};

export default VolInput;
