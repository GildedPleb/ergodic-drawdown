import React, { useCallback } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useRender } from "../../contexts/render";
import handleEnterKey from "./enter";

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  align-items: center;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`;

const Input = styled.input`
  max-width: 75px;
  font-size: inherit;
`;

const RenderSampleCount = (): JSX.Element => {
  const {
    renderDrawdownWalks,
    renderPriceWalks,
    samplesToRender,
    setSamplesToRender,
  } = useRender();

  const handleSamplesToRender: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        if (event.target.value === "") {
          setSamplesToRender(undefined);
          return;
        }
        const value = Number.parseInt(event.target.value, 10);
        if (value >= 0 && value <= 100) {
          setSamplesToRender(value);
        }
      },
      [setSamplesToRender],
    );

  const disabled = !(renderPriceWalks || renderDrawdownWalks);

  return (
    <Container>
      <label htmlFor="sampleRenderInput">{inputLabels.samplesToRender}</label>
      <Input
        autoComplete="off"
        disabled={disabled}
        id="sampleRenderInput"
        max="100"
        onChange={handleSamplesToRender}
        onKeyDown={handleEnterKey}
        type="number"
        value={samplesToRender}
      />
    </Container>
  );
};

export default RenderSampleCount;
