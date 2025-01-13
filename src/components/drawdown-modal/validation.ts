import { type FormData } from "../../types";

export const validateNumericInput = (
  value: number | string | undefined,
  defaultValue = 0,
): number => {
  if (value === "" || value === undefined) return defaultValue;
  const numb = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isNaN(numb) ? defaultValue : numb;
};

const validateDateInput = <R extends boolean = false>(
  value: Date | string | undefined,
  required: R = false as R,
): R extends true ? Date : Date | undefined => {
  // Handle Date instance case
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      if (required) return new Date();
      return undefined as R extends true ? Date : Date | undefined;
    }
    return value as R extends true ? Date : Date | undefined;
  }

  // Handle undefined case
  if (value === undefined) {
    if (required) return new Date();
    return value as R extends true ? Date : Date | undefined;
  }

  // Handle string case with original parsing logic
  const [year, month, day] = value.split("-");
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

  // Validate the parsed date
  if (Number.isNaN(parsedDate.getTime())) {
    if (required) return new Date();
    return undefined as R extends true ? Date : Date | undefined;
  }

  return parsedDate as R extends true ? Date : Date | undefined;
};

export const applyTypeValidation = (
  name: string,
  value: Date | boolean | number | string | undefined,
  inputType: string,
): Date | boolean | number | string | undefined => {
  if (
    inputType === "checkbox" ||
    (inputType === "radio" && name === "isFiat")
  ) {
    return value;
  }

  if (inputType === "number") {
    return typeof value === "string" || typeof value === "number"
      ? validateNumericInput(value)
      : 0;
  }

  if (inputType === "date") {
    if (
      value === "" ||
      (typeof value !== "string" && !(value instanceof Date))
    ) {
      return undefined;
    }
    return validateDateInput(value);
  }

  return value;
};

export const applyConstraints = (
  formData: FormData,
  maxDateUNIX: number,
): FormData => {
  const sanitized = { ...formData };
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(maxDateUNIX);

  switch (sanitized.type) {
    case "oneOffFiatVariable": {
      const startValue = validateNumericInput(sanitized.start, 100);
      sanitized.start = startValue < 0 || startValue > 100 ? 100 : startValue;
      sanitized.amountToday = validateNumericInput(sanitized.amountToday);
      sanitized.btcWillingToSpend = validateNumericInput(
        sanitized.btcWillingToSpend,
      );
      break;
    }

    case "oneOffItem": {
      sanitized.amountToday = validateNumericInput(sanitized.amountToday);
      let effectiveDate = validateDateInput(sanitized.effective, true);
      effectiveDate = effectiveDate < currentDate ? currentDate : effectiveDate;
      effectiveDate = effectiveDate > maxDate ? maxDate : effectiveDate;
      sanitized.effective = effectiveDate;
      break;
    }

    case "reoccurringItem": {
      let effectiveDate = validateDateInput(sanitized.effective, true);
      effectiveDate = effectiveDate < currentDate ? currentDate : effectiveDate;
      effectiveDate = effectiveDate > maxDate ? maxDate : effectiveDate;
      sanitized.effective = effectiveDate;
      console.log({ end: sanitized.end });
      // @ts-expect-error end can be "" when the date is invalid or meant to be undefined
      if (sanitized.end !== undefined && sanitized.end !== "") {
        let endDate = validateDateInput(sanitized.end, false);
        if (endDate !== undefined) {
          endDate =
            endDate < sanitized.effective ? sanitized.effective : endDate;
          endDate = endDate > maxDate ? maxDate : endDate;
        }
        sanitized.end = endDate;
      }

      sanitized.annualAmount = validateNumericInput(sanitized.annualAmount);
      sanitized.annualPercentChange = validateNumericInput(
        sanitized.annualPercentChange,
      );
      break;
    }
  }

  return sanitized;
};
