/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { useCallback, useMemo, useState } from "react";

import { isMobile } from "../constants";
import { useModel } from "../contexts/model";
import { useRender } from "../contexts/render";

const totalSlides = 12;

const Slide0 = (
  <div className="slide-content">
    <p>
      This website is a Monte Carlo Simulator to model ergodic bitcoin
      drawdowns. But that is a mouthful. To put it simply, this website allows
      someone to know probabilistically how much bitcoin is enough. To better
      understand how it works, let's walk through what this website does and
      why. This tutorial assumes you are familiar with bitcoin market data and
      broadly aware of financial topics like a stock chart.
    </p>
    <p>
      First, let's 0 out everything by clicking <strong>Next</strong>.
    </p>
  </div>
);

const Slide1 = (
  <div className="slide-content">
    <p>
      In the chart below, we now only see the historic bitcoin price, and
      vertical past halving dates. This is nothing new. Click{" "}
      <strong>Next</strong> to visualize a model that predicts a future bitcoin
      price range.
    </p>
  </div>
);

const Slide2 = (
  <div className="slide-content">
    <p>
      We can visualize a model by looking at the shape of its model min (green
      line) and model max (red line). Explore different models and notice the
      shape, scale, tapering and options they have. With the two model
      boundaries (min and max) we then have a range we can traverse the bitcoin
      price through. Let's do that by adding one walk by clicking{" "}
      <strong>Next</strong>.
    </p>
  </div>
);
const Slide3 = (
  <div className="slide-content">
    <p>
      As you can see, a random price projection is now shown that roughly
      follows the boundaries. Of note, this path seems to follow a noisy jagged
      up-down pattern. But what pattern does it follow? Let's set volatility to
      0 by clicking <strong>Next</strong> to find out.
    </p>
  </div>
);

const Slide4 = (
  <div className="slide-content">
    <p>
      This is the pure pattern with no noise or randomness added. This pattern
      is called a 'walk' it is how the price moves through the range. Cycle
      through all the different walks to see how they are differentiated. With
      these walks in mind, let's now pump the volatility back up to .1 by
      clicking <strong>Next</strong>
    </p>
  </div>
);

const Slide5 = (
  <div className="slide-content">
    <p>
      Cycle through the walks again, now while also adjusting volatility. You
      will notice that some walks respect the min and max while others do not.
      This is because walks are strategic and rely on a variety of inputs, where
      some walks care about min and max, others care about cycles. However, it
      should be evident that the walk attempts to traverse the full range from
      min to max over time. This is what it means to be 'ergodic'. Of course,
      you will have noticed that some walks do not hit both min and max--a
      random walk, for instance, has no respect for anything! For the walks that
      do not respect min and max to become ergodic, which is important for
      robust modeling, we simply add more of them. Let's do this now by clicking{" "}
      <strong>Next</strong>.
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
    setRenderDrawdownNormal,
    setRenderDrawdownQuantile,
    setRenderDrawdownWalks,
    setRenderExpenses,
    setRenderModelMax,
    setRenderModelMin,
    setRenderPriceNormal,
    setRenderPriceQuantile,
    setRenderPriceWalks,
    setSamplesToRender,
  } = useRender();

  const [isTutorialActive, setTutorialActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const toSlide0 = useCallback((): void => {
    setSamples(1000);
    setRenderPriceQuantile(true);
    setRenderDrawdownQuantile(true);
    setSamplesToRender(10);
    setRenderModelMax(true);
    setRenderModelMin(true);
    setRenderExpenses(true);
    setVolatility(0.1);
  }, [
    setRenderExpenses,
    setRenderModelMax,
    setRenderModelMin,
    setRenderPriceQuantile,
    setRenderDrawdownQuantile,
    setSamples,
    setSamplesToRender,
    setVolatility,
  ]);
  const toggleTutorial = useCallback(() => {
    setTutorialActive(!isTutorialActive);
    if (isTutorialActive) {
      toSlide0();
      setCurrentSlide(0);
    }
  }, [isTutorialActive, toSlide0]);

  const toSlide1 = (): void => {
    setRenderDrawdownWalks(false);
    setRenderExpenses(false);
    setRenderModelMax(false);
    setRenderModelMin(false);
    setRenderDrawdownNormal(false);
    setRenderPriceNormal(false);
    setRenderPriceQuantile(false);
    setRenderPriceWalks(false);
    setRenderDrawdownQuantile(false);
    setSamplesToRender(0);
    setSamples(0);
  };

  const toSlide2 = (): void => {
    setRenderModelMax(true);
    setRenderModelMin(true);
    setSamples(0);
    setSamplesToRender(0);
  };

  const toSlide3 = (): void => {
    setSamplesToRender(1);
    setRenderPriceWalks(true);
    setSamples(1);
    setWalk("Bubble");
    setClampBottom(false);
    setClampTop(false);
    setVolatility(0.1);
  };

  const toSlide4 = (): void => {
    setVolatility(0);
  };

  const toSlide5 = (): void => {
    setVolatility(0.1);
  };

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
      if (currentSlide === 0) {
        toSlide1();
      }
      if (currentSlide === 1) {
        toSlide2();
      }
      if (currentSlide === 2) {
        toSlide3();
      }
      if (currentSlide === 3) {
        toSlide4();
      }
      if (currentSlide === 4) {
        toSlide5();
      }
    }
  }, [currentSlide]);

  const previousSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      if (currentSlide === 1) {
        toSlide0();
      }
      if (currentSlide === 2) {
        toSlide1();
      }
      if (currentSlide === 3) {
        toSlide2();
      }
      if (currentSlide === 4) {
        toSlide3();
      }
      if (currentSlide === 5) {
        toSlide4();
      }
    }
  }, [currentSlide]);

  const tutorialText = isTutorialActive ? "Close Tutorial" : "Tutorial";
  const transitionStyle = useMemo(
    () => ({
      transform: `translateX(calc(min(95vw, 1300px) * -${Number(currentSlide)}))`,
    }),
    [currentSlide],
  );

  if (isMobile()) return <></>;
  return (
    <div className="tutorial-container">
      <button onClick={toggleTutorial} type="button">
        {tutorialText}
      </button>
      <div className={`showables ${isTutorialActive ? "visible" : ""}`}>
        <div className="slides" style={transitionStyle}>
          <div className="slide">{Slide0}</div>
          <div className="slide">{Slide1}</div>
          <div className="slide">{Slide2}</div>
          <div className="slide">{Slide3}</div>
          <div className="slide">{Slide4}</div>
          <div className="slide">{Slide5}</div>
          <div className="slide">{Slide1}</div>
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
      </div>
    </div>
  );
};

export default Tutorial;
