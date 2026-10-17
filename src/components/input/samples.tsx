import { type JSX, useCallback } from "react";
import styled from "styled-components";

import { MAX_SAMPLE_COUNT } from "../../constants";
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

const SampleInput = (): JSX.Element => {
  const { setLoadingVolumeData } = useDrawdown();
  const { samples, setLoadingPriceData, setSamples } = useModel();

  const commitSamples = useCallback(
    (next: number) => {
      setLoadingPriceData(true);
      setLoadingVolumeData(true);
      setSamples(next);
    },
    [setLoadingPriceData, setLoadingVolumeData, setSamples],
  );
  const field = useSettledNumber({
    accept: (next) => next >= 0 && next <= MAX_SAMPLE_COUNT,
    commit: commitSamples,
    emptyValue: 1000,
    parse: parseCanonicalInteger,
    value: samples,
  });

  return (
    <Container>
      <label htmlFor="sampleInput">{inputLabels.samples}</label>
      <Input
        autoComplete="off"
        id="sampleInput"
        max={MAX_SAMPLE_COUNT}
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

export default SampleInput;
