import { useCallback, useEffect, useState } from "react";

import { MS_PER_WEEK } from "../../constants";
import { useEngineSelector } from "../../hooks/use-engine";
import {
  type DrawdownItem,
  type DrawdownTypes,
  type FieldChange,
  type FormData,
} from "../../types";
import { applyConstraints, applyTypeValidation } from "./validation";

interface FormStates {
  oneOffFiatVariable: FormData;
  oneOffItem: FormData;
  reoccurringItem: FormData;
}

interface UseMultiFormState {
  activeType: DrawdownTypes;
  formStates: FormStates;
  getActiveFormData: () => FormData;
  handleInputChange: (event: FieldChange) => void;
  handleTypeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  resetForms: () => void;
}

const defaultOneOffFiatFormData: FormData = {
  active: true,
  amountToday: 0,
  btcWillingToSpend: 0,
  delay: 0,
  hash: "",
  id: "",
  name: `New Variable Item`,
  start: 100,
  type: "oneOffFiatVariable",
};

const defaultOneOffFormData: FormData = {
  active: true,
  amountToday: 0,
  effective: new Date(),
  expense: true,
  id: "",
  isFiat: true,
  name: `New Item`,
  type: "oneOffItem",
};

const defaultReoccuringFormData: FormData = {
  active: true,
  annualAmount: 0,
  annualPercentChange: 0,
  effective: new Date(),
  expense: true,
  id: "",
  isFiat: true,
  name: `New Recurring Item`,
  type: "reoccurringItem",
};

const defaultFormStates: FormStates = {
  oneOffFiatVariable: defaultOneOffFiatFormData,
  oneOffItem: defaultOneOffFormData,
  reoccurringItem: defaultReoccuringFormData,
};

const determineFormType = (item: DrawdownItem): DrawdownTypes => {
  if ("annualAmount" in item) return "reoccurringItem";
  if ("btcWillingToSpend" in item) return "oneOffFiatVariable";
  return "oneOffItem";
};

const isDrawdownType = (value: string): value is DrawdownTypes =>
  value === "oneOffFiatVariable" || value === "oneOffItem" || value === "reoccurringItem";

const initializeFormStates = (existingItem?: DrawdownItem): FormStates => {
  if (existingItem === undefined) return defaultFormStates;

  if ("annualAmount" in existingItem) {
    return {
      ...defaultFormStates,
      reoccurringItem: { ...existingItem, type: "reoccurringItem" },
    };
  }

  if ("btcWillingToSpend" in existingItem) {
    return {
      ...defaultFormStates,
      oneOffFiatVariable: { ...existingItem, type: "oneOffFiatVariable" },
    };
  }

  return {
    ...defaultFormStates,
    oneOffItem: { ...existingItem, type: "oneOffItem" },
  };
};

const readFormField = (
  form: FormData,
  field: string,
): Date | boolean | number | string | undefined => {
  const record: Record<string, Date | boolean | number | string | undefined> = {};
  for (const [key, entry] of Object.entries(form)) {
    if (
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean" ||
      entry instanceof Date ||
      entry === undefined
    ) {
      record[key] = entry;
    }
  }
  return record[field];
};

export const useMultiFormState = (
  existingItem?: DrawdownItem,
  onTypeChange?: (type: DrawdownTypes) => void,
): UseMultiFormState => {
  const dataLength = useEngineSelector((snapshot) => snapshot.dataLength);
  const maxDateUNIX = Date.now() + (dataLength - 2) * MS_PER_WEEK;

  const initialType =
    existingItem === undefined ? "oneOffFiatVariable" : determineFormType(existingItem);
  const [activeType, setActiveType] = useState<DrawdownTypes>(initialType);
  const [formStates, setFormStates] = useState<FormStates>(() =>
    initializeFormStates(existingItem),
  );

  useEffect(() => {
    if (existingItem !== undefined) {
      const type = determineFormType(existingItem);
      setActiveType(type);
      setFormStates(initializeFormStates(existingItem));
    }
  }, [existingItem]);

  const handleInputChange = useCallback(
    (event: FieldChange) => {
      const { name, type: inputType } = event.target;
      const value =
        inputType === "checkbox" || (inputType === "radio" && name === "isFiat")
          ? event.target.checked === true
          : event.target.value;

      setFormStates((previous) => {
        const constrainedData = applyConstraints(
          {
            ...previous[activeType],
            [name]: value,
          },
          maxDateUNIX,
        );

        const validatedValue = applyTypeValidation(
          name,
          readFormField(constrainedData, name),
          inputType,
        );

        return {
          ...previous,
          [activeType]: {
            ...constrainedData,
            [name]: validatedValue,
          },
        };
      });
    },
    [activeType],
  );

  const handleTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = event.target.value;
      if (!isDrawdownType(newType)) return;
      setActiveType(newType);
      if (onTypeChange !== undefined) {
        onTypeChange(newType);
      }
    },
    [onTypeChange],
  );

  const getActiveFormData = useCallback(() => {
    return formStates[activeType];
  }, [formStates, activeType]);

  const resetForms = useCallback(() => {
    setFormStates(defaultFormStates);
    setActiveType("oneOffFiatVariable");
  }, []);

  return {
    activeType,
    formStates,
    getActiveFormData,
    handleInputChange,
    handleTypeChange,
    resetForms,
  };
};
