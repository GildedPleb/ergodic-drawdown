import React, { useCallback } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useDrawdown } from "../../contexts/drawdown";
import { useModel } from "../../contexts/model";
import handleEnterKey from "./enter";

const Container = styled.div`
  display: flex;
  width: 100%;
  white-space: nowrap;
  align-items: baseline;
  padding-right: 5px;
  justify-content: flex-start;
  gap: 0px 10px;
`;

const ClampInput = (): JSX.Element => {
  const { setLoadingVolumeData } = useDrawdown();
  const {
    clampBottom,
    clampTop,
    setClampBottom,
    setClampTop,
    setLoadingPriceData,
  } = useModel();

  const handleClampTop: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setClampTop(event.target.checked);
        setLoadingPriceData(true);
        setLoadingVolumeData(true);
      },
      [setClampTop, setLoadingPriceData, setLoadingVolumeData],
    );

  const handleClampBottom: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setClampBottom(event.target.checked);
      },
      [setClampBottom],
    );

  return (
    <Container>
      <span>{inputLabels.clamp}</span>
      <input
        autoComplete="off"
        checked={clampTop}
        id="clampTop"
        onChange={handleClampTop}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
      <label htmlFor="clampTop">{inputLabels.clampTop}</label>
      <input
        autoComplete="off"
        checked={clampBottom}
        id="clampBottom"
        onChange={handleClampBottom}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
      <label htmlFor="clampBottom">{inputLabels.clampBottom}</label>
    </Container>
  );
};

export default ClampInput;
