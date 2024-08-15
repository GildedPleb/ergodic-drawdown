import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IRenderExpenses {
  renderExpenses: boolean;
  setRenderExpenses: (value: React.SetStateAction<boolean>) => void;
}

const RenderExpensesInput = ({
  renderExpenses,
  setRenderExpenses,
}: IRenderExpenses): JSX.Element => {
  const handleRenderExpenses: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        setRenderExpenses(event.target.checked);
      },
      [setRenderExpenses],
    );

  return (
    <div className="input-row">
      <label htmlFor="renderExpenses">{inputLabels.renderExpenses}</label>
      <input
        autoComplete="off"
        checked={renderExpenses}
        id="renderExpenses"
        onChange={handleRenderExpenses}
        onKeyDown={handleEnterKey}
        type="checkbox"
      />
    </div>
  );
};

export default RenderExpensesInput;
