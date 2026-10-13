export const installFrozenClock = (now) => {
  const RealDate = globalThis.Date;

  function Frozen(year, monthIndex, date, hours, minutes, seconds, ms) {
    if (new.target === undefined) return new RealDate(now).toString();
    if (year === undefined) return new RealDate(now);
    if (typeof year !== "number" || monthIndex === undefined) return new RealDate(year);
    return new RealDate(year, monthIndex, date, hours, minutes, seconds, ms);
  }

  Frozen.prototype = RealDate.prototype;
  Frozen.parse = RealDate.parse;
  Frozen.UTC = RealDate.UTC;
  Frozen.now = () => now;
  globalThis.Date = Frozen;

  return () => {
    globalThis.Date = RealDate;
  };
};
