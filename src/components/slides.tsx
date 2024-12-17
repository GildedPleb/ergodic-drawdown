import styled from "styled-components";

export const SlideContent = styled.div`
  max-width: 68vw;
  min-width: 800px;
  @media (min-aspect-ratio: 1) {
    min-width: 250px;
  }
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  text-align: left;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;

    &:hover {
      background: #555;
    }
  }
`;
