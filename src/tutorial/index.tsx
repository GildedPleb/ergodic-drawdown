// Tutorial.tsx
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";

import { useDrawdown } from "../contexts/drawdown";
import { useModel } from "../contexts/model";
import { useRender } from "../contexts/render";
import { type SlideRequirement } from "../types";
import { slide1 } from "./slides/slide-1";
import { slide2 } from "./slides/slide-2";
import { slide3 } from "./slides/slide-3";
import { slide4 } from "./slides/slide-4";
import { slide5 } from "./slides/slide-5";
import { slide6 } from "./slides/slide-6";
import { slide7 } from "./slides/slide-7";
import { slide8 } from "./slides/slide-8";
import { slide9 } from "./slides/slide-9";
import { slide10 } from "./slides/slide-10";
import { slide11 } from "./slides/slide-11";
import { slide12 } from "./slides/slide-12";
import { slide13 } from "./slides/slide-13";
import { slide14 } from "./slides/slide-14";
import { slide15 } from "./slides/slide-15";
import { slide16 } from "./slides/slide-16";
import { slide17 } from "./slides/slide-17";
import { slide18 } from "./slides/slide-18";
import { slide19 } from "./slides/slide-19";
import { slide20 } from "./slides/slide-20";
import { slide21 } from "./slides/slide-21";
// Import other slides

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;

  gap: 10px;
  max-width: 100%;
  width: 100%;
  max-height: 100%;
  height: 100%;

  overflow: hidden;

  @media (min-aspect-ratio: 1) {
    align-items: center;
  }
  @media (max-aspect-ratio: 1) {
    /* align-items: flex-end; */
  }

  /* border: 1px solid red; */
`;

const Nav = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 100%;
  width: 100%;
  max-height: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 10px;
  /* border: 1px solid royalblue; */
`;

const Tutorial = ({ close }: { close: () => void }): JSX.Element => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const {
    setClampBottom,
    setClampTop,
    setEpochCount,
    setModel,
    setSamples,
    setShowModel,
    setVolatility,
    setWalk,
  } = useModel();

  const {
    setHideResults,
    setRenderDrawdownDistribution,
    setRenderDrawdownWalks,
    setRenderModelMax,
    setRenderModelMin,
    setRenderPriceDistribution,
    setRenderPriceWalks,
    setSamplesToRender,
    setShowRender,
    setShowResults,
  } = useRender();

  const {
    setBitcoin,
    setInflation,
    setOneOffFiatVariables,
    setOneOffItems,
    setReoccurringItems,
    setShowDrawdown,
  } = useDrawdown();

  const slides = useMemo(
    () => [
      slide1,
      slide2,
      slide3,
      slide4,
      slide5,
      slide6,
      slide7,
      slide8,
      slide9,
      slide10,
      slide11,
      slide12,
      slide13,
      slide14,
      slide15,
      slide16,
      slide17,
      slide18,
      slide19,
      slide20,
      slide21,

      // Add other slides
    ],
    [],
  );

  const applyRequirements = useCallback(
    (requirements: SlideRequirement) => {
      if (requirements.clampBottom !== undefined)
        setClampBottom(requirements.clampBottom);
      if (requirements.clampTop !== undefined)
        setClampTop(requirements.clampTop);
      if (requirements.epochCount !== undefined)
        setEpochCount(requirements.epochCount);
      if (requirements.model !== undefined) setModel(requirements.model);
      if (requirements.samples !== undefined) setSamples(requirements.samples);
      if (requirements.showModel !== undefined)
        setShowModel(requirements.showModel);
      if (requirements.volatility !== undefined)
        setVolatility(requirements.volatility);
      if (requirements.walk !== undefined) setWalk(requirements.walk);
      if (requirements.hideResults !== undefined)
        setHideResults(requirements.hideResults);
      if (requirements.renderDrawdownDistribution !== undefined)
        setRenderDrawdownDistribution(requirements.renderDrawdownDistribution);
      if (requirements.renderDrawdownWalks !== undefined)
        setRenderDrawdownWalks(requirements.renderDrawdownWalks);
      if (requirements.renderModelMax !== undefined)
        setRenderModelMax(requirements.renderModelMax);
      if (requirements.renderModelMin !== undefined)
        setRenderModelMin(requirements.renderModelMin);
      if (requirements.renderPriceDistribution !== undefined)
        setRenderPriceDistribution(requirements.renderPriceDistribution);
      if (requirements.renderPriceWalks !== undefined)
        setRenderPriceWalks(requirements.renderPriceWalks);
      if (requirements.samplesToRender !== undefined)
        setSamplesToRender(requirements.samplesToRender);
      if (requirements.showRender !== undefined)
        setShowRender(requirements.showRender);
      if (requirements.showResults !== undefined)
        setShowResults(requirements.showResults);
      if (requirements.bitcoin !== undefined) setBitcoin(requirements.bitcoin);
      if (requirements.inflation !== undefined)
        setInflation(requirements.inflation);
      if (requirements.oneOffFiatVariables !== undefined)
        setOneOffFiatVariables(requirements.oneOffFiatVariables);
      if (requirements.oneOffItems !== undefined)
        setOneOffItems(requirements.oneOffItems);
      if (requirements.reoccurringItems !== undefined)
        setReoccurringItems(requirements.reoccurringItems);
      if (requirements.showDrawdown !== undefined)
        setShowDrawdown(requirements.showDrawdown);
    },
    [
      setBitcoin,
      setClampBottom,
      setClampTop,
      setEpochCount,
      setHideResults,
      setInflation,
      setModel,
      setOneOffFiatVariables,
      setOneOffItems,
      setRenderDrawdownDistribution,
      setRenderDrawdownWalks,
      setRenderModelMax,
      setRenderModelMin,
      setRenderPriceDistribution,
      setRenderPriceWalks,
      setReoccurringItems,
      setSamples,
      setSamplesToRender,
      setShowDrawdown,
      setShowModel,
      setShowRender,
      setShowResults,
      setVolatility,
      setWalk,
    ],
  );

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      const nextIndex = currentSlide + 1;
      applyRequirements(slides[nextIndex].requirements);
      setCurrentSlide(nextIndex);
    }
  }, [applyRequirements, currentSlide, slides]);

  const previousSlide = useCallback(() => {
    if (currentSlide > 0) {
      const previousIndex = currentSlide - 1;
      applyRequirements(slides[previousIndex].requirements);
      setCurrentSlide(previousIndex);
    }
  }, [applyRequirements, currentSlide, slides]);

  const CurrentSlideComponent = slides[currentSlide].component;

  const previous = "Prev";
  const posIndex = `${currentSlide + 1} / ${slides.length}`;
  const next = currentSlide === slides.length - 1 ? "Close" : "Next";
  const handleNext = currentSlide === slides.length - 1 ? close : nextSlide;

  return (
    <Container>
      <Content>
        <CurrentSlideComponent />
      </Content>

      <Nav>
        <button
          disabled={currentSlide === 0}
          onClick={previousSlide}
          type="button"
        >
          {previous}
        </button>
        {posIndex}
        <button onClick={handleNext} type="button">
          {next}
        </button>
      </Nav>
    </Container>
  );
};

export default Tutorial;
