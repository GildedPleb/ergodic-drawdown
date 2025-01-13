import { useCallback, useEffect, useState } from "react";

import { MS_PER_WEEK } from "../../constants";
import { useComputedValues } from "../../contexts/computed";
import {
  type DrawdownItem,
  type DrawdownTypes,
  type FormData,
} from "../../types";
import { applyConstraints, applyTypeValidation } from "./validation";

interface FormStates {
  oneOffFiatVariable: FormData;
  oneOffItem: FormData;
  reoccurringItem: FormData;
}

// eslint-disable-next-line functional/no-mixed-types
interface UseMultiFormState {
  activeType: DrawdownTypes;
  formStates: FormStates;
  getActiveFormData: () => FormData;
  handleInputChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
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

const initializeFormStates = (existingItem?: DrawdownItem): FormStates => {
  if (existingItem === undefined) return defaultFormStates;

  const itemType = determineFormType(existingItem);
  const initialStates = { ...defaultFormStates };

  // Initialize the appropriate form with the existing item data
  // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/consistent-type-assertions
  initialStates[itemType] = {
    ...existingItem,
    type: itemType,
  } as FormData;

  return initialStates;
};

export const useMultiFormState = (
  existingItem?: DrawdownItem,
  onTypeChange?: (type: DrawdownTypes) => void,
): UseMultiFormState => {
  const { dataLength } = useComputedValues();
  const maxDateUNIX = Date.now() + (dataLength - 2) * MS_PER_WEEK;

  const initialType =
    existingItem === undefined
      ? "oneOffFiatVariable"
      : determineFormType(existingItem);
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
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, type: inputType } = event.target;
      const value =
        inputType === "checkbox" || (inputType === "radio" && name === "isFiat")
          ? (event.target as HTMLInputElement).checked
          : event.target.value;

      setFormStates((previous) => {
        //  First, apply business logic constraints
        const constrainedData = applyConstraints(
          {
            ...previous[activeType],
            [name]: value,
          },
          maxDateUNIX,
        );

        // Then, apply type validation to the constrained value
        const validatedValue = applyTypeValidation(
          name,
          constrainedData[name as keyof FormData],
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
      const newType = event.target.value as DrawdownTypes;
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

export {
  defaultOneOffFiatFormData,
  defaultOneOffFormData,
  defaultReoccuringFormData,
};
