import React, { useCallback, useMemo } from "react";

import { MS_PER_DAY } from "../../constants";
import { inputLabels } from "../../content";
import handleEnterKey from "./enter";

// eslint-disable-next-line functional/no-mixed-types
interface IDrawdownDateInput {
  drawdownDate: number;
  now: number;
  setDrawdownDate: (value: React.SetStateAction<number>) => void;
  setLoading: (value: React.SetStateAction<boolean>) => void;
}

const DrawdownDateInput = ({
  drawdownDate,
  now,
  setDrawdownDate,
  setLoading,
}: IDrawdownDateInput): JSX.Element => {
  const handleDistroDate: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (event) => {
        const date = new Date(event.target.value);
        const timestamp = Math.floor(date.getTime());
        const nowDate = new Date(now);
        const previous = new Date(drawdownDate);
        if (Number.isNaN(timestamp)) return;
        if (
          date.getFullYear() === nowDate.getFullYear() &&
          date.getMonth() === nowDate.getMonth() &&
          date.getDate() === nowDate.getDate()
        )
          return;
        if (timestamp < now) {
          setDrawdownDate(now + MS_PER_DAY);
          if (
            nowDate.getFullYear() === previous.getFullYear() &&
            nowDate.getMonth() === previous.getMonth() &&
            nowDate.getDate() === previous.getDate()
          )
            return;
          setLoading(true);
        } else {
          setDrawdownDate(timestamp);
          setLoading(true);
        }
      },
      [drawdownDate, now, setDrawdownDate, setLoading],
    );

  const value = useMemo(
    () => new Date(drawdownDate).toISOString().split("T")[0],
    [drawdownDate],
  );

  const minDate = useMemo(() => {
    const currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + 1);
    return currentDate.toISOString().split("T")[0];
  }, [now]);

  return (
    <div className="">
      <label htmlFor="distroDate">{inputLabels.drawdownDate}</label>
      <input
        autoComplete="off"
        className="input-date"
        id="distroDate"
        min={minDate}
        onChange={handleDistroDate}
        onKeyDown={handleEnterKey}
        type="date"
        value={value}
      />
    </div>
  );
};

export default DrawdownDateInput;
