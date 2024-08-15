import React, { useCallback } from "react";

import { inputLabels } from "../../content";
import { walks } from "../../data/walks";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IWalkInput {
  setLoading: (value: React.SetStateAction<boolean>) => void;
  setWalk: (value: React.SetStateAction<string>) => void;
  walk: string;
}

const WalkInput = ({ setLoading, setWalk, walk }: IWalkInput): JSX.Element => {
  const handleWalk: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      const value = event.target.value;
      if (Object.keys(walks).includes(value)) {
        setWalk(value);
        setLoading(true);
      }
    },
    [setLoading, setWalk],
  );

  return (
    <div className="input-row">
      <label htmlFor="walkInput">{inputLabels.walk}</label>
      <select
        className="select-model"
        id="walkInput"
        onChange={handleWalk}
        onKeyDown={handleEnterKey}
        value={walk}
      >
        {Object.keys(walks).map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WalkInput;
