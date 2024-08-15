import React from "react";

const label = "View source on GitHub";
const verify = "Verify";
const source = "Source on GitHub";

const ForkUs = (): React.JSX.Element => {
  return (
    <div className="angled-ribbon">
      <a
        aria-label={label}
        href="https://github.com/gildedpleb/ergodic-drawdown"
      >
        {verify}
        <br />
        {source}
      </a>
    </div>
  );
};

export default ForkUs;
