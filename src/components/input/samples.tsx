import React, { useCallback } from "react";
import styled from "styled-components";

import { MAX_SAMPLE_COUNT } from "../../constants";
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

const SampleInput = (): JSX.Element => {
  const { setLoadingVolumeData } = useDrawdown();
  const { samples, setLoadingPriceData, setSamples } = useModel();

  const handleSamples: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.target.value === "") {
        setSamples(1000);
        return;
      }
      const value = Number.parseInt(event.target.value, 10);
      if (value >= 0 && value <= MAX_SAMPLE_COUNT) {
        setLoadingPriceData(true);
        setLoadingVolumeData(true);
        setSamples(value);
      }
    },
    [setLoadingPriceData, setLoadingVolumeData, setSamples],
  );

  return (
    <Container>
      <label htmlFor="sampleInput">{inputLabels.samples}</label>
      <Input
        autoComplete="off"
        id="sampleInput"
        max={MAX_SAMPLE_COUNT}
        min="1"
        onChange={handleSamples}
        onKeyDown={handleEnterKey}
        type="number"
        value={samples}
      />
    </Container>
  );
};

export default SampleInput;
