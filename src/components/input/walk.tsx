import React, { useCallback } from "react";
import styled from "styled-components";

import { inputLabels } from "../../content";
import { useModel } from "../../contexts/model";
import { usePriceData } from "../../contexts/price";
import { useVolumeData } from "../../contexts/volume";
import { walks } from "../../data/walks";
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

const WalkInput = (): JSX.Element => {
  const { setLoadingPriceData } = usePriceData();
  const { setLoadingVolumeData } = useVolumeData();
  const { setWalk, walk } = useModel();

  const handleWalk: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      const value = event.target.value;
      if (Object.keys(walks).includes(value)) {
        setWalk(value);
        setLoadingPriceData(true);
        setLoadingVolumeData(true);
      }
    },
    [setLoadingPriceData, setLoadingVolumeData, setWalk],
  );

  return (
    <Container>
      <label htmlFor="walkInput">{inputLabels.walk}</label>
      <Select
        id="walkInput"
        onChange={handleWalk}
        onKeyDown={handleEnterKey}
        value={walk}
      >
        {Object.keys(walks).map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
    </Container>
  );
};

export default WalkInput;
