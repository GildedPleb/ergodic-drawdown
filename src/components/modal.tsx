import React, { useCallback } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

const input = {
  close: "\u00D7",
};

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: rgba(36, 36, 36, 0.5);
  padding: 20px;
  border-radius: 2px;
  width: calc(100vw - 70px);
  max-width: 400px;
  border: 1px solid grey;
  display: flex;
  flex-direction: column;
  gap: 20px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  text-decoration: none;
  padding: 0;
`;

// eslint-disable-next-line functional/no-mixed-types
export interface IModal {
  children: React.ReactNode;
  heading: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Modal: React.FC<IModal> = ({
  children,
  heading,
  isOpen,
  onClose,
}: IModal): JSX.Element | undefined => {
  const stopPropagation: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      event.stopPropagation();
    },
    [],
  );

  if (!isOpen) return undefined;

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={stopPropagation}>
        <ModalHeader>
          <h2>{heading}</h2>
          <CloseButton onClick={onClose}>{input.close}</CloseButton>
        </ModalHeader>
        {children}
      </ModalContent>
    </ModalOverlay>,
    document.body,
  );
};
