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
      <strong>How much bitcoin is enough?</strong>
    </p>
    <p>
      Is it 10? 6.15? 1? .21? Is it 1 block reward? Trying to figure out an
      answer can be overwhelming, and is generally unanswerable across people
      because it relies on big assumptions and personal circumstances.
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
    <p>Seriously.</p>
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
      Problematically, the Bitcoin price historically travels on a path which is
      non-linear (it's not smooth like the green line below), non-random
      (despite being non-linear it is still path-dependent on the previous
      traded price), and semi-chaotic (despite not being random, the price is
      still affected by the chaos of the world around it: hacks, inflation,
      liquidity event, etc). As such, the predicted price isn't very useful--the
      actual price of Bitcoin is obviously not going to be anything like the
      path that the model takes. Even if the model represents a support or
      ceiling, these almost always eventually get invalidated, and are
      universally misinterpreted as price predictions.
    </p>
    <p>
      To remedy this, let's convert the simple price into a range of prices that
      might fit the model and capture this uncertainty better. Tap{" "}
      <strong>Next</strong> to add a Range.
    </p>
  </div>
);

const Slide4 = (
  <div className="slide-content">
    <p>
      The original Bitcoin Rainbow Chart became famous for plotting the bitcoin
      price in a Rainbow Range. And rightly so, for it takes the 'price
      predicting' out of the equation. Now that we have a range (Green Min, Red
      Max) we can think of these lines as containing most (but not all) future
      price movements for any model. Explore different models (Models / Power
      Law Regression Median / CAGR, for instance) and notice the shape, scale,
      tapering and options they have.
    </p>
    <p>
      However, simply having a range is not enough. If Bitcoin were to mostly
      trade at the top of the range, or mostly at the bottom, or hit top and
      bottom at opposite points to our projections, we could have wildly
      different projected outcomes, often spanning orders of magnitude that
      quickly becoming meaningless. But, with the two model guidelines (min and
      max) we do have a range we can traverse the bitcoin price through with
      respect to macro-scale assumptions.
    </p>
    <p>
      Let's look at one potential bitcoin future by clicking{" "}
      <strong>Next</strong>.{" "}
    </p>
  </div>
);
const Slide5 = (
  <div className="slide-content">
    <p>
      As you can see, one of an infinite amount of a semi-chaotic, non-random
      price projections is now shown that roughly follows the larger shape of
      the guard-rails (but does not strictly respect them).
    </p>
    <p>
      Of note, this path seems to follow a noisy, jagged, up-down pattern. This
      pattern is called a 'walk', it is how the price 'steps' through the range
      while remaining path-dependent on its previous location.
    </p>
    <p>
      There is also an underlying shape to this walk. To see the shape, let's
      remove all the volatility by clicking <strong>Next</strong> to set the
      volatility to 0.
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
      For others, the walk might be considered "Ergodic". This means that given
      enough time, the path will always hit both the min, the max, and every
      vertical point in-between despite having a probabilistic distribution that
      might make it seem unlikely. This is fundamental to robust modeling
      because it maps what we all know is previously observable to any future
      predictions. This is the first categorical differentiation that sets this
      modeling paradigm apart.
    </p>
    <p>
      With these walks in mind, let's now pump the volatility back up to .1 by
      clicking <strong>Next</strong>
    </p>
  </div>
);

const Slide7 = (
  <div className="slide-content">
    <p>
      Cycle through the models, walks, and volatility together. Get comfortable
      plotting Bitcoins future. Which combination do you like? What seems
      reasonable? What is missing?
    </p>
    <p>
      You will notice that some walks respect the min and max while others do
      not. This is because all walks are strategic, relying on a variety of
      inputs. Some walks care about min and max, others care about cycles,
      momentum, or freak accidents. To force a respect of min and/or max, tap
      the respective 'clamp' checkbox.
    </p>
    <p>
      You should already be thinking "Ok, but the odds that any of these walks
      end up as the actual path of bitcoin is impossible."
    </p>
    <p>
      And you are correct. One walk, alone, is irrelevant. But what about in
      aggregate? Let's address this directly by clicking <strong>Next</strong>.
    </p>
  </div>
);

const Slide8 = (
  <div className="slide-content">
    <p>
      A Monte Carlo Simulation is were many walks are taken into account to find
      larger patterns in the data, like strategy probabilities. We have added 10
      walks so you can begin to see this effect: The walks follow similar
      patterns to <strong>themselves</strong>.
    </p>
    <p>
      Zoom in and examine various areas of the chart. What do you notice? Open
      up the Render Tab, and increase the number of walks shown. As you increase
      the number of shown walks you will see that no matter the walk, they will
      begin to converge on filling the full range. Now we can start looking at
      our walks in aggregate.
    </p>
    <p>
      Lets look at the statistics of these walks by clicking{" "}
      <strong>Next</strong>.
    </p>
  </div>
);

const Slide9 = (
  <div className="slide-content">
    <p>
      We have two methods for analyzing aggregate walk data: Quantile
      Distribution and Normal Distribution
    </p>
    <p>
      <strong>Quantile Distribution</strong> looks at all the points on all the
      walks at 1 point in time and then it sorts and divides those points in
      Quantiles--or percentages. From the median, it allows you to see data
      shape and asymmetries, where paths gather or were they spread.
    </p>
    <p>
      <strong>Normal Distribution</strong> looks at all the points on all the
      walks at 1 point in time and then determines the standard deviation from
      this data and, assuming the data is distributed normally, overlooks
      asymmetries, and plots those bands from the mean.
    </p>
    <p>
      Lets focus on Quantile for the time being with a quick discussion of
      Granularity and Data by clicking <strong>Next</strong>.
    </p>
  </div>
);

const Slide10 = (
  <div className="slide-content">
    <p>
      Two key inputs significantly impact this tool's quality:{" "}
      <strong>Epoch Count</strong> and <strong>Samples</strong>.
    </p>
    <p>
      <strong>Epoch Count</strong> represents the number of 4-year halving
      cycles on the chart. Remember: longer projections become less relevant and
      more computationally expensive. Monte Carlo Simulators are
      resource-intensive, especially in browsers. While limits are in place,
      exercise caution with your device.
    </p>
    <p>
      <strong>Samples</strong> determine data granularity. More samples (e.g.,
      2000 vs 1000) result in smoother Quantile bands but impact performance.
      Keep samples at 1000 while adjusting other parameters, then increase if
      needed. The app's limit is 10,000, which is the typical minimum for
      serious Monte Carlo Simulations.
    </p>
    <p>
      We've provided an estimated data size for reference, though actual size
      will vary across browsers.
    </p>
    <p>
      Before we get some answers to "How much is enough?" we have one more
      important concept to cover. Click <strong>Next</strong> to continue.
    </p>
  </div>
);
const Slide11 = (
  <div className="slide-content">
    <p>
      So far, we have looked at Bitcoin Price modeling, walks, using these in
      concert to create thousands of price predictions, and the probabilities
      given our assumptions.
    </p>
    <p>
      This, on its own, is a very powerful tool. No one knows the future, of
      course, but with this tool we can begin to speculate on the probabilities
      around price predictions, given model assumptions, which offers yet
      another categorical modeling advantage over all other types of modeling.
    </p>
    <p>
      For instance, Gating: If I assume Power Law Regression Median, and I
      assume 1 bubble per epoch, I might then expect a very low probability of
      price being above $1.8M mid 2034, but equally unlikely to be below $1.8M
      mid 2037. As such, we have a time gate we might expect the price of
      bitcoin to travel though. From this primitive, we can then introduce the
      concept of "First Affordable" and "Last Unaffordable".
    </p>
    <p>
      But we are getting ahead of ourselves. Ready to finally get some answers
      to "How much is enough?" Click <strong>Next</strong> to continue to
      Drawdowns.
    </p>
  </div>
);
/*
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
    setSamplesToRender(1);
    setSamples(1);
  };

  const toSlide8 = (): void => {
    setSamples(1000);
    setSamplesToRender(10);
    setRenderPriceWalks(true);
    setRenderPriceDistribution("None");
  };

  const toSlide9 = (): void => {
    setRenderPriceWalks(false);
    setRenderPriceDistribution("Quantile");
  };

  const toSlide10 = (): void => {
    setRenderPriceWalks(false);
    setRenderPriceDistribution("Quantile");
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
      if (currentSlide === 6) {
        toSlide8();
      }
      if (currentSlide === 7) {
        toSlide9();
      }
      if (currentSlide === 8) {
        toSlide10();
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
      if (currentSlide === 7) {
        toSlide7();
      }
      if (currentSlide === 8) {
        toSlide8();
      }
      if (currentSlide === 9) {
        toSlide9();
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
          <div className="slide">{Slide8}</div>
          <div className="slide">{Slide9}</div>
          <div className="slide">{Slide10}</div>
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
