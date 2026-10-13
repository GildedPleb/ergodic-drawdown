import { expect, test } from "bun:test";

import { applyConstraints, applyTypeValidation } from "../src/components/drawdown-modal/validation";
import { type FormData } from "../src/types";

type FiatForm = Extract<FormData, { type: "oneOffFiatVariable" }>;
type OneOffForm = Extract<FormData, { type: "oneOffItem" }>;

const maxDate = new Date(2040, 0, 1).getTime();

const fiat = (start: number, amountToday = 25): FiatForm => ({
  active: true,
  amountToday,
  btcWillingToSpend: 0.1,
  delay: 0,
  hash: "",
  id: "fiat",
  name: "item",
  start,
  type: "oneOffFiatVariable",
});

const oneOff = (effective: Date): OneOffForm => ({
  active: true,
  amountToday: 25,
  effective,
  expense: true,
  id: "once",
  isFiat: true,
  name: "item",
  type: "oneOffItem",
});

test("an empty number becomes 0", () => {
  expect(applyTypeValidation("amount", "", "number")).toBe(0);
  expect(applyTypeValidation("amount", undefined, "number")).toBe(0);
});

test("a non-numeric number becomes 0", () => {
  expect(applyTypeValidation("amount", "nope", "number")).toBe(0);
});

test("a numeric string keeps its value", () => {
  expect(applyTypeValidation("amount", "12.5", "number")).toBe(12.5);
});

test("an empty date is left unset", () => {
  expect(applyTypeValidation("effective", "", "date")).toBeUndefined();
});

test("a real ISO date parses to that calendar day", () => {
  const parsed = applyTypeValidation("effective", "2030-01-15", "date");

  expect(parsed).toBeInstanceOf(Date);
  if (!(parsed instanceof Date)) return;
  expect(parsed.getFullYear()).toBe(2030);
  expect(parsed.getMonth()).toBe(0);
  expect(parsed.getDate()).toBe(15);
});

test("a date that is not a calendar day is left unset", () => {
  expect(applyTypeValidation("effective", "not-a-date", "date")).toBeUndefined();
});

test("a fiat start outside 0 to 100 becomes 100", () => {
  const high = applyConstraints(fiat(150), maxDate);

  if (high.type !== "oneOffFiatVariable") throw new Error("expected a fiat form");
  expect(high.start).toBe(100);
});

test("a non-numeric fiat amount becomes 0", () => {
  const sanitized = applyConstraints(fiat(40, Number.NaN), maxDate);

  if (sanitized.type !== "oneOffFiatVariable") throw new Error("expected a fiat form");
  expect(sanitized.amountToday).toBe(0);
  expect(sanitized.start).toBe(40);
});

test("a past one-off date moves to today and a future date stays", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const past = applyConstraints(oneOff(new Date(2020, 0, 1)), maxDate);
  const future = applyConstraints(oneOff(new Date(2030, 0, 15)), maxDate);

  if (past.type !== "oneOffItem" || future.type !== "oneOffItem") {
    throw new Error("expected a one-off form");
  }
  expect(past.effective.getFullYear()).toBe(today.getFullYear());
  expect(past.effective.getMonth()).toBe(today.getMonth());
  expect(past.effective.getDate()).toBe(today.getDate());
  expect(future.effective.getFullYear()).toBe(2030);
  expect(future.effective.getMonth()).toBe(0);
  expect(future.effective.getDate()).toBe(15);
});
