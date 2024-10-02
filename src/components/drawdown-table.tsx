import hashSum from "hash-sum";
import React, { useCallback, useState } from "react";
import styled from "styled-components";

import { useDrawdown } from "../contexts/drawdown";
import { getItemDescription } from "../helpers";
import { type DrawdownItem, type FormData } from "../types";
import Modal from "./drawdown-modal";

const Table = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 85vw;
  overflow: scroll;
`;

const Section = styled.div``;

const SectionTitle = styled.h2`
  color: #888;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #333;
  overflow: hidden;
  white-space: nowrap;
`;

const CheckboxCell = styled.div`
  flex-shrink: 0;
  margin-right: 10px;
`;

const ContentCell = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
  min-width: 0;
  margin-right: 10px;
`;

const ActionCell = styled.div`
  flex-shrink: 0;
`;

const Checkbox = styled.input.attrs({ type: "checkbox" })`
  margin-right: 10px;
  flex-shrink: 0;
  cursor: pointer;
`;

const ItemText = styled.span`
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #888;
  font-size: 0.8rem;
`;

const ItemName = styled.span`
  color: #f3f3f3;
  font-size: 1rem;
`;

const ItemDescription = styled.span`
  margin-left: 8px;
`;

const Button = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 5px;
  flex-shrink: 0;
  text-decoration: none;
`;

const table = {
  delete: "❌",
};

// eslint-disable-next-line functional/no-mixed-types
interface ItemRowProperties {
  item: DrawdownItem;
  onDelete: (id: string) => void;
  onEdit: (item: FormData) => void;
  onToggleActive: (id: string) => void;
}

const ItemRow: React.FC<ItemRowProperties> = ({
  item,
  onDelete,
  onEdit,
  onToggleActive,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const additionalInfo = ` "${getItemDescription(item)}"`;

  const handleToggle = useCallback(() => {
    onToggleActive(item.id);
  }, [item.id, onToggleActive]);
  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSave = useCallback(
    (updatedItem: FormData) => {
      onEdit(updatedItem);
      closeModal();
    },
    [closeModal, onEdit],
  );

  return (
    <>
      <Row>
        <CheckboxCell>
          <Checkbox checked={item.active} onChange={handleToggle} />
        </CheckboxCell>
        <ContentCell>
          <ItemText onClick={openModal}>
            <ItemName>{item.name}</ItemName>
            <ItemDescription>{additionalInfo}</ItemDescription>
          </ItemText>
        </ContentCell>
        <ActionCell>
          <Button onClick={handleDelete} title="Delete">
            {table.delete}
          </Button>
        </ActionCell>
      </Row>
      <Modal
        isOpen={isModalOpen}
        item={item}
        onClose={closeModal}
        onDelete={handleDelete}
        onSave={handleSave}
      />
    </>
  );
};

// eslint-disable-next-line functional/no-mixed-types
interface SectionProperties<T extends DrawdownItem> {
  items: T[];
  onDelete: (id: string) => void;
  onEdit: (item: FormData) => void;
  onToggleActive: (id: string) => void;
  title: string;
}

const TableSection: React.FC<SectionProperties<DrawdownItem>> = ({
  items,
  onDelete,
  onEdit,
  onToggleActive,
  title,
}) => (
  <Section>
    <SectionTitle>{title}</SectionTitle>
    {items.map((item) => (
      <ItemRow
        item={item}
        key={item.id}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
      />
    ))}
  </Section>
);

const DrawdownTable: React.FC = () => {
  const {
    oneOffFiatVariables,
    oneOffItems,
    reoccurringItems,
    setOneOffFiatVariables,
    setOneOffItems,
    setReoccurringItems,
  } = useDrawdown();

  const createHandler = useCallback(
    <T extends DrawdownItem>(
      items: T[],
      setItems: React.Dispatch<React.SetStateAction<T[]>>,
    ) => {
      const toggleActive = (id: string): void => {
        setItems(
          items.map((item) =>
            item.id === id ? { ...item, active: !item.active } : item,
          ),
        );
      };

      const deleteItem = (id: string): void => {
        setItems(items.filter((item) => item.id !== id));
      };

      const onEdit = (item: FormData): void => {
        setItems(
          items.map((currentItem) => {
            if (currentItem.id !== item.id) return currentItem;
            if ("btcWillingToSpend" in item) {
              return {
                ...currentItem,
                ...item,
                hash: hashSum({
                  amountToday: item.amountToday,
                  btcWillingToSpend: item.btcWillingToSpend,
                  delay: item.delay,
                  start: item.start,
                }),
              };
            }
            return {
              ...currentItem,
              ...item,
            };
          }),
        );
      };

      return { deleteItem, onEdit, toggleActive };
    },
    [],
  );

  const handleReoccurring = createHandler(
    reoccurringItems,
    setReoccurringItems,
  );
  const handleOneOff = createHandler(oneOffItems, setOneOffItems);
  const handleVariable = createHandler(
    oneOffFiatVariables,
    setOneOffFiatVariables,
  );

  return (
    <Table>
      {reoccurringItems.length > 0 && (
        <TableSection
          items={reoccurringItems}
          onDelete={handleReoccurring.deleteItem}
          onEdit={handleReoccurring.onEdit}
          onToggleActive={handleReoccurring.toggleActive}
          title="Reoccurring"
        />
      )}
      {oneOffItems.length > 0 && (
        <TableSection
          items={oneOffItems}
          onDelete={handleOneOff.deleteItem}
          onEdit={handleOneOff.onEdit}
          onToggleActive={handleOneOff.toggleActive}
          title="One-Off"
        />
      )}
      {oneOffFiatVariables.length > 0 && (
        <TableSection
          items={oneOffFiatVariables}
          onDelete={handleVariable.deleteItem}
          onEdit={handleVariable.onEdit}
          onToggleActive={handleVariable.toggleActive}
          title="Variable"
        />
      )}
    </Table>
  );
};

export default DrawdownTable;
