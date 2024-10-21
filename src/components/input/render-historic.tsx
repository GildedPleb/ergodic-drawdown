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

const RenderHistoric = (): JSX.Element => {
  const { setShowHistoric, showHistoric } = useRender();
  const handleShowHistoric: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setShowHistoric(event.target.checked);
      },
      [setShowHistoric],
    );

  return (
    <Container>
      <label htmlFor="showHistoric">{inputLabels.historic}</label>
      <input
        autoComplete="off"
        checked={showHistoric}
        id="showHistoric"
        onChange={handleShowHistoric}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </Container>
  );
};

export default RenderHistoric;
