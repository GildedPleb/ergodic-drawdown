import styled, { keyframes } from "styled-components";

const Spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  border: 5px solid transparent;
  border-top: 5px solid highlight;
  border-radius: 100%;
  width: 0.6rem;
  height: 0.6rem;
  animation: ${Spin} 1s linear infinite;
`;

const Loading = (): JSX.Element => {
  return <Spinner />;
};

export default Loading;
