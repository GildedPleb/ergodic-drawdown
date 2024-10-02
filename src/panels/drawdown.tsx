import hashSum from "hash-sum";
import { useCallback, useState } from "react";
import styled from "styled-components";

import Modal from "../components/drawdown-modal";
import DrawdownTable from "../components/drawdown-table";
// eslint-disable-next-line @shopify/strict-component-boundaries
import BitcoinInput from "../components/input/bitcoin";
// eslint-disable-next-line @shopify/strict-component-boundaries
import InflationInput from "../components/input/inflation";
import { isMobile } from "../constants";
import { fieldLabels } from "../content";
import { useDrawdown } from "../contexts/drawdown";
import {
  type FormData,
  type OneOffFiatVariable,
  type OneOffItem,
  type ReoccurringItem,
} from "../types";

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
  /* background-color: red; */
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

const Drawdown = (): JSX.Element => {
  const {
    oneOffFiatVariables,
    oneOffItems,
    reoccurringItems,
    setOneOffFiatVariables,
    setOneOffItems,
    setReoccurringItems,
  } = useDrawdown();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const length =
    oneOffFiatVariables.length + oneOffItems.length + reoccurringItems.length;
  const guessHeight = length * 55 + 240;

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSave = useCallback(
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
  return (
    <Container $guessHeight={guessHeight}>
      <Legend>{fieldLabels.drawdown}</Legend>
      <Fill />
      <SectionRow>
        <Button onClick={handleOpenModal}>➕</Button>
        <BitcoinInput />
        <InflationInput />
      </SectionRow>
      <Section>
        <DrawdownTable />
      </Section>
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </Container>
  );
};

export default Drawdown;
