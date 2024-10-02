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

const RenderModelMinInput = (): JSX.Element => {
  const { renderModelMin, setRenderModelMin } = useRender();
  const handleRenderModelMin: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderModelMin(event.target.checked);
      },
      [setRenderModelMin],
    );

  return (
    <Container>
      <label htmlFor="renderModelMin">{inputLabels.renderModelMin}</label>
      <input
        autoComplete="off"
        checked={renderModelMin}
        id="renderModelMin"
        onChange={handleRenderModelMin}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </Container>
  );
};

export default RenderModelMinInput;
