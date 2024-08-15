import Lightning1 from "../assets/lightning1.svg?react";
import { pay } from "../content";

const PayMe = (): JSX.Element => {
  return (
    <div className="pay-me">
      <Lightning1 />
      <a href="lightning:gildedpleb@getalby.com">{pay}</a>
    </div>
  );
};

export default PayMe;
