/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";

import CaretSVG from "../components/caret";
import { isMobile } from "../constants";
import { useModel } from "../contexts/model";
import { useRender } from "../contexts/render";

const Container = styled.fieldset<{ $isOpen: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;

  border: 1px solid gray;
  gap: 10px;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 5px;
  ${({ $isOpen }) => ($isOpen ? "max-width: 100vw;" : "max-width: 90px;")}
  padding-bottom: ${({ $isOpen }) => ($isOpen ? "10px" : "0px")};
  max-height: ${({ $isOpen }) => ($isOpen ? "600px" : "22px")};

  overflow: hidden;
  transition: all 0.4s;
`;

const Legend = styled.legend`
  cursor: pointer;
  padding-inline-start: 10px;
  padding-inline-end: 7px;
`;

const Showable = styled.div<{ $isOpen: boolean }>`
  overflow: hidden;
  max-width: 95vw;
`;

const totalSlides = 12;

const Slide1 = (
  <div className="slide-content">
    <p>
      <strong>How much bitcoin is enough?</strong> Is it 6.15? Is it .21? Is it
      1 block reward? Trying to figure out an answer can be overwhelming, and is
      generally unanswerable across people because it relies on big assumptions
      and personal circumstances.
    </p>
    <p>
      However, it can be answered probabilistically with the right tools. To
      this end, we have built this Monte Carlo Simulator to model ergodic
      bitcoin price movements, and map those to drawdown needs. Don't worry
      about the terminology just yet, we'll go through it. At the end of this
      tutorial, you should have a robust understanding of how to make good use
      of this tool to answer the question "How much is enough?" for you and your
      goals.
    </p>
    <p>
      The tutorial will take full control of the app, resetting any changes you
      have already made. Ready to get started? let's 0 out everything by
      clicking <strong>Next</strong>.
    </p>
  </div>
);

const Slide2 = (
  <div className="slide-content">
    <p>
      In the chart below, we now only see the historic bitcoin price (Orange
      Line), and vertical past halving dates (Vertical Grey Lines). This should
      be familiar to you. But if it's not, it is highly recommended to pause
      here and go buy some Bitcoin.
    </p>
    <p>Seriously. We'll wait.</p>
    <p>
      Got some Bitcoin and a little price history under your belt? Click{" "}
      <strong>Next</strong> to visualize our first Bitcoin price model.
    </p>
  </div>
);

const Slide3 = (
  <div className="slide-content">
    <p>
      Pricing models for Bitcoin have become famous over the years for
      predicting what the future price of bitcoin will be by regressing the
      historic price and extrapolating it forward with a few attached
      assumptions.
    </p>
    <p>
      Here, we can see the most recently famous Bitcoin price model (Green
      Line), the Bitcoin Power Law, extending from the most recent bitcoin
      price, and stretching off into the distant future.
    </p>
    <p>
      Problematically, Bitcoin price historically travels in a non-linear,
      non-random, semi-chaotic walk, not a smooth line. As such, the predicted
      price isn't very useful--Bitcoins actual price is obviously not going to
      be anything like the path that the model takes. Even if its a support or
      ceiling, these almost always eventually get invalidated. To remedy this,
      lets convert the simple price into a range of prices that might fit the
      model and capture this uncertainty better. Tap <strong>Next</strong> to
      add a Range.
    </p>
  </div>
);

const Slide4 = (
  <div className="slide-content">
    <p>
      Now that we have a range (Green Min, Red Max) we can get a better sense of
      a model. You can think of these lines as containing most (but not all)
      future price movements for any model. Explore different models (Models /
      Power Law Regression Median / CAGR, for instance) and notice the shape,
      scale, tapering and options they have.
    </p>
    <p>
      However, simply having a range is not enough. If Bitcoin were to mostly
      trade at the top of the range, or mostly at the bottom, we could have
      wildly different projected outcomes, often spanning orders of magnitude,
      that quickly becoming meaningless. But, with the two model boundaries (min
      and max) we do have a range we can traverse the bitcoin price through.
      Let's add one potential walk by clicking <strong>Next</strong>.{" "}
    </p>
  </div>
);
const Slide5 = (
  <div className="slide-content">
    <p>
      As you can see, one of an infinite amount of a semi-chaotic, non-random
      price projection is now shown that roughly follows the larger shape of the
      boundaries (but does not strictly respect them).
    </p>
    <p>
      Of note, this path seems to follow a noisy, jagged, up-down pattern. This
      pattern is called a 'walk', it is how the price moves through the range
      while remaining path-dependent on its previous location.
    </p>
    <p>
      There is also an underlying shape to this walk. To see the shape, let's
      remove all the volatility by clicking <strong>Next</strong> to set the
      volatility to 0..
    </p>
  </div>
);

const Slide6 = (
  <div className="slide-content">
    <p>
      This is the pure pattern with no noise or randomness added. Cycle through
      all the different walks to see how they are differentiated. Some will
      render as straight lines. This means they are highly dependent on
      volatility, and, when set to zero, are flat.
    </p>
    <p>
      For others, the walk can be considered "Ergodic". This means that given
      enough time, the path will always hit both the min, the max, and every
      vertical point in-between despite having a probabilistic distribution that
      might make it seem unlikely. With these walks in mind, let's now pump the
      volatility back up to .1 by clicking <strong>Next</strong>
    </p>
  </div>
);

const Slide7 = (
  <div className="slide-content">
    <p>
      Cycle through the models, walks, and volatility together. Get comfortable
      plotting bitcoins future. Which combination do you like? What seems
      reasonable? What is missing? You will notice that some walks respect the
      min and max while others do not. This is because all walks are strategic
      and rely on a variety of inputs. Some walks care about min and max, others
      care about cycles, momentum, or freak accidents. To force a respect of min
      and/or max, tap the respective 'clamp' checkbox.
    </p>
    <p>
      See if you can find a walk that does not seem to have ergodicity. If you
      gravitated to Random, you found one of them. A random walk has no respect
      for anything but volatility! For the walks that do not respect min and max
      to become ergodic, which is important for robust modeling, we simply add
      more of them. Let's do this now by clicking <strong>Next</strong>.
    </p>
  </div>
);
/*
    </li>
    <li>

    <li>

    </li>
    <li>
      <p>
        This is now a Monte Carlo Simulation, were many walks are taken into
        account to find larger patterns in the data. As you increase the number
        of shown walks you will see that no matter the walk, they will begin to
        converge on filling the full range. Now we can start looking at our
        walks in aggregate. <a href="">toggle quantile</a>
      </p>
    </li>
    <li>
      <p>
        Quantiles are determined by the actual walk data. If you increase the
        visible walk count enough you will eventually find the specific walk
        that defined the best or worst case (even if it was for one touch at one
        point in time). We now have a full Monte Carlo simulation which captures
        ergodicity in bitcoins price walk. Perfect! Let's now consider
        drawdowns. To do this, we will reset the graph to show only one walk and
        one drawdown. <a href="">reset</a>
      </p>
    </li>
    <li>
      <p>
        A drawdown is taking the initial bitcoin holdings and selling the amount
        needed to meet the expense (in USD) needed at that time. At any point on
        the drawdown, that is the balance of bitcoin left. Each drawdown is
        color matched to the simulated price of bitcoin it draws down against.
        Drawdowns only go down and to the right. Let's show the Expenses line so
        we can better understand the rate we are drawing down at.{" "}
        <a href="">show expences</a>
      </p>
    </li>
    <li>
      <p>
        As you can see, the drawdown rate is constant. This means the slope of
        the drawdown--which is certainly not uniform--is subtly dependent on the
        price of bitcoin alone. As the price of bitcoin crashes, the drawdown
        falls at a faster rate, but as the price of bitcoin increases, the
        drawdown slows. As the price of bitcoin increase over time in excess of
        the increase in expenses, and when there is enough bitcoin in the stack,
        the drawdown might never hit zero. Conversely, as the price of bitcoin
        increase over time but not in excess of the increase in expenses, even
        with the same amount of bitcoin, eventually the stack will be depleted.
        With all this in mind, we can now look at drawdowns in aggregate. Let's
        start by converting the price back to quantile as well as the drawdowns.{" "}
        <a href="">set price and dwadowns to quantile</a>
      </p>
    </li>
    <li>
      <p>
        We now see both the aggregate bitcoin price and aggregate drawdown. The
        dashed green line in the center of the green cone is the median
        drawdown. Fine were it terminates. That is how much bitcoin is left at
        at the end of the drawdown period. There are the same amount of drawdown
        outcomes between the median and the top of the green cone, as there are
        between the media and the bottom of the green cone. To continue to see
        if their is enough bitoin going forward,{" "}
        <a href="">increase the Epoch Count</a>.
      </p>
    </li>
    <li>
      <p>
        If we increase the epoch count substantially, we see that eventually, we
        run out of bitcoin! Let's now adjust the drawdown assumptions. Change the
        Bitcoin holdings, the yearly expenses, the expected annual inflation,
        and the drawdown start date until you find a solution that never goes to
        zero. HEAD FAKE! As long as inflation is above 0, this exponential
        growth will eventually overcome the market price and total bitcoin
        holdings. To win this game, generationally, we'll have to make some
        different assumptions about <em>the model</em>. Play around and see what
        you can come up with.
      </p>
    </li>
  </ol> */

const Tutorial = (): JSX.Element => {
  const { setClampBottom, setClampTop, setSamples, setVolatility, setWalk } =
    useModel();
  const {
    setRenderDrawdownDistribution,
    setRenderDrawdownWalks,
    setRenderModelMax,
    setRenderModelMin,
    setRenderPriceDistribution,
    setRenderPriceWalks,
    setSamplesToRender,
    setShowResults,
  } = useRender();

  const [isTutorialActive, setTutorialActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const toSlide1 = useCallback((): void => {
    setSamples(1000);
    setSamplesToRender(10);
    setRenderModelMax(true);
    setRenderModelMin(true);
    setVolatility(0.1);
    setRenderDrawdownDistribution("Quantile");
    setRenderPriceDistribution("Quantile");
  }, [
    setRenderDrawdownDistribution,
    setRenderModelMax,
    setRenderModelMin,
    setRenderPriceDistribution,
    setSamples,
    setSamplesToRender,
    setVolatility,
  ]);

  const toggleTutorial = useCallback(() => {
    setTutorialActive(!isTutorialActive);
    if (isTutorialActive) {
      toSlide1();
      setCurrentSlide(0);
    }
  }, [isTutorialActive, toSlide1]);

  const toSlide2 = (): void => {
    setRenderDrawdownDistribution("None");
    setRenderPriceDistribution("None");
    setRenderDrawdownWalks(false);
    setRenderModelMax(false);
    setRenderModelMin(false);
    setRenderPriceWalks(false);
    setSamplesToRender(0);
    setSamples(0);
    setShowResults(false);
  };

  const toSlide3 = (): void => {
    setRenderModelMin(true);
    setSamples(0);
    setSamplesToRender(0);
    setRenderModelMax(false);
  };

  const toSlide4 = (): void => {
    setRenderModelMax(true);
    setSamplesToRender(0);
  };

  const toSlide5 = (): void => {
    setRenderPriceWalks(true);
    setSamples(1);
    setWalk("Bubble");
    setClampBottom(false);
    setClampTop(false);
    setVolatility(0.1);
    setSamplesToRender(1);
  };

  const toSlide6 = (): void => {
    setVolatility(0);
  };
  const toSlide7 = (): void => {
    setVolatility(0.1);
  };

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
      if (currentSlide === 0) {
        toSlide2();
      }
      if (currentSlide === 1) {
        toSlide3();
      }
      if (currentSlide === 2) {
        toSlide4();
      }
      if (currentSlide === 3) {
        toSlide5();
      }
      if (currentSlide === 4) {
        toSlide6();
      }
      if (currentSlide === 5) {
        toSlide7();
      }
    }
  }, [currentSlide]);

  const previousSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      if (currentSlide === 1) {
        toSlide1();
      }
      if (currentSlide === 2) {
        toSlide2();
      }
      if (currentSlide === 3) {
        toSlide3();
      }
      if (currentSlide === 4) {
        toSlide4();
      }
      if (currentSlide === 5) {
        toSlide5();
      }
      if (currentSlide === 6) {
        toSlide6();
      }
    }
  }, [currentSlide]);

  const tutorialText = "Tutorial";
  const transitionStyle = useMemo(
    () => ({
      transform: `translateX(calc(95vw * -${Number(currentSlide)}))`,
    }),
    [currentSlide],
  );

  if (isMobile()) return <></>;
  return (
    <Container $isOpen={isTutorialActive}>
      <Legend onClick={toggleTutorial}>
        {tutorialText}
        <CaretSVG $isOpen={isTutorialActive} />
      </Legend>
      {/* <button onClick={toggleTutorial} type="button">
        {tutorialText}
      </button> */}
      <Showable $isOpen={isTutorialActive}>
        <div className="slides" style={transitionStyle}>
          <div className="slide">{Slide1}</div>
          <div className="slide">{Slide2}</div>
          <div className="slide">{Slide3}</div>
          <div className="slide">{Slide4}</div>
          <div className="slide">{Slide5}</div>
          <div className="slide">{Slide6}</div>
          <div className="slide">{Slide7}</div>
          <div className="slide">{Slide1}</div>
          <div className="slide">{Slide1}</div>
          <div className="slide">{Slide1}</div>
          <div className="slide">{Slide1}</div>
          <div className="slide">{Slide1}</div>
        </div>
        <div className="nav">
          <button
            disabled={currentSlide === 0}
            onClick={previousSlide}
            type="button"
          >
            Back
          </button>
          {currentSlide + 1}/{totalSlides}
          <button
            disabled={currentSlide === totalSlides - 1}
            onClick={nextSlide}
            type="button"
          >
            Next
          </button>
        </div>
      </Showable>
    </Container>
  );
};

export default Tutorial;
