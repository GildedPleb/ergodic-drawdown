import styled from "styled-components";

export const ActionButton = styled.button<{ $backgroundColor?: string }>`
  align-self: flex-end;
  background-color: ${({ $backgroundColor }) => $backgroundColor ?? "#007bff"};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  padding: 10px 15px;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:disabled {
    background-color: #cccccc;
    color: #666666;
    cursor: not-allowed;
    opacity: 0.7;
  }

  &:hover:not(:disabled) {
    background-color: #0056b3;
  }

  &:active:not(:disabled) {
    background-color: #004085;
  }
`;
