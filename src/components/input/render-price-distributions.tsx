import React, { useCallback } from "react";
import styled from "styled-components";

import { distributions, inputLabels } from "../../content";
import { useRender } from "../../contexts/render";
import { isValidDistribution } from "../../types";
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

const Select = styled.select`
  width: 100%;
  font-size: inherit;
`;

const RenderPriceDistribution = (): JSX.Element => {
  const { renderPriceDistribution, setRenderPriceDistribution } = useRender();

  const handleDistributionChange: React.ChangeEventHandler<HTMLSelectElement> =
    useCallback(
      (event) => {
        const value = event.target.value;
        if (isValidDistribution(value)) setRenderPriceDistribution(value);
      },
      [setRenderPriceDistribution],
    );

  return (
    <Container>
      <label htmlFor="distributionSelect">{inputLabels.distributions}</label>
      <Select
        id="distributionSelect"
        onChange={handleDistributionChange}
        onKeyDown={handleEnterKey}
        value={renderPriceDistribution}
      >
        {distributions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
    </Container>
  );
};

export default RenderPriceDistribution;
