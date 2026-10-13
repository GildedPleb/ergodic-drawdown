import React, { useCallback, useState } from "react";
import styled from "styled-components";

import { type FieldChange } from "../../types";
import handleEnterKey from "../input/enter";

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

const Input = styled.input<{ $isPercent?: boolean | undefined }>`
  border: 1px solid grey;
  border-radius: 2px;
  background-color: #333;
  color: white;
  font-size: inherit;
  flex: 1;
  min-width: 0;
  max-width: ${({ $isPercent, type }) => {
    if (type === undefined) return 200;
    if (type === "number" && $isPercent === true) return 55;
    if (type === "number") return 120;
    if (type === "date") return 130;
    return 20;
  }}px;
`;
interface InputFieldProperties {
  checked?: boolean | undefined;
  isPercent?: boolean | undefined;
  label: string;
  max?: number | undefined;
  min?: number | undefined;
  name: string;
  onChange: (event: FieldChange) => void;
  required?: boolean | undefined;
  type?: string | undefined;
  value?: number | string | undefined;
}

const InputField: React.FC<InputFieldProperties> = ({
  checked,
  isPercent,
  label,
  max,
  min,
  name,
  onChange,
  required,
  type,
  value,
}) => {
  // Track if input is focused to allow empty state
  const [isFocused, setIsFocused] = useState(false);
  // Track local input value
  const [localValue, setLocalValue] = useState(value?.toString() ?? "");

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setLocalValue(newValue);
      onChange(event);
    },
    [onChange],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // When focusing, show the actual input value without defaults
    setLocalValue(value?.toString() ?? "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (type === "number" && localValue !== "") {
      // Remove leading zeros and format number
      const parsed = Number.parseFloat(localValue);
      if (!Number.isNaN(parsed)) {
        const formatted = parsed.toString();
        setLocalValue(formatted);
        onChange({
          target: {
            name,
            type: "number",
            value: formatted,
          },
        });
      }
    }
  }, [type, localValue, onChange, name]);

  const overrideEnter = type === "checkbox" ? () => {} : handleEnterKey;

  // Display logic: show local value while focused, otherwise show the validated value
  const displayValue = isFocused ? localValue : (value?.toString() ?? "");

  return (
    <Row>
      <Label htmlFor={name}>{label}</Label>
      <Input
        $isPercent={isPercent}
        checked={checked}
        id={name}
        max={max}
        min={min}
        name={name}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={overrideEnter}
        required={required}
        type={type}
        value={displayValue}
      />
    </Row>
  );
};

export default InputField;
