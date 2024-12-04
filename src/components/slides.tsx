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
  overflow: scroll;
`;
