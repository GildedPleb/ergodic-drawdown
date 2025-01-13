import React from "react";
import styled from "styled-components";

import handleEnterKey from "../input/enter";
import { labels } from "./constants";

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  gap: 0 5px;
  padding-right: 5px;
`;

const Label = styled.label`
  display: block;
  color: white;
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 15px;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 5px;
  color: white;
  cursor: pointer;
`;

const RadioInput = styled.input`
  cursor: pointer;
`;

const CurrencyRadioGroup: React.FC<{
  isFiat: boolean;
  onChange: (
    isFiat: boolean,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ isFiat, onChange }) => (
  <Row>
    <Label>{labels.currency}</Label>
    <RadioGroup>
      <RadioLabel>
        <RadioInput
          checked={isFiat}
          name="currencyType"
          onChange={onChange(true)}
          onKeyDown={handleEnterKey}
          type="radio"
          value="USD"
        />
        {labels.usd}
      </RadioLabel>
      <RadioLabel>
        <RadioInput
          checked={!isFiat}
          name="currencyType"
          onChange={onChange(false)}
          onKeyDown={handleEnterKey}
          type="radio"
          value="BTC"
        />
        {labels.btc}
      </RadioLabel>
    </RadioGroup>
  </Row>
);

export default CurrencyRadioGroup;
