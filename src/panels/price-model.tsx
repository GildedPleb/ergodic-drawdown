/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @shopify/strict-component-boundaries */
import { useCallback } from "react";

import DataPointCount from "../components/data-point-count";
import ClampInput from "../components/input/clamp";
import EpochInput from "../components/input/epoch";
import ModelInput from "../components/input/model";
import SampleInput from "../components/input/samples";
import VolInput from "../components/input/volatility";
import WalkInput from "../components/input/walk";
import { fieldLabels } from "../content";
import { useModel } from "../contexts/model";
import { usePriceData } from "../contexts/price";
import { useVolumeData } from "../contexts/volume";

const PriceModel = (): JSX.Element => {
  const { setLoadingPriceData } = usePriceData();
  const { setLoadingVolumeData } = useVolumeData();
  const {
    clampBottom,
    clampTop,
    epochCount,
    minMaxMultiple,
    model,
    samples,
    setClampBottom,
    setClampTop,
    setEpochCount,
    setMinMaxMultiple,
    setModel,
    setSamples,
    setVariable,
    setVolatility,
    setWalk,
    variable,
    volatility,
    walk,
  } = useModel();

  const fullLoading = useCallback(() => {
    setLoadingPriceData(true);
    setLoadingVolumeData(true);
  }, [setLoadingPriceData, setLoadingVolumeData]);

  return (
    <fieldset className="group">
      <legend>{fieldLabels.model}</legend>
      <ModelInput
        minMaxMultiple={minMaxMultiple}
        model={model}
        setLoading={fullLoading}
        setMinMaxMultiple={setMinMaxMultiple}
        setModel={setModel}
        setVariable={setVariable}
        variable={variable}
      />
      <WalkInput setLoading={fullLoading} setWalk={setWalk} walk={walk} />
      <ClampInput
        clampBottom={clampBottom}
        clampTop={clampTop}
        setClampBottom={setClampBottom}
        setClampTop={setClampTop}
        setLoading={fullLoading}
      />
      <VolInput
        setLoading={fullLoading}
        setVolatility={setVolatility}
        volatility={volatility}
        walk={walk}
      />
      <SampleInput
        samples={samples}
        setLoading={fullLoading}
        setSamples={setSamples}
      />
      <EpochInput
        epochCount={epochCount}
        setEpochCount={setEpochCount}
        setLoading={fullLoading}
      />
      <div className="input-row stats">
        <DataPointCount />
      </div>
    </fieldset>
  );
};

export default PriceModel;
