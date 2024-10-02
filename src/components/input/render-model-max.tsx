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
  align-items: baseline;
  gap: 0 5px;
  padding-right: 5px;
  flex: 0 1;
`;

const RenderModelMaxInput = (): JSX.Element => {
  const { renderModelMax, setRenderModelMax } = useRender();

  const handleRenderModelMax: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderModelMax(event.target.checked);
      },
      [setRenderModelMax],
    );

  return (
    <Container>
      <label htmlFor="renderModelMax">{inputLabels.renderModelMax}</label>
      <input
        autoComplete="off"
        checked={renderModelMax}
        id="renderModelMax"
        onChange={handleRenderModelMax}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </Container>
  );
};

export default RenderModelMaxInput;
