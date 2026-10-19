import type { KeyboardEvent } from "react";

/**
 * Port of main's src/components/input/enter.ts: Enter moves focus to the next input or select in
 * document order (blurring, and so settling, the current field).
 */
export const focusNextOnEnter = (
  event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
): void => {
  if (event.key !== "Enter") return;
  const target = event.currentTarget;
  const elements = [
    ...document.querySelectorAll<HTMLElement>("input:not([type='hidden']), select"),
  ].filter(
    (el): el is HTMLInputElement | HTMLSelectElement =>
      el instanceof HTMLInputElement || el instanceof HTMLSelectElement,
  );
  const index = elements.indexOf(target);
  if (index === -1 || index >= elements.length - 1) return;
  const next = elements[index + 1];
  if (next === undefined) return;
  next.focus();
  event.preventDefault();
};
