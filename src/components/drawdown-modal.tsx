import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";

import { getItemDescription } from "../helpers";
import {
  type DrawdownItem,
  type FieldProperties,
  type FormData,
  type IModal,
  type OneOffFiatVariable,
  type OneOffItem,
  type ReoccurringItem,
} from "../types";
import { ActionButton } from "./buttons/action";
import handleEnterKey from "./input/enter";
import { Modal } from "./modal";

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
`;

const Select = styled.select`
  font-size: inherit;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
  gap: 0 5px;
  padding-right: 5px;
`;

const Input = styled.input<{ $isPercent?: boolean }>`
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

const Summary = styled.div`
  color: grey;
  font-size: 0.8rem;
`;

const getItemType = (item: DrawdownItem): string => {
  if ("annualAmount" in item) return "reoccurringItem";
  if ("amountToday" in item && "btcWillingToSpend" in item)
    return "oneOffFiatVariable";
  if ("amountToday" in item) return "oneOffItem";
  return "";
};

const labels = {
  amountToday: "Amount Today:",
  amountTodayVariable: "Cost Today (USD):",
  annualAmount: "Annual Amount:",
  annualPercentChange: "Annual Percent Change:",
  btc: "BTC",
  btcWillingToSpend: "BTC Willing to Spend:",
  currency: "Currency:",
  currencyType: "Currency Type:",
  delay: "Delay (Weeks):",
  effectiveDate: "Effective Date:",
  endDate: "End Date (optional):",
  expense: "Expense:",
  start: "Start (%):",
  usd: "USD",
};

const InputField: React.FC<{
  checked?: boolean;
  isPercent?: boolean;
  label: string;
  max?: number;
  min?: number;
  name: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  value?: number | string;
}> = ({ checked, isPercent, label, max, min, name, onChange, type, value }) => {
  const [localValue, setLocalValue] = useState<string>(value?.toString() ?? "");
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name: nName, type: nType, value: nValue } = event.target;
      setLocalValue(nValue);

      if (type === "date" && nValue === "") {
        // For date inputs, if the value is empty, don't propagate the change
        return;
      }

      onChange({
        ...event,
        target: { ...event.target, name: nName, type: nType, value: nValue },
      });
    },
    [onChange, type],
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      if (type === "number") {
        const numberValue =
          event.target.value === "" ? 0 : Number.parseFloat(event.target.value);
        if (Number.isNaN(numberValue)) {
          const validatedValue = "0";
          setLocalValue(validatedValue);
          onChange({
            ...event,
            target: { ...event.target, value: validatedValue },
          });
        } else {
          const validatedValue = numberValue.toString();
          setLocalValue(validatedValue);
          onChange({
            ...event,
            target: { ...event.target, value: validatedValue },
          });
        }
      } else if (type === "date" && event.target.value === "") {
        // If the date is empty on blur, reset it to the current date
        const currentDate = new Date().toISOString().split("T")[0];
        setLocalValue(currentDate);
        onChange({
          ...event,
          target: { ...event.target, value: currentDate },
        });
      }
    },
    [onChange, type],
  );
  const overrideEnter = type === "checkbox" ? () => {} : handleEnterKey;

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
        onKeyDown={overrideEnter}
        type={type}
        value={localValue}
      />
    </Row>
  );
};

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

const ReoccurringItemFields: React.FC<FieldProperties<ReoccurringItem>> = ({
  formData,
  handleInputChange,
}) => {
  const handleCurrencyChange = useCallback(
    (isFiat: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const syntheticEvent = {
        ...event,
        target: {
          ...event.target,
          checked: isFiat,
          name: "isFiat",
          type: "radio",
        },
      };
      handleInputChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    },
    [handleInputChange],
  );

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      const effectiveDate =
        formData.effective === undefined
          ? new Date()
          : new Date(formData.effective);
      const endDate =
        formData.end === undefined ? undefined : new Date(formData.end);

      if (name === "effective") {
        const newEffectiveDate = new Date(value);
        if (endDate !== undefined && newEffectiveDate > endDate) {
          // If new effective date is after end date, set end date to effective date
          handleInputChange({
            ...event,
            target: { ...event.target, name: "end", value },
          });
        }
      } else if (name === "end") {
        const newEndDate = new Date(value);
        if (newEndDate < effectiveDate) {
          // If new end date is before effective date, set it to effective date
          handleInputChange({
            ...event,
            target: {
              ...event.target,
              value: effectiveDate.toISOString().split("T")[0],
            },
          });
          return;
        }
      }

      handleInputChange(event);
    },
    [formData.effective, formData.end, handleInputChange],
  );

  const effectiveDate = useMemo(
    () =>
      formData.effective?.toISOString().split("T")[0] ??
      new Date().toISOString().split("T")[0],
    [formData.effective],
  );

  const endDate = useMemo(
    () => formData.end?.toISOString().split("T")[0] ?? "",
    [formData.end],
  );

  return (
    <>
      <CurrencyRadioGroup
        isFiat={formData.isFiat ?? false}
        onChange={handleCurrencyChange}
      />
      <InputField
        label={labels.annualAmount}
        min={0}
        name="annualAmount"
        onChange={handleInputChange}
        type="number"
        value={formData.annualAmount}
      />
      <InputField
        checked={formData.expense}
        label={labels.expense}
        name="expense"
        onChange={handleInputChange}
        type="checkbox"
      />
      <InputField
        isPercent
        label={labels.annualPercentChange}
        name="annualPercentChange"
        onChange={handleInputChange}
        type="number"
        value={formData.annualPercentChange}
      />
      <InputField
        label={labels.effectiveDate}
        name="effective"
        onChange={handleDateChange}
        type="date"
        value={effectiveDate}
      />
      <InputField
        label={labels.endDate}
        name="end"
        onChange={handleDateChange}
        type="date"
        value={endDate}
      />
    </>
  );
};

const OneOffItemFields: React.FC<FieldProperties<OneOffItem>> = ({
  formData,
  handleInputChange,
}) => {
  const handleCurrencyChange = useCallback(
    (isFiat: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const syntheticEvent = {
        ...event,
        target: {
          ...event.target,
          checked: isFiat,
          name: "isFiat",
          type: "radio",
        },
      };
      handleInputChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
    },
    [handleInputChange],
  );

  return (
    <>
      <CurrencyRadioGroup
        isFiat={formData.isFiat ?? false}
        onChange={handleCurrencyChange}
      />
      <InputField
        label={labels.amountToday}
        name="amountToday"
        onChange={handleInputChange}
        type="number"
        value={formData.amountToday}
      />
      <InputField
        checked={formData.expense}
        label={labels.expense}
        name="expense"
        onChange={handleInputChange}
        type="checkbox"
      />
      <InputField
        label={labels.effectiveDate}
        name="effective"
        onChange={handleInputChange}
        type="date"
        value={
          formData.effective?.toISOString().split("T")[0] ??
          new Date().toISOString().split("T")[0]
        }
      />
    </>
  );
};

const OneOffFiatVariableFields: React.FC<
  FieldProperties<OneOffFiatVariable>
> = ({ formData, handleInputChange }) => (
  <>
    <InputField
      label={labels.amountTodayVariable}
      name="amountToday"
      onChange={handleInputChange}
      type="number"
      value={formData.amountToday}
    />
    <InputField
      label={labels.btcWillingToSpend}
      name="btcWillingToSpend"
      onChange={handleInputChange}
      type="number"
      value={formData.btcWillingToSpend}
    />
    <InputField
      isPercent
      label={labels.delay}
      name="delay"
      onChange={handleInputChange}
      type="number"
      value={formData.delay}
    />
    <InputField
      isPercent
      label={labels.start}
      max={100}
      min={0}
      name="start"
      onChange={handleInputChange}
      type="number"
      value={formData.start}
    />
  </>
);

const DrawdownModal = ({
  isOpen,
  item,
  onClose,
  onDelete,
  onSave,
}: IModal): JSX.Element | undefined => {
  const [formData, setFormData] = useState<FormData>(
    item === undefined
      ? {
          active: true,
          amountToday: 0,
          annualAmount: 0,
          annualPercentChange: 0,
          btcWillingToSpend: 0,
          delay: 0,
          effective: new Date(),
          expense: true,
          id: "",
          isFiat: true,
          name: `New Item`,
          start: 100,
          type: "oneOffFiatVariable",
        }
      : {
          type: getItemType(item),
          ...item,
        },
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, type, value } = event.target;
      setFormData((previous) => {
        let newValue;

        if (type === "radio" && name === "isFiat") {
          newValue = (event.target as HTMLInputElement).checked;
          // eslint-disable-next-line unicorn/prefer-switch
        } else if (type === "checkbox") {
          newValue = (event.target as HTMLInputElement).checked;
        } else if (type === "date") {
          newValue = new Date(value);
        } else if (type === "number") {
          newValue = Number(value);
        } else {
          newValue = value;
        }

        return {
          ...previous,
          [name]: newValue,
        };
      });
    },
    [],
  );

  const handleSave = useCallback(() => {
    // Type assertion here. In a real-world scenario, you'd want to validate the formData thoroughly before this assertion.
    onSave(formData);
    onClose();
  }, [formData, onSave, onClose]);

  const handleDelete = useCallback(() => {
    // Type assertion here. In a real-world scenario, you'd want to validate the formData thoroughly before this assertion.
    if (onDelete !== undefined) onDelete();
    onClose();
  }, [onDelete, onClose]);

  const options: Record<string, string> = {
    oneOffFiatVariable: "One-Off Fiat Variable-Date",
    oneOffItem: "One-Off",
    reoccurringItem: "Reoccurring",
  };
  const title =
    item === undefined
      ? "Add New Drawdown Event"
      : `Edit ${options[formData.type]} Drawdown Event`;

  const input = {
    active: "Active:",
    close: "\u00D7",
    delete: "Remove",
    name: "Name:",
    placeholder: "Enter item name",
    save: "Save",
    type: "Type:",
  };

  const getItemDescriptionWrapper = (innerFormData: FormData): string => {
    switch (innerFormData.type) {
      case "oneOffFiatVariable": {
        // @ts-expect-error i know more than you
        const { annualAmount, ...paredDown } = innerFormData;
        return getItemDescription(paredDown as OneOffFiatVariable);
      }
      case "oneOffItem": {
        // @ts-expect-error i know more than you
        const { annualAmount, btcWillingToSpend, ...paredDown } = innerFormData;
        return getItemDescription(paredDown as OneOffItem);
      }
      default: {
        // @ts-expect-error i know more than you
        return getItemDescription(innerFormData);
      }
    }
  };

  const deletable =
    onDelete === undefined ? (
      <div />
    ) : (
      <ActionButton $backgroundColor="#ff005d" onClick={handleDelete}>
        {input.delete}
      </ActionButton>
    );

  return (
    <Modal heading={title} isOpen={isOpen} onClose={onClose}>
      <ModalBody>
        {item === undefined && (
          <Row>
            <Label htmlFor="type">{input.type}</Label>
            <Select
              id="type"
              name="type"
              onChange={handleInputChange}
              onKeyDown={handleEnterKey}
              value={formData.type}
            >
              {Object.entries(options).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Row>
        )}
        <InputField
          label={input.name}
          name="name"
          onChange={handleInputChange}
          value={formData.name}
        />
        {item !== undefined && (
          <InputField
            checked={formData.active}
            label={input.active}
            name="active"
            onChange={handleInputChange}
            type="checkbox"
          />
        )}
        {formData.type === "reoccurringItem" && (
          <ReoccurringItemFields
            formData={formData as ReoccurringItem}
            handleInputChange={handleInputChange}
          />
        )}
        {formData.type === "oneOffItem" && (
          <OneOffItemFields
            formData={formData as OneOffItem}
            handleInputChange={handleInputChange}
          />
        )}
        {formData.type === "oneOffFiatVariable" && (
          <OneOffFiatVariableFields
            formData={formData as OneOffFiatVariable}
            handleInputChange={handleInputChange}
          />
        )}
        <Summary>{getItemDescriptionWrapper(formData)}</Summary>
      </ModalBody>
      <ModalFooter>
        {deletable}
        <ActionButton onClick={handleSave}>{input.save}</ActionButton>
      </ModalFooter>
    </Modal>
  );
};

export default DrawdownModal;
