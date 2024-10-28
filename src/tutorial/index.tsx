/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";

import CaretSVG from "../components/caret";
import { isMobile, MS_PER_YEAR } from "../constants";
import { useDrawdown } from "../contexts/drawdown";
import { useModel } from "../contexts/model";
import { useRender } from "../contexts/render";

const TOTAL_SLIDES = 19;

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

const Slides = styled.div`
  width: ${TOTAL_SLIDES}00vw;
  display: flex;
  transition: transform 0.3s ease-in-out;
`;

const Slide = styled.div`
  width: 95vw;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Nav = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
`;

const SlideContent = styled.div`
  max-width: 70vw;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  text-align: left;
`;

const Tutorial = (): JSX.Element => {
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

  const Slide1 = (
    <SlideContent>
      <p>
        <strong>How Much Bitcoin is Enough?</strong>
      </p>
      <p>
        Is it 100? 10? 6.15? 1? .21? What about 1 block reward? Trying to figure
        out an answer can be overwhelming, and is generally unanswerable across
        people because it relies on big assumptions and personal circumstances
        (it's 6.15, btw).
      </p>
      <p>
        However, this question can be answered probabilistically with the right
        tools. To this end, we have built this Monte Carlo Simulator to model
        ergodic bitcoin price movements, and map those to drawdown needs. Don't
        worry about the terminology just yet, we'll go through it. At the end of
        this tutorial, you should have a robust understanding of how to make
        good use of this tool to answer the question "How much is enough?" for
        you and your goals.
      </p>
      <p>
        The tutorial will take full control of the app, resetting any changes
        you have already made, so be sure to save if you want to keep your work.
        Ready to get started? Let's 0 out everything by clicking{" "}
        <strong>Next</strong>.
      </p>
    </SlideContent>
  );

  const toggleTutorial = useCallback(() => {
    setTutorialActive(!isTutorialActive);
    if (isTutorialActive) {
      toSlide1();
      setCurrentSlide(0);
    }
  }, [isTutorialActive, toSlide1]);

  const toSlide2 = (): void => {
    setShowModel(false);
    setShowRender(false);
    setHideResults(true);
    setReoccurringItems([]);
    setOneOffFiatVariables([]);
    setOneOffItems([]);
    setBitcoin(0);
    setRenderDrawdownDistribution("None");
    setRenderPriceDistribution("None");
    setRenderDrawdownWalks(false);
    setRenderModelMax(false);
    setRenderModelMin(false);
    setRenderPriceWalks(false);
    setSamplesToRender(0);
    setSamples(0);
    setShowResults(false);
    setShowDrawdown(false);
    setEpochCount(10);
  };

  const Slide2 = (
    <SlideContent>
      <p>
        In the chart below, we now only see the historic bitcoin price (Orange
        Line), vertical past halving dates (Vertical Grey Lines), and today
        (Pink line). This should be familiar to you. But if it's not, it is
        highly recommended to pause here and go buy some Bitcoin.
      </p>
      <p>Seriously.</p>
      <p>
        Got some Bitcoin and a little price history under your belt? Click{" "}
        <strong>Next</strong> to visualize our first Bitcoin price model.
      </p>
    </SlideContent>
  );

  const toSlide3 = (): void => {
    setShowModel(false);
    setShowRender(false);
    setRenderModelMin(true);
    setSamples(0);
    setSamplesToRender(0);
    setRenderModelMax(false);
  };

  const Slide3 = (
    <SlideContent>
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
        Problematically, the Bitcoin price historically travels on a path which
        is non-linear (it's not smooth like the green line below), non-random
        (despite being non-linear it is still path-dependent on the previously
        traded price), and semi-chaotic (despite being non-random, the price is
        still affected by the chaos of the world around it: hacks, inflation,
        liquidity event, etc). As such, the predicted price isn't very
        useful--sure it might ball-park a price, but the actual price of Bitcoin
        is obviously not going to BE the path that the model takes. Even if the
        model represents a support or ceiling, these almost always eventually
        get crossed, and are still misinterpreted as price predictions.
      </p>
      <p>
        To remedy this, let's convert the simple price into a range of prices
        that might fit the model and capture this uncertainty better. Tap{" "}
        <strong>Next</strong> to add a Range.
      </p>
    </SlideContent>
  );

  const toSlide4 = (): void => {
    setShowModel(false);
    setShowRender(false);
    setRenderModelMax(true);
    setSamplesToRender(0);
  };

  const Slide4 = (
    <SlideContent>
      <p>
        The original Bitcoin Rainbow Chart became famous for plotting the
        bitcoin price in a Rainbow Range. And rightly so, for it takes the
        'price predicting' out of the equation. Now that we have a range (Green
        marking the lower bound of the range, and Red the upper bound) we can
        think of these lines as containing most (but not all) future price
        movements for any model. Let's explore different models (tap "Model ▼",
        Select "Power Law Regression Median", and choose something else). Notice
        the shape, scale, tapering and options they have.
      </p>
      <p>
        Simply having a range is not enough, however. If Bitcoin were to mostly
        trade at the top of the range, or mostly at the bottom, or hit top and
        bottom in some asymmetric way, we could have wildly different projected
        outcomes, spanning orders of magnitude and quickly becomes unless.
        Fortunately, with the two model guard-rails we have a range we can
        traverse the bitcoin price through.
      </p>
      <p>
        Let's look at one potential bitcoin future by clicking{" "}
        <strong>Next</strong>.{" "}
      </p>
    </SlideContent>
  );

  const toSlide5 = (): void => {
    setShowModel(false);
    setShowRender(false);
    setRenderPriceWalks(true);
    setSamples(1);
    setWalk("Bubble");
    setClampBottom(false);
    setClampTop(false);
    setVolatility(0.1);
    setSamplesToRender(1);
  };

  const Slide5 = (
    <SlideContent>
      <p>
        As you can see, one semi-chaotic, non-random price projection is now
        shown that roughly follows (but does not strictly respect) the shape of
        the guard-rails.
      </p>
      <p>
        This pattern is called a 'walk', it is how the price might 'step'
        through the range while remaining path-dependent on its previous step.
        Of course, this is only 1 possible future of an infinite amount of
        futures, but before we get into that, let's do what we can to fully
        understand this singular walk.
      </p>
      <p>
        This path seems to follow a noisy up-down pattern. You may have
        suspected that there seems to be an underlying shape to this walk. Well,
        there is! To see the shape, let's remove all the volatility by clicking{" "}
        <strong>Next</strong> which will set the volatility to 0 (Model ▼,
        Volatility: 0).
      </p>
    </SlideContent>
  );

  const toSlide6 = (): void => {
    setShowModel(false);
    setShowRender(false);
    setVolatility(0);
  };

  const Slide6 = (
    <SlideContent>
      <p>
        This is the pure pattern with no noise or randomness added. Cycle
        through all the different walks to see how they are differentiated
        (Model ▼, Walk Strategy). Some will render as straight lines, this means
        they are highly dependent on volatility, and, when vol is set to zero,
        are flat. (Note: This is best seen on models that are not S2F)
      </p>
      <p>
        For others, the walk might be considered "Ergodic". This means that
        given enough time, the path will always hit both the min, the max, and
        every vertical point in-between despite having a probabilistic
        distribution that might make it seem unlikely. This is fundamental to
        robust modeling because it maps what we all know is previously
        observable to any future predictions. This is the first categorical
        differentiation that sets this modeling paradigm apart.
      </p>
      <p>
        With these walks in mind, let's now pump the volatility back up to 0.1
        either by clicking <strong>Next</strong> or by manually increasing it
        and then clicking <strong>Next</strong>.
      </p>
    </SlideContent>
  );

  const toSlide7 = (): void => {
    setVolatility(0.1);
    setSamplesToRender(1);
    setSamples(1);
  };

  const Slide7 = (
    <SlideContent>
      <p>
        Cycle through the models, walks, and volatility together. Get
        comfortable plotting Bitcoins future. Which combination do you like?
        What seems reasonable? What seems improbable?
      </p>
      <p>
        You will notice that some walks respect the min and max while others do
        not. This is because all walks are strategic, relying on a variety of
        inputs. Some walks care about min and max, others care about cycles,
        momentum, or freak accidents. To force a respect of min and/or max, tap
        the respective 'clamp' checkbox (Model ▼, Clamp Price). Missing a walk
        strategy? Feel free to submit one on GitHub!
      </p>
      <p>
        Alright, now that we understand a single walk, we can begin to address
        the infinitely improbable reality that this single walk will ever occur.
      </p>
      <p>
        After all, one walk, alone, is irrelevant. But what about many in
        aggregate?
      </p>
    </SlideContent>
  );

  const toSlide8 = (): void => {
    setSamples(1000);
    setSamplesToRender(10);
    setRenderPriceWalks(true);
    setRenderPriceDistribution("None");
    setShowModel(false);
    setShowRender(false);
  };

  const Slide8 = (
    <SlideContent>
      <p>
        A Monte Carlo Simulation is were many walks are taken into account,
        given the same assumptions, to find larger patterns in the data. We have
        added 10 walks so you can begin to see this effect (Render ▼, Price:
        Walks ☑️, Walk Count: 10): The walks follow similar patterns to{" "}
        <strong>themselves</strong>.
      </p>
      <p>
        Zoom in and examine various areas of the chart. What do you notice? Look
        at today. Notice how price fans out from the current price? Open up the
        Render Tab (Render ▼), and increase the number of walks shown (Walk
        Count). As you increase the number of shown walks you will see that no
        matter the walk, they will begin to converge on filling the full range.
        Now we can start looking at our walks in aggregate.
      </p>
      <p>
        Let's look at some statistics for these walks by clicking{" "}
        <strong>Next</strong>.
      </p>
    </SlideContent>
  );

  const toSlide9 = (): void => {
    setRenderPriceWalks(false);
    setRenderPriceDistribution("Quantile");
    setShowModel(false);
    setShowRender(true);
  };

  const Slide9 = (
    <SlideContent>
      <p>
        We have two methods for analyzing aggregate walk data:{" "}
        <strong>Quantile Distribution</strong> and{" "}
        <strong>Normal Distribution</strong>
      </p>
      <p>
        <strong>Quantile Distribution</strong> (Render ▼, Price: Quantile) looks
        at all the points on all the walks at 1 point in time and then it sorts
        and divides those points into Quantiles--or percentages. Mouse over the
        edges of the orange bands to see the percentile. From the median, it
        allows you to see data shape and asymmetries, where paths gather or were
        they spread. For Quantile, 50% of all data points fall within the
        inner-most band.
      </p>
      <p>
        <strong>Normal Distribution</strong> (Render ▼, Price: Normal) looks at
        all the points on all the walks at 1 point in time and then determines
        the standard deviation from this data and, assuming the data is
        distributed normally (it usually isn't), overlooks asymmetries, and
        plots those bands from the mean.
      </p>
      <p>
        Let's focus on Quantile with a quick discussion of Granularity and Data
        by clicking <strong>Next</strong>.
      </p>
    </SlideContent>
  );

  const toSlide10 = (): void => {
    setRenderPriceWalks(false);
    setRenderPriceDistribution("Quantile");
    setShowModel(true);
    setShowRender(false);
  };

  const Slide10 = (
    <SlideContent>
      <p>
        Two key inputs significantly impact this tool's quality:{" "}
        <strong>Epoch Count</strong> and <strong>Samples</strong>.
      </p>
      <p>
        <strong>Epoch Count</strong> (Model ▼, Epoch Count) represents the
        number of 4-year halving cycles on the chart. Monte Carlo Simulators are
        resource-intensive, especially in browsers. While limits are in place,
        exercise caution with your device as this app can easily eat all memory.
        Remember, longer projections are more computationally expensive and less
        relevant (e.g. if fiat collapses this entire app is irrelevant, and we
        know that's coming eventually).
      </p>
      <p>
        <strong>Samples</strong> (Model ▼, Statistical Sample Count) determine
        data granularity. More samples (e.g., 2000 vs 1000) result in smoother
        Quantile bands but impact performance. Keep samples at 1000 while
        adjusting other parameters, then increase once finished. The app's limit
        is 10,000, which is the typical minimum for serious Monte Carlo
        Simulations.
      </p>
      <p>
        We've provided an estimated data size for reference, though actual size
        will vary across browsers.
      </p>
      <p>
        Before we get some answers to "How much is enough?" we have one more
        important, preliminary concept to cover.
      </p>
    </SlideContent>
  );

  const toSlide11 = (): void => {
    setShowModel(false);
    setShowRender(false);
    setBitcoin(0);
    setShowDrawdown(false);
    setRenderPriceWalks(false);
    setRenderPriceDistribution("Quantile");
    setRenderDrawdownWalks(false);
    setEpochCount(10);
  };

  const Slide11 = (
    <SlideContent>
      <p>
        So far, we have looked at Bitcoin Price modeling, walks, using these in
        concert to create thousands of price predictions, and the probabilities
        given our assumptions.
      </p>
      <p>
        This, on its own, is a very powerful tool. No one knows the future, of
        course, but with this tool we can begin to speculate on the
        probabilities around price predictions, given model assumptions, which
        offer yet another categorical modeling advantage over all other types of
        modeling.
      </p>
      <p>
        For instance, <strong>Gating:</strong> If I assume Power Law Regression
        Median, and I assume 1 bubble per epoch, and full clamping, I might then
        expect a very low probability of price being above $1.8M mid 2034, but
        equally unlikely to be below $1.8M mid 2037. As such, we have a gate we
        might expect the price of bitcoin to travel though. From this primitive,
        we can then introduce the concept of "First Affordable" and "Last
        Unaffordable".
      </p>
      <p>
        But we are getting ahead of ourselves. Ready to finally get some answers
        to "How much is enough?" Click <strong>Next</strong> to continue to
        Drawdowns.
      </p>
    </SlideContent>
  );

  const toSlide12 = (): void => {
    setShowModel(false);
    setShowRender(false);
    setSamples(1000);
    setRenderPriceWalks(true);
    setSamplesToRender(1);
    setRenderPriceDistribution("None");
    setShowDrawdown(true);
    setBitcoin(1000);
    setInflation(0);
    setRenderDrawdownWalks(true);
    setReoccurringItems([]);
    setOneOffFiatVariables([]);
    setOneOffItems([]);
  };

  const Slide12 = (
    <SlideContent>
      <p>Congratulations!</p>
      <p>
        A Nigerian Prince recently passed away and you have inherited 1000
        bitcoin from his estate! You can now see that you have 1000 bitcoin in
        the Drawdown Box on the bottom. This number represent the current
        starting drawdown amount; the amount of bitcoin held today.
      </p>
      <p>
        It is important to note that you should never enter how much bitcoin you
        have online. Ever. Because this tool is for educational and
        entertainment purposes only and should not even be used as a substitute
        for real life financial planning, this shouldn't be an issue here. But
        just in case you slip up, this app does not transmit or record how much
        bitcoin is entered in this box. Further, this app is fully open source
        so this claim can be verified. Please see the <strong>Legal</strong> and{" "}
        <strong>Source</strong> links at the bottom of this page.
      </p>
      <p>
        You will also notice that a new horizontal line has appeared in the
        chart. This is how much bitcoin you have over time (in this case 1000).
        We will start as we started for bitcoin price projections: with 1
        drawdown sample.
      </p>
    </SlideContent>
  );

  const toSlide13 = (): void => {
    setReoccurringItems([]);
    setOneOffFiatVariables([]);
    setOneOffItems([
      {
        active: true,
        amountToday: 10_000_000,
        effective: new Date(Date.now() + MS_PER_YEAR * 8),
        expense: true,
        id: "tutorial_item_1",
        isFiat: true,
        name: "El Salvador Dream Home",
      },
    ]);
    setRenderDrawdownDistribution("None");
    setRenderPriceDistribution("None");
    setRenderPriceWalks(true);
    setRenderDrawdownWalks(true);
  };

  const Slide13 = (
    <SlideContent>
      <p>We have now added a drawdown event.</p>
      <p>
        With your new-found massive net worth (but pleb ways), you plan to buy a
        dream home in 8 years, presently valued at $10,000,000, in El Salvador!
        You should see a new vertical line with a label and a change in your
        total remaining bitcoin. Zoom into the event, you should notice that
        your total bitcoin has been drawn down by the cost of the event, divided
        by the first price after the event ($10,000,000 / bitcoin price in 8
        years).
      </p>
      <p>
        Now, again, no one can know the price of bitcoin 8 years in advance
        making this event meaningless, so, let's bump up the sample count.
      </p>
      <p>
        Open Render ▼, and increase the Walk Count. As you do, notice the new
        bitcoin price at the event date, and how much bitcoin you are left with
        after each walk. In aggregate we start to see some probabilities.
      </p>
      <p>
        Click <strong>Next</strong> to check out the stats.
      </p>
    </SlideContent>
  );

  const toSlide14 = (): void => {
    setShowRender(false);
    setShowModel(false);
    setShowDrawdown(true);
    setSamplesToRender(1);
    setRenderPriceDistribution("Quantile");
    setBitcoin(1000);
    setInflation(0);
    setRenderDrawdownWalks(false);
    setRenderPriceWalks(false);
    setReoccurringItems([]);
    setOneOffFiatVariables([]);
    setRenderDrawdownDistribution("Quantile");
  };

  const Slide14 = (
    <SlideContent>
      <p>
        We now see the quantile distribution of price and our single drawdown.
        On the right, at the end of the chart, when you hover your mouse, you
        should see your final median amount, as well as specific quantiles. What
        is the worst possible drawdown from buying a present-value $10,000,000
        house on this date? Is it still worth it for you?
      </p>
      <p>
        Most drawdowns will be viewed in this form, so, let's now edit the
        drawdown to understand it a bit more. In Drawdown ▼, click the item "El
        Salvador Dream Home". A modal should open. Let's change two variables.
        Set Currency to BTC and Amount Today to 1. Click "Save".
      </p>
      <p>
        As you can see, all quantiles have collapsed. This drawdown event is now
        denominated in bitcoin, so in all possible sample futures, you end up
        with 999 BTC.
      </p>
      <p>
        Open up the edit modal again and uncheck "Expense", then Save. This
        toggles the expense to an acquisition, say, if you planned to sell a
        house on this date for 1 Bitcoin. If you switch back to $10,000,000 USD,
        you will again see the spread but to the upside.
      </p>
      <p>
        We will reset the house when we click <strong>Next</strong> and learn to
        add a new drawdown event.
      </p>
    </SlideContent>
  );

  const toSlide15 = (): void => {
    setShowRender(false);
    setShowModel(false);
    setShowDrawdown(true);
    setSamplesToRender(1);
    setRenderPriceDistribution("Quantile");
    setBitcoin(1000);
    setInflation(0);
    setRenderDrawdownWalks(false);
    setRenderPriceWalks(false);
    setReoccurringItems([]);
    setOneOffFiatVariables([]);
    setOneOffItems([
      {
        active: true,
        amountToday: 10_000_000,
        effective: new Date(Date.now() + MS_PER_YEAR * 8),
        expense: true,
        id: "tutorial_item_1",
        isFiat: true,
        name: "El Salvador Dream Home",
      },
    ]);
    setRenderDrawdownDistribution("Quantile");
  };

  const Slide15 = (
    <SlideContent>
      <p>
        Click the ➕ button to add a new drawdown event. Select Type:
        "Reoccurring", give it the name "Retirement", choose currency "USD",
        enter the annual cost of this Reoccurring event: in USD terms, sitting
        on 1000 bitcoin, what is the cost of the lifestyle you would like in
        retirement? $100,000? $10,000,000? The world is yours! Leave the rest
        unchanged for now. Click "Save".
      </p>
      <p>
        A reoccurring event takes the annual expense (or income) amortizes it to
        a weekly basis, and plots that change every week. If you chose
        $10,000,000, you might run into a few cases where you run out of
        Bitcoin. You can also choose to start this Reoccurring Event later, or
        set an end date.
      </p>
      <p>
        We have one more darwdown event type to cover:{" "}
        <strong>One-Off Fiat Variable-Date</strong>
      </p>
    </SlideContent>
  );

  const toSlide16 = (): void => {};

  const Slide16 = (
    <SlideContent>
      <p>
        What if you have low time preference and instead of needing an item by a
        specific date, would rather wait to spend a specific amount of bitcoin?
        Enter One-Off Fiat Variable-Date Event type (Sure, it needs a better
        name, but this is fine for now).
      </p>
      <p>
        Click the ➕ button to add another drawdown event. Select Type: "One-Off
        Fiat Variable-Date", give it the name "Art Deco Skyscraper", enter
        $1,000,000,000 USD. Let's start with willing to spend 100 bitcoin. Leave
        the other fields as they are and click "Save". As you can see we now
        have a new drawdown event, but unlike other one-off events this event
        has a strange shape and a range. Why?
      </p>
      <p>
        If you are only willing to spend a specific amount of bitcoin, and can
        wait, that means that your spend date will be different for each sample.
        This is where first-affordable and last-unaffordable come into play. As
        their naming suggests, they form two meaningful date bounds for spending
        on each sample. The default Start (%) is 100, meaning spend on the on
        last-unaffordable day. Be cautions about any % that's not 0 or 100, as
        many could mean spending more bitcoin than you might like! Delay, is an
        additional weekly delay.
      </p>
      <p>
        As expected, increasing the bitcoin willing to spend, will push up the
        range, and decreasing it will decrease the range.
      </p>
    </SlideContent>
  );

  const toSlide17 = (): void => {};

  const Slide17 = (
    <SlideContent>
      <p>
        Now that we have a strong sense of our drawdown options, it's time to
        talk about inflation.
      </p>
      <p>
        Next to your starting bitcoin amount (1000), you'll see an Inflation box
        presently at 0%. Increase inflation by a few %.
      </p>
      <p>
        As expected, increasing the inflation moves the Skyscraper event out in
        time. At some level of inflation, you will never be able to afford the
        skyscraper! Also notice that as you increase inflation, your retirement
        becomes more expensive, too.
      </p>
      <p>
        The Inflation box applies to drawdowns only and not bitcoin price--if it
        did, all price models would eventually be S-curves. It is applied evenly
        to all drawdown event costs, and compounds. A drawdown event that costs
        $100,000 today with 10% inflation will cost $110,000 in 1 year from now,
        and $121,000 two years from now, etc. Because the timelines are long,
        this will catch up to and exceed all non-exponential price models. So,{" "}
        <strong>watch out!</strong> If you think you have added a drawdown
        event, but do not see it, it may be because inflation outpaces the
        assumptive rise of bitcoin forever precluding affordability.
      </p>
      <p>
        Bad enough, to be sure. But this doesn't even scratch the surface of how
        evil inflation is. Let's see a more realistic scenario...
      </p>
    </SlideContent>
  );

  const toSlide18 = (): void => {
    setRenderPriceDistribution("Quantile");
    setModel("Power Law Regression Median");
    setRenderPriceWalks(false);
    setEpochCount(20);
    setClampBottom(true);

    setRenderDrawdownDistribution("Quantile");
    setRenderDrawdownWalks(false);
    setBitcoin(0);
    setInflation(3);
    setReoccurringItems([
      {
        active: true,
        annualAmount: 5000,
        annualPercentChange: 0,
        effective: new Date(),
        end: new Date(Date.now() + MS_PER_YEAR * 30),
        expense: false,
        id: "item_retirement_1",
        isFiat: true,
        name: "Retirement Saving",
      },
      {
        active: true,
        annualAmount: 200_000,
        annualPercentChange: 0,
        effective: new Date(Date.now() + MS_PER_YEAR * 30),
        expense: true,
        id: "item_retirement_2",
        isFiat: true,
        name: "Retirement Drawdown",
      },
    ]);
    setOneOffFiatVariables([]);
    setOneOffItems([]);
  };

  const Slide18 = (
    <SlideContent>
      <p>
        You wasted your 20s on fiat BS and have no net worth, but at 30 years
        old, you finally took the Orange Pill: 🤯 You have committed to stacking
        a modest $5,000 of bitcoin every year for the next 30 years, and then
        living off that in retirement at $200,000 a year (in today's dollars).
        You suspect inflation will always be more than they say, so you figure
        3% (50% above the Feds target goal of 2%) is a very conservative
        expectation.
      </p>
      <p>
        According to the chart, you have around a 50% chance of still having
        bitcoin when you turn 110. Not bad! However, just to double-check
        yourself, you wonder how much you might have if inflation is just 1%
        higher. Increase inflation by 1%.
      </p>
      <p>
        As you can see, a 1% increase in inflation over the course of your
        lifetime translates to losing 30 YEARS. No problem, you adjust your
        retirement expectations: Change your retirement lifestyle to $100,000.
        And you're right back up there! But then you discover Shadow Stats and a
        real inflation rate inline with money supply of between 8% and 12%.
        Increase inflation to 8%.
      </p>
      <p>
        Assuming 8% inflation, what can you do to last till 110? There are many
        ways to skin this cat. How would you do it?
      </p>
    </SlideContent>
  );

  const toSlide19 = (): void => {};

  const Slide19 = (
    <SlideContent>
      <p>
        Solving the above problem is hard. But Bitcioners are used to doing
        things the hard way and as such inflation defaults to 8%.
      </p>
      <p>However, there is one universal way to solve this problem:</p>
      <p />
      <p />
      <p>Fiat delenda est.</p>
    </SlideContent>
  );

  const nextSlide = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
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
      if (currentSlide === 9) {
        toSlide11();
      }
      if (currentSlide === 10) {
        toSlide12();
      }
      if (currentSlide === 11) {
        toSlide13();
      }
      if (currentSlide === 12) {
        toSlide14();
      }
      if (currentSlide === 13) {
        toSlide15();
      }
      if (currentSlide === 14) {
        toSlide16();
      }
      if (currentSlide === 15) {
        toSlide17();
      }
      if (currentSlide === 16) {
        toSlide18();
      }
      if (currentSlide === 17) {
        toSlide19();
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
      if (currentSlide === 10) {
        toSlide10();
      }
      if (currentSlide === 11) {
        toSlide11();
      }
      if (currentSlide === 12) {
        toSlide12();
      }
      if (currentSlide === 13) {
        toSlide13();
      }
      if (currentSlide === 14) {
        toSlide14();
      }
      if (currentSlide === 15) {
        toSlide15();
      }
      if (currentSlide === 16) {
        toSlide16();
      }
      if (currentSlide === 17) {
        toSlide17();
      }
      if (currentSlide === 18) {
        toSlide18();
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
      <Showable $isOpen={isTutorialActive}>
        <Slides style={transitionStyle}>
          <Slide>{Slide1}</Slide>
          <Slide>{Slide2}</Slide>
          <Slide>{Slide3}</Slide>
          <Slide>{Slide4}</Slide>
          <Slide>{Slide5}</Slide>
          <Slide>{Slide6}</Slide>
          <Slide>{Slide7}</Slide>
          <Slide>{Slide8}</Slide>
          <Slide>{Slide9}</Slide>
          <Slide>{Slide10}</Slide>
          <Slide>{Slide11}</Slide>
          <Slide>{Slide12}</Slide>
          <Slide>{Slide13}</Slide>
          <Slide>{Slide14}</Slide>
          <Slide>{Slide15}</Slide>
          <Slide>{Slide16}</Slide>
          <Slide>{Slide17}</Slide>
          <Slide>{Slide18}</Slide>
          <Slide>{Slide19}</Slide>
        </Slides>
        <Nav>
          <button
            disabled={currentSlide === 0}
            onClick={previousSlide}
            type="button"
          >
            Back
          </button>
          {currentSlide + 1}/{TOTAL_SLIDES}
          <button
            disabled={currentSlide === TOTAL_SLIDES - 1}
            onClick={nextSlide}
            type="button"
          >
            Next
          </button>
        </Nav>
      </Showable>
    </Container>
  );
};

export default Tutorial;
