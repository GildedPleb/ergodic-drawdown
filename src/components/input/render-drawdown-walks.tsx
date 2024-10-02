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

const RenderDrawdownWalksInput = (): JSX.Element => {
  const { renderDrawdownWalks, setRenderDrawdownWalks } = useRender();

  const handleRenderDrawdown: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderDrawdownWalks(event.target.checked);
      },
      [setRenderDrawdownWalks],
    );

  return (
    <Container>
      <input
        autoComplete="off"
        checked={renderDrawdownWalks}
        id="renderDrawdown"
        onChange={handleRenderDrawdown}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
      <label htmlFor="renderDrawdown">{inputLabels.renderDrawdown}</label>
    </Container>
  );
};

export default RenderDrawdownWalksInput;
