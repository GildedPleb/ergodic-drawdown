import hashSum from "hash-sum";
import { type JSX, useCallback, useMemo, useState } from "react";
import styled, { css } from "styled-components";

import CaretSVG from "../components/caret";
import Modal from "../components/drawdown-modal";
import DrawdownTable from "../components/drawdown-table";
import { SecureFileOperationsModal } from "../components/file-operations-modal";
import BitcoinInput from "../components/input/bitcoin";
import InflationInput from "../components/input/inflation";
import { isMobile } from "../constants";
import { fieldLabels } from "../content";
import { useDrawdown } from "../contexts/drawdown";
import { useModel } from "../contexts/model";
import { useRender } from "../contexts/render";
import {
  type FormData,
  type OneOffFiatVariable,
  type OneOffItem,
  type ReoccurringItem,
  type SavedAppState,
} from "../types";

const buttonText = "➕";
const buttonSave = "💾";
const buttonLoad = "📂";

const Container = styled.fieldset<{ $guessHeight: number; $isOpen: boolean }>`
  height: calc(${isMobile() ? "50vh" : "39vh"} - 117px);
  max-height: ${({ $guessHeight, $isOpen }) => ($isOpen ? $guessHeight : "20")}px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  border: 1px solid gray;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 0px;
  padding-bottom: 10px;
  margin-bottom: -1px;
  overflow: scroll;
  position: relative;
  z-index: 1;
  transition: max-height 0.4s ease-in-out;

  /* Hide scrollbar on close */
  ${({ $isOpen }) =>
    $isOpen
      ? ""
      : css`
          overflow-y: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;

          &::-webkit-scrollbar {
            display: none;
          }
        `}
`;

const Legend = styled.legend`
  cursor: pointer;
  padding-inline-start: 10px;
  padding-inline-end: 7px;
`;

const Fill = styled.div`
  width: 100%;
  min-height: 10px;
  background-color: hsl(0, 0%, 14%);
  position: sticky;
  top: 0px;
  transform: translateY(-1px);
  z-index: 2;
`;

const Section = styled.section`
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  gap: 10px;
`;

const SectionRow = styled(Section)`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  position: sticky;
  top: 10px;
  background-color: hsl(0, 0%, 14%);
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
  transform: translateY(-1px);
  width: 100%;
  max-height: 30px;
`;

const Button = styled.button`
  background-color: transparent;
  text-decoration: none;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0px;
  /* border: 1px solid red; */
`;

const Drawdown = (): JSX.Element => {
  const modelState = useModel();
  const drawdownState = useDrawdown();
  const renderState = useRender();

  const {
    oneOffFiatVariables,
    oneOffItems,
    reoccurringItems,
    setOneOffFiatVariables,
    setOneOffItems,
    setReoccurringItems,
    setShowDrawdown,
    showDrawdown,
  } = drawdownState;

  const { setShowRender } = renderState;
  const { setShowModel } = modelState;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileModalMode, setFileModalMode] = useState<"load" | "save" | null>(null);

  const length = oneOffFiatVariables.length + oneOffItems.length + reoccurringItems.length;
  const guessHeight = length * 55 + 240;

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleAdd = useCallback(
    (item: FormData) => {
      const id = hashSum(Date.now());

      switch (item.type) {
        case "oneOffFiatVariable": {
          const cleanedItem: OneOffFiatVariable = {
            active: item.active,
            amountToday: item.amountToday,
            btcWillingToSpend: item.btcWillingToSpend,
            delay: item.delay,
            hash: hashSum({
              amountToday: item.amountToday,
              btcWillingToSpend: item.btcWillingToSpend,
              delay: item.delay,
              start: item.start,
            }),
            id,
            name: item.name,
            start: item.start,
          };
          setOneOffFiatVariables((previous) => [...previous, cleanedItem]);
          break;
        }
        case "oneOffItem": {
          const cleanedItem: OneOffItem = {
            active: item.active,
            amountToday: item.amountToday,
            effective: item.effective,
            expense: item.expense,
            id,
            isFiat: item.isFiat,
            name: item.name,
          };
          setOneOffItems((previous) => [...previous, cleanedItem]);
          break;
        }
        case "reoccurringItem": {
          const cleanedItem: ReoccurringItem = {
            active: item.active,
            annualAmount: item.annualAmount,
            annualPercentChange: item.annualPercentChange,
            effective: item.effective,
            end: item.end,
            expense: item.expense,
            id,
            isFiat: item.isFiat,
            name: item.name,
          };
          setReoccurringItems((previous) => [...previous, cleanedItem]);
          break;
        }
        default: {
          console.error("Unknown item type:", item);
        }
      }
    },
    [setOneOffFiatVariables, setOneOffItems, setReoccurringItems],
  );

  const handleSave = useCallback(() => {
    setFileModalMode("save");
  }, []);

  const handleLoad = useCallback(() => {
    setFileModalMode("load");
  }, []);

  const handleCloseFile = useCallback(() => {
    setFileModalMode(null);
  }, []);

  const restoreAppState = useCallback(
    (state: SavedAppState) => {
      drawdownState.setBitcoin(state.bitcoin);
      drawdownState.setInflation(state.inflation);
      drawdownState.setLoadingVolumeData(state.loadingVolumeData);
      drawdownState.setOneOffFiatVariables(state.oneOffFiatVariables);
      drawdownState.setOneOffItems(state.oneOffItems);
      drawdownState.setReoccurringItems(state.reoccurringItems);
      drawdownState.setShowDrawdown(state.showDrawdown);
      modelState.setClampBottom(state.clampBottom);
      modelState.setClampTop(state.clampTop);
      modelState.setEpochCount(state.epochCount);
      modelState.setLoadingPriceData(state.loadingPriceData);
      modelState.setMinMaxMultiple(state.minMaxMultiple);
      modelState.setModel(state.model);
      modelState.setSamples(state.samples);
      modelState.setShowModel(state.showModel);
      modelState.setVariable(state.variable);
      modelState.setVolatility(state.volatility);
      modelState.setWalk(state.walk);
      renderState.setHideResults(state.hideResults);
      renderState.setRenderDrawdownDistribution(state.renderDrawdownDistribution);
      renderState.setRenderDrawdownWalks(state.renderDrawdownWalks);
      renderState.setRenderModelMax(state.renderModelMax);
      renderState.setRenderModelMin(state.renderModelMin);
      renderState.setRenderPriceDistribution(state.renderPriceDistribution);
      renderState.setRenderPriceWalks(state.renderPriceWalks);
      renderState.setSamplesToRender(state.samplesToRender);
      renderState.setShowHistoric(state.showHistoric);
      renderState.setShowRender(state.showRender);
      renderState.setShowResults(state.showResults);
    },
    [drawdownState, modelState, renderState],
  );

  const appState = useMemo(
    (): SavedAppState => ({
      bitcoin: drawdownState.bitcoin,
      clampBottom: modelState.clampBottom,
      clampTop: modelState.clampTop,
      epochCount: modelState.epochCount,
      hideResults: renderState.hideResults,
      inflation: drawdownState.inflation,
      loadingPriceData: modelState.loadingPriceData,
      loadingVolumeData: drawdownState.loadingVolumeData,
      minMaxMultiple: modelState.minMaxMultiple,
      model: modelState.model,
      oneOffFiatVariables: drawdownState.oneOffFiatVariables,
      oneOffItems: drawdownState.oneOffItems,
      renderDrawdownDistribution: renderState.renderDrawdownDistribution,
      renderDrawdownWalks: renderState.renderDrawdownWalks,
      renderModelMax: renderState.renderModelMax,
      renderModelMin: renderState.renderModelMin,
      renderPriceDistribution: renderState.renderPriceDistribution,
      renderPriceWalks: renderState.renderPriceWalks,
      reoccurringItems: drawdownState.reoccurringItems,
      samples: modelState.samples,
      samplesToRender: renderState.samplesToRender,
      showDrawdown: drawdownState.showDrawdown,
      showHistoric: renderState.showHistoric,
      showModel: modelState.showModel,
      showRender: renderState.showRender,
      showResults: renderState.showResults,
      variable: modelState.variable,
      version: 1,
      volatility: modelState.volatility,
      walk: modelState.walk,
    }),
    [drawdownState, modelState, renderState],
  );

  const toggleModelExpansion = useCallback(() => {
    if (isMobile() && !showDrawdown) {
      setShowRender(false);
      setShowModel(false);
    }
    setShowDrawdown(!showDrawdown);
  }, [setShowDrawdown, setShowModel, setShowRender, showDrawdown]);

  const inlineStyles = useMemo(
    () => ({
      paddingRight: "2px",
    }),
    [],
  );

  return (
    <Container $guessHeight={guessHeight} $isOpen={showDrawdown}>
      <Legend onClick={toggleModelExpansion}>
        {fieldLabels.drawdown}
        <CaretSVG $isOpen={showDrawdown} />
      </Legend>
      <Fill />
      <SectionRow>
        <Button onClick={handleOpenModal} style={inlineStyles}>
          {buttonText}
        </Button>
        <BitcoinInput />
        <InflationInput />
      </SectionRow>
      <Section>
        <DrawdownTable />
      </Section>
      <SectionRow>
        <Button onClick={handleSave}>{buttonSave}</Button>
        <Button onClick={handleLoad}>{buttonLoad}</Button>
      </SectionRow>
      {isModalOpen && <Modal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleAdd} />}
      <SecureFileOperationsModal
        appState={appState}
        mode={fileModalMode}
        onClose={handleCloseFile}
        setAppState={restoreAppState}
      />
    </Container>
  );
};

export default Drawdown;
