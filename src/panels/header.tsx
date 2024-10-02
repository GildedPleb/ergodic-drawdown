import { useEffect, useState } from "react";
import styled from "styled-components";

import { subTitle, title } from "../content";

const Container = styled.div`
  width: 100vw;
  max-width: min(90vw, 1000px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 200px;
`;

const Title = styled.h1`
  font-size: xx-large;
  text-align: left;
  font-weight: 800;
  display: flex;
  align-items: center;
  padding-right: 75px;
  flex-basis: 0.5;
  flex: 1;
`;

const SubTitleContainer = styled.div`
  display: flex;
  align-items: flex-start;
  flex: 1;
  color: grey;
`;

const SubTitle = styled.h2<{ opacity: number }>`
  max-width: min(95vw, 1300px);
  transition: opacity 1s ease-in-out;
  opacity: ${(properties) => properties.opacity};
`;

const Header = (): JSX.Element => {
  const [currentSubtitle, setCurrentSubtitle] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setOpacity(0);

      setTimeout(() => {
        const nextIndex = (currentSubtitle + 1) % subTitle.length;
        setCurrentSubtitle(nextIndex);
        setOpacity(1);
      }, 1000);
    }, 100_000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentSubtitle]);

  return (
    <Container>
      <Title>{title}</Title>
      <SubTitleContainer>
        <SubTitle opacity={opacity}>{subTitle[currentSubtitle]}</SubTitle>
      </SubTitleContainer>
    </Container>
  );
};

export default Header;
