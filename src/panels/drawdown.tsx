/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable @shopify/react-require-autocomplete */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
/* eslint-disable @shopify/strict-component-boundaries */
import { useCallback } from "react";

import BitcoinInput from "../components/input/bitcoin";
import CostOfLivingInput from "../components/input/cost-of-living";
import DrawdownDateInput from "../components/input/drawdown-date";
import InflationInput from "../components/input/inflation";
import { fieldLabels } from "../content";
import { useDrawdown } from "../contexts/drawdown";
import { useTime } from "../contexts/time";
import { useVolumeData } from "../contexts/volume";

const Drawdown = (): JSX.Element => {
  const { setLoadingVolumeData } = useVolumeData();
  const {
    bitcoin,
    costOfLiving,
    drawdownDate,
    inflation,
    setBitcoin,
    setCostOfLiving,
    setDrawdownDate,
    setInflation,
  } = useDrawdown();
  const now = useTime();

  const semiLoading = useCallback(() => {
    setLoadingVolumeData(true);
  }, [setLoadingVolumeData]);

  return (
    <fieldset className="drawdown group">
      <legend>{fieldLabels.drawdown}</legend>
      <div className="drawdown-header">
        <div className="universals">
          <BitcoinInput
            bitcoin={bitcoin}
            setBitcoin={setBitcoin}
            setLoading={semiLoading}
          />
          <InflationInput
            inflation={inflation}
            setInflation={setInflation}
            setLoading={semiLoading}
          />
        </div>
        <button type="button">Add Yearly Expense</button>
        <button type="button">Add Yearly Income</button>
        <button type="button">Add One-Time Expense</button>
        <button type="button">Add One-Time Income</button>
      </div>

      <fieldset className="drawdown-item">
        <input type="checkbox" />
        <div>Yearly Expense</div>
        <form>
          <label>
            Bitcoin:
            <input checked={true} type="radio" value="btc" />
          </label>
          <label>
            USD:
            <input checked={false} type="radio" value="usd" />
          </label>
        </form>
        <DrawdownDateInput
          drawdownDate={drawdownDate}
          now={now}
          setDrawdownDate={setDrawdownDate}
          setLoading={semiLoading}
        />
        Ends:
        <input type="date" />
        <CostOfLivingInput
          costOfLiving={costOfLiving}
          setCostOfLiving={setCostOfLiving}
          setLoading={semiLoading}
        />
        Expected Annual Adjustment (+/-%)
        <input type="number" />
        <div>❌</div>
      </fieldset>
      <fieldset className="drawdown-item">
        <input type="checkbox" />
        <div>Yearly Income</div>
        <form>
          <label>
            Bitcoin:
            <input checked={false} type="radio" value="btc" />
          </label>
          <label>
            USD:
            <input checked={true} type="radio" value="usd" />
          </label>
        </form>
        <DrawdownDateInput
          drawdownDate={drawdownDate}
          now={now}
          setDrawdownDate={setDrawdownDate}
          setLoading={semiLoading}
        />
        Ends:
        <input type="date" />
        <CostOfLivingInput
          costOfLiving={costOfLiving}
          setCostOfLiving={setCostOfLiving}
          setLoading={semiLoading}
        />
        Expected Annual Adjustment (+/-%)
        <input type="number" />
        <div>❌</div>
      </fieldset>
      <fieldset className="drawdown-item">
        <input type="checkbox" />
        <div>One-Time Expense</div>
        <form>
          <label>
            Bitcoin:
            <input checked={true} type="radio" value="btc" />
          </label>
          <label>
            USD:
            <input checked={false} type="radio" value="usd" />
          </label>
        </form>
        <DrawdownDateInput
          drawdownDate={drawdownDate}
          now={now}
          setDrawdownDate={setDrawdownDate}
          setLoading={semiLoading}
        />
        <CostOfLivingInput
          costOfLiving={costOfLiving}
          setCostOfLiving={setCostOfLiving}
          setLoading={semiLoading}
        />
        <div>❌</div>
      </fieldset>
    </fieldset>
  );
};

export default Drawdown;
