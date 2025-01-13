import React, { useCallback } from "react";
import styled from "styled-components";

import { getItemDescription } from "../../helpers";
import {
  type FieldProperties,
  type IModal,
  type OneOffFiatVariable,
  type OneOffItem,
  type ReoccurringItem,
} from "../../types";
import { ActionButton } from "../buttons/action";
import { Modal } from "../modal";
import { labels } from "./constants";
import CurrencyRadioGroup from "./currency-radio";
import InputField from "./input-field";
import { useMultiFormState } from "./multi-form-state";
import DrawdownTypeSelector from "./type-selector";

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

const Summary = styled.div`
  color: grey;
  font-size: 0.8rem;
`;

const ReoccurringItemFields: React.FC<FieldProperties<ReoccurringItem>> = ({
  formData,
  handleInputChange,
}) => {
  const handleCurrencyChange = useCallback(
    (isFiat: boolean) => (event: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange({
        ...event,
        target: {
          ...event.target,
          checked: isFiat,
          name: "isFiat",
          type: "radio",
        },
      });
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
        onChange={handleInputChange}
        required
        type="date"
        value={formData.effective?.toISOString().split("T")[0]}
      />
      <InputField
        label={labels.endDate}
        name="end"
        onChange={handleInputChange}
        type="date"
        value={formData.end?.toISOString().split("T")[0]}
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
      handleInputChange({
        ...event,
        target: {
          ...event.target,
          checked: isFiat,
          name: "isFiat",
          type: "radio",
        },
      });
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
        value={formData.effective?.toISOString().split("T")[0]}
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
  const {
    activeType,
    formStates,
    getActiveFormData,
    handleInputChange,
    handleTypeChange,
    resetForms,
  } = useMultiFormState(item);

  const handleSave = useCallback(() => {
    const activeFormData = getActiveFormData();
    onSave(activeFormData);
    onClose();
    resetForms();
  }, [onSave, getActiveFormData, onClose, resetForms]);

  const handleDelete = useCallback(() => {
    if (onDelete !== undefined) onDelete();
    onClose();
    resetForms();
  }, [onDelete, onClose, resetForms]);

  const handleClose = useCallback(() => {
    onClose();
    resetForms();
  }, [onClose, resetForms]);

  const title =
    item === undefined
      ? "Add New Drawdown Event"
      : `Edit ${labels.types[activeType]} Drawdown Event`;

  const deletable =
    onDelete === undefined ? (
      <div />
    ) : (
      <ActionButton $backgroundColor="#ff005d" onClick={handleDelete}>
        {labels.input.delete}
      </ActionButton>
    );

  const activeFormData = getActiveFormData();

  return (
    <Modal heading={title} isOpen={isOpen} onClose={handleClose}>
      <ModalBody>
        {item === undefined && (
          <DrawdownTypeSelector
            onChange={handleTypeChange}
            selectedType={activeType}
          />
        )}
        <InputField
          label={labels.input.name}
          name="name"
          onChange={handleInputChange}
          value={activeFormData.name}
        />
        {item !== undefined && (
          <InputField
            checked={activeFormData.active}
            label={labels.input.active}
            name="active"
            onChange={handleInputChange}
            type="checkbox"
          />
        )}
        {activeType === "reoccurringItem" && (
          <ReoccurringItemFields
            formData={formStates.reoccurringItem as ReoccurringItem}
            handleInputChange={handleInputChange}
          />
        )}
        {activeType === "oneOffItem" && (
          <OneOffItemFields
            formData={formStates.oneOffItem as OneOffItem}
            handleInputChange={handleInputChange}
          />
        )}
        {activeType === "oneOffFiatVariable" && (
          <OneOffFiatVariableFields
            formData={formStates.oneOffFiatVariable as OneOffFiatVariable}
            handleInputChange={handleInputChange}
          />
        )}
        <Summary>{getItemDescription(activeFormData)}</Summary>
      </ModalBody>
      <ModalFooter>
        {deletable}
        <ActionButton onClick={handleSave}>{labels.input.save}</ActionButton>
      </ModalFooter>
    </Modal>
  );
};

export default DrawdownModal;
