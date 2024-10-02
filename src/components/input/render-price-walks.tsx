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

const RenderPriceWalkInput = (): JSX.Element => {
  const { renderPriceWalks, setRenderPriceWalks } = useRender();

  const handleRenderPriceWalks: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderPriceWalks(event.target.checked);
      },
      [setRenderPriceWalks],
    );

  return (
    <Container>
      <input
        autoComplete="off"
        checked={renderPriceWalks}
        id="renderWalk"
        onChange={handleRenderPriceWalks}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
      <label htmlFor="renderWalk">{inputLabels.renderWalk}</label>
    </Container>
  );
};

export default RenderPriceWalkInput;
