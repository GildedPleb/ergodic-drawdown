/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @shopify/strict-component-boundaries */

import RenderDrawdownNormalInput from "../components/input/render-drawdown-normal";
import RenderDrawdownQuantileInput from "../components/input/render-drawdown-quantile";
import RenderDrawdownWalksInput from "../components/input/render-drawdown-walks";
import RenderExpensesInput from "../components/input/render-expenses";
import RenderModelMaxInput from "../components/input/render-model-max";
import RenderModelMinInput from "../components/input/render-model-min";
import RenderPriceNormalInput from "../components/input/render-price-noraml";
import RenderPriceQuantileInput from "../components/input/render-price-quantile";
import RenderPriceWalkInput from "../components/input/render-price-walks";
import RenderSampleCount from "../components/input/render-sample-count";
import { fieldLabels } from "../content";
import { useRender } from "../contexts/render";

const RenderOptions = (): JSX.Element => {
  const {
    renderDrawdownNormal,
    renderDrawdownQuantile,
    renderDrawdownWalks,
    renderExpenses,
    renderModelMax,
    renderModelMin,
    renderPriceNormal,
    renderPriceQuantile,
    renderPriceWalks,
    samplesToRender,
    setRenderDrawdownNormal,
    setRenderDrawdownQuantile,
    setRenderDrawdownWalks,
    setRenderExpenses,
    setRenderModelMax,
    setRenderModelMin,
    setRenderPriceNormal,
    setRenderPriceQuantile,
    setRenderPriceWalks,
    setSamplesToRender,
  } = useRender();
  return (
    <fieldset className="move group">
      <div className="short start">
        <RenderModelMaxInput
          renderModelMax={renderModelMax}
          setRenderModelMax={setRenderModelMax}
        />
        <RenderModelMinInput
          renderModelMin={renderModelMin}
          setRenderModelMin={setRenderModelMin}
        />
      </div>
      <legend>{fieldLabels.graph}</legend>
      <fieldset className="wide start">
        <legend>{fieldLabels.price}</legend>
        <RenderPriceWalkInput
          renderPriceWalks={renderPriceWalks}
          setRenderPriceWalks={setRenderPriceWalks}
        />
        <RenderPriceNormalInput
          renderPriceNormal={renderPriceNormal}
          setRenderPriceNormal={setRenderPriceNormal}
        />
        <RenderPriceQuantileInput
          renderPriceQuantile={renderPriceQuantile}
          setRenderPriceQuantile={setRenderPriceQuantile}
        />
      </fieldset>
      <fieldset className="wide start">
        <legend>{fieldLabels.drawdown}</legend>
        <RenderDrawdownWalksInput
          renderDrawdown={renderDrawdownWalks}
          setRenderDrawdown={setRenderDrawdownWalks}
        />
        <RenderDrawdownNormalInput
          renderNormal={renderDrawdownNormal}
          setRenderNormal={setRenderDrawdownNormal}
        />
        <RenderDrawdownQuantileInput
          renderQuantile={renderDrawdownQuantile}
          setRenderQuantile={setRenderDrawdownQuantile}
        />
      </fieldset>
      <div className="short start">
        <RenderSampleCount
          disabled={!(renderPriceWalks || renderDrawdownWalks)}
          samplesToRender={samplesToRender}
          setSamplesToRender={setSamplesToRender}
        />
        <RenderExpensesInput
          renderExpenses={renderExpenses}
          setRenderExpenses={setRenderExpenses}
        />
      </div>
    </fieldset>
  );
};

export default RenderOptions;
