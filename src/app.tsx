import "chartjs-adapter-date-fns";

import React, { useCallback } from "react";
import styled from "styled-components";

import CaretSVG from "./components/caret";
import { isMobile } from "./constants";
import { useProcessing } from "./data/effects";
import Notifications from "./components/notification";

const Tutorial = React.lazy(async () => import("./tutorial"));
const Model = React.lazy(async () => import("./panels/model"));
const RenderOptions = React.lazy(async () => import("./panels/render"));
const Chart = React.lazy(async () => import("./panels/chart"));
const Drawdown = React.lazy(async () => import("./panels/drawdown"));
const Footer = React.lazy(async () => import("./panels/footer"));
const Results = React.lazy(async () => import("./panels/results"));

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const GridApp = styled.div`
  height: 100vh;
  width: 100vw;
  margin: 10px;
  display: grid;
  row-gap: 0px;
  column-gap: 10px;

  ${isMobile()
    ? `
        grid-template-columns: auto;
        grid-template-rows: auto auto 1fr auto auto;
        grid-template-areas:
          "model"
          "render"
          "chart"
          "drawdown"
          "footer";
      `
    : `
        @media (min-aspect-ratio: 1) {
          grid-template-columns: 1fr 1fr 70px 0fr;
          grid-template-rows: 30px 1fr auto auto;
          grid-template-areas:
            "model render activate tutorial"
            "chart chart chart tutorial"
            "drawdown drawdown drawdown tutorial"
            "footer footer footer tutorial";
        }

        @media (max-aspect-ratio: 1) {
          grid-template-columns: 1fr 1fr 70px;
          grid-template-rows: 0fr 30px 1fr auto auto;
          grid-template-areas:
            "tutorial tutorial tutorial"
            "model render activate"
            "chart chart chart"
            "drawdown drawdown drawdown"
            "footer footer footer";
        }
      `}
`;

const TutorialWrapper = styled.div<{ $isActive: boolean }>`
  grid-area: tutorial;
  position: relative;
  display: ${isMobile() ? "none" : "flex"};
  justify-content: flex-start;
  align-items: flex-end;
  overflow: hidden;

  /* Base transition properties */
  transition-property: width, height;
  transition-duration: 0.3s;
  transition-timing-function: ease;

  /* Panoramic layout */
  @media (min-aspect-ratio: 1) {
    width: ${({ $isActive }) => ($isActive ? "250px" : "0px")};
    height: 100%;
    /* Only animate width in panoramic mode */
    transition-property: width;
  }

  /* Vertical layout */
  @media (max-aspect-ratio: 1) {
    width: 100%;
    height: ${({ $isActive }) => ($isActive ? "300px" : "0px")};
    /* Only animate height in vertical mode */
    transition-property: height;
  }
`;

const ModelWrapper = styled.div`
  grid-area: model;
  min-width: 350px;
  z-index: 10;
`;

const RenderWrapper = styled.div`
  grid-area: render;
  min-width: 350px;
  z-index: 10;
`;

const ChartWrapper = styled.div`
  grid-area: chart;
  width: 100%;
  overflow: hidden;
  position: relative;
`;

const DrawdownWrapper = styled.div`
  grid-area: drawdown;
`;

const FooterWrapper = styled.div`
  grid-area: footer;
`;

const ActivateButton = styled.div`
  grid-area: activate;
  display: ${isMobile() ? "none" : "block"};
  height: 16px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const ContentContainer = styled.div`
  position: absolute;
  @media (min-aspect-ratio: 1) {
    width: 250px;
    height: 100%;
  }
  @media (max-aspect-ratio: 1) {
    width: 100%;
    height: 300px;
  }
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
`;

const StochasticGraph = (): React.ReactNode => {
  const [isTutorialActive, setIsTutorialActive] = React.useState(false);
  useProcessing();

  const handleToggleTutorial = useCallback(() => {
    setIsTutorialActive(!isTutorialActive);
  }, [isTutorialActive]);

  return (
    <Container>
      <GridApp>
        <TutorialWrapper $isActive={isTutorialActive}>
          <ContentContainer>
            <Tutorial close={handleToggleTutorial} />
          </ContentContainer>
        </TutorialWrapper>

        <ModelWrapper>
          <Model />
        </ModelWrapper>

        <RenderWrapper>
          <RenderOptions />
        </RenderWrapper>

        {!isMobile() && (
          <ActivateButton onClick={handleToggleTutorial}>
            {`Tutorial`} <CaretSVG $isOpen={isTutorialActive} />
          </ActivateButton>
        )}

        <ChartWrapper>
          <Chart />
        </ChartWrapper>

        <DrawdownWrapper>
          <Drawdown />
        </DrawdownWrapper>

        <FooterWrapper>
          <Footer />
        </FooterWrapper>
        <Results />
      </GridApp>
      <Notifications />
    </Container>
  );
};

export default StochasticGraph;
