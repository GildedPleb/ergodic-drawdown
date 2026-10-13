import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide5: FC = () => (
  <SlideContent>
    <p>
      As you can see, one semi-chaotic, non-random price projection is now shown that roughly
      follows (but does not strictly respect) the shape of the guard-rails.
    </p>
    <p>
      This pattern is called a 'walk', it is how the price might 'step' through the range while
      remaining path-dependent on its previous step. Of course, this is only one extraordinarily
      unlikely future of an infinite amount of futures, but before we get into that, let's do what
      we can to fully understand this singular walk.
    </p>
    <p>
      This path seems to follow a noisy up-down pattern. You may have suspected that there seems to
      be an underlying shape to this walk. Well, there is!
    </p>
    <p>
      To see the shape, let's remove all the volatility by clicking <strong>Next</strong> which will
      set the volatility to 0 (Model ▼, Volatility: 0).
    </p>
  </SlideContent>
);

export const slide5 = {
  component: Slide5,
  requirements: {
    clampBottom: false,
    clampTop: false,
    renderPriceWalks: true,
    samples: 1,
    samplesToRender: 1,
    showModel: false,
    showRender: false,
    volatility: 0.1,
    walk: "Bubble",
  } satisfies SlideRequirement,
};
