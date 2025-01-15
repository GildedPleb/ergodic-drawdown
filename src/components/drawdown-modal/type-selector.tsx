import React from "react";
import styled from "styled-components";

import { type DrawdownTypes } from "../../types";
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

const Select = styled.select`
  font-size: inherit;
  color: #ffffff;
  background-color: hsl(0, 0%, 14%);
`;

// eslint-disable-next-line functional/no-mixed-types
interface TypeSelectorProperties {
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedType: DrawdownTypes;
}

const DrawdownTypeSelector: React.FC<TypeSelectorProperties> = ({
  onChange,
  selectedType,
}) => (
  <Row>
    <Label htmlFor="type">{labels.input.type}</Label>
    <Select
      id="type"
      name="type"
      onChange={onChange}
      onKeyDown={handleEnterKey}
      value={selectedType}
    >
      {Object.entries(labels.types).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  </Row>
);

export default DrawdownTypeSelector;
