// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable unicorn/no-null */
import hashSum from "hash-sum";
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";

import Modal from "../components/drawdown-modal";
import DrawdownTable from "../components/drawdown-table";
import { SecureFileOperationsModal } from "../components/file-operations-modal";
// eslint-disable-next-line @shopify/strict-component-boundaries
import BitcoinInput from "../components/input/bitcoin";
// eslint-disable-next-line @shopify/strict-component-boundaries
import InflationInput from "../components/input/inflation";
import { isMobile } from "../constants";
import { fieldLabels } from "../content";
import { type DrawdownContextType, useDrawdown } from "../contexts/drawdown";
import { type ModelContextType, useModel } from "../contexts/model";
import { type RenderContextType, useRender } from "../contexts/render";
import {
  type FormData,
  type OneOffFiatVariable,
  type OneOffItem,
  type ReoccurringItem,
} from "../types";

const buttonText = "➕";
const buttonSave = "💾";
const buttonLoad = "📂";

const Container = styled.fieldset<{ $guessHeight: number }>`
  width: calc(100vw - 50px);
  height: calc(${isMobile() ? "50vh" : "39vh"} - 117px);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  border: 1px solid gray;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 0px;
  padding-bottom: 10px;
  overflow: scroll;

  position: relative;

  z-index: 1;
`;

const Legend = styled.legend`
  padding-inline-start: 10px;
  padding-inline-end: 7px;
`;

const Fill = styled.div`
  width: 100%;
  min-height: 10px;
  background-color: #242424;
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
  background-color: #242424;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
  transform: translateY(-1px);
  width: 100%;
  max-height: 30px;
`;

const Button = styled.button`
  background-color: transparent;
  text-decoration: none;
  max-width: 40px;
  max-height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5px;
`;

export interface AppState
  extends ModelContextType,
    DrawdownContextType,
    RenderContextType {}

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
  } = drawdownState;

  const fullState = useMemo(
    () => ({ ...modelState, ...drawdownState, ...renderState }),
    [drawdownState, modelState, renderState],
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileModalMode, setFileModalMode] = useState<"load" | "save" | null>(
    null,
  );

  const length =
    oneOffFiatVariables.length + oneOffItems.length + reoccurringItems.length;
  const guessHeight = length * 55 + 240;

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleAdd = useCallback(
    (item: FormData) => {
      const cleanItem = (object: object, allowedKeys: string[]): object => {
        return Object.fromEntries(
          Object.entries(object).filter(([key]) => allowedKeys.includes(key)),
        );
      };

      const id = hashSum(Date.now());

      switch (item.type) {
        case "oneOffFiatVariable": {
          const cleanedItem = cleanItem(item, [
            "active",
            "id",
            "name",
            "amountToday",
            "btcWillingToSpend",
            "delay",
            "start",
          ]) as OneOffFiatVariable;

          cleanedItem.hash = hashSum({
            amountToday: cleanedItem.amountToday,
            btcWillingToSpend: cleanedItem.btcWillingToSpend,
            delay: cleanedItem.delay,
            start: cleanedItem.start,
          });
          cleanedItem.id = id;

          setOneOffFiatVariables((previous) => [...previous, cleanedItem]);
          break;
        }
        case "oneOffItem": {
          const cleanedItem = cleanItem(item, [
            "active",
            "id",
            "name",
            "amountToday",
            "effective",
            "expense",
            "isFiat",
          ]) as OneOffItem;
          cleanedItem.id = id;
          setOneOffItems((previous) => [...previous, cleanedItem]);
          break;
        }
        case "reoccurringItem": {
          const cleanedItem = cleanItem(item, [
            "active",
            "id",
            "name",
            "annualAmount",
            "annualPercentChange",
            "effective",
            "end",
            "expense",
            "isFiat",
          ]) as ReoccurringItem;
          cleanedItem.id = id;
          setReoccurringItems((previous) => [...previous, cleanedItem]);
          break;
        }
        default: {
          console.error("Unknown item type:", item.type);
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
    (state: AppState) => {
      for (const key of Object.keys(state) as Array<keyof AppState>) {
        const setterKey = `set${key.charAt(0).toUpperCase() + key.slice(1)}` as
          | keyof DrawdownContextType
          | keyof ModelContextType;
        if (typeof fullState[setterKey] === "function") {
          (fullState[setterKey] as (value: AppState[typeof key]) => void)(
            state[key],
          );
        }
      }
    },
    [fullState],
  );

  const appState = useMemo(() => {
    const {
      drawdownData,
      finalVariableCache,
      simulationData,
      variableDrawdownCache,
      ...rest
    } = fullState;

    return Object.fromEntries(
      Object.entries(rest).filter(([key]) => !key.startsWith("set")),
    ) as unknown as AppState;
  }, [fullState]);

  return (
    <Container $guessHeight={guessHeight}>
      <Legend>{fieldLabels.drawdown}</Legend>
      <Fill />
      <SectionRow>
        <Button onClick={handleOpenModal}>{buttonText}</Button>
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
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleAdd}
      />
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
