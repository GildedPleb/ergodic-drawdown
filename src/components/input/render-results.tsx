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

const RenderShowResults = (): JSX.Element => {
  const { hideResults, setHideResults } = useRender();
  const handleShowResults: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setHideResults(!event.target.checked);
      },
      [setHideResults],
    );

  return (
    <Container>
      <label htmlFor="showResults">{inputLabels.showResults}</label>
      <input
        autoComplete="off"
        checked={!hideResults}
        id="showResults"
        onChange={handleShowResults}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </Container>
  );
};

export default RenderShowResults;
