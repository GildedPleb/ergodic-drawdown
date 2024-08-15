import type React from "react";

const handleEnterKey: React.KeyboardEventHandler<
  HTMLInputElement | HTMLSelectElement
> = (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
  if (event.key === "Enter") {
    const target = event.target as HTMLInputElement | HTMLSelectElement;

    const elements = [
      ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input, select",
      ),
    ];
    const currentIndex = elements.indexOf(target);
    const nextElement = elements[currentIndex + 1];
    if (typeof nextElement.focus === "function") {
      nextElement.focus();
      event.preventDefault();
    }
  }
};

export default handleEnterKey;
