import type { KeyboardEvent, KeyboardEventHandler } from "react";

type FocusableElement = HTMLInputElement | HTMLSelectElement;

const handleEnterKey: KeyboardEventHandler<FocusableElement> = (
  event: KeyboardEvent<FocusableElement>,
): void => {
  if (event.key !== "Enter") {
    return;
  }

  const target = event.currentTarget;
  const selector = "input:not([type='hidden']), select";

  const elements = [...document.querySelectorAll<HTMLElement>(selector)].filter(
    (element): element is FocusableElement =>
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement,
  );

  const currentIndex = elements.indexOf(target);

  // Ensure we have a valid index and there is a next element
  if (currentIndex === -1 || currentIndex >= elements.length - 1) {
    return;
  }

  const nextElement = elements[currentIndex + 1];
  nextElement.focus();
  event.preventDefault();
};

export default handleEnterKey;
