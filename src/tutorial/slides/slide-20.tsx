/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { type SlideRequirement } from "../../types";

const Slide20: FC = () => (
  <SlideContent>
    <p>There is one more feature to show off: Saving and Loading work.</p>
    <p>
      This feature is extremely rudimentary, and a little different than what
      you may be used to. On the bottom of the Drawdown ▼ pane, are two buttons,
      💾 Save and 📂 Load. Go ahead and click 💾 Save.
    </p>
    <p>
      Saving your work will save all app state to a file. The saved file is
      encrypted in your browser and saved to your device, it is never in
      transit, and can not be viewed by anyone without the password. Enter a
      password and click save.
    </p>
    <p>Now, hit the red ❌'s next to the items in your drawdown list. Bye!</p>
    <p>
      Tap the 📂 Load button. Choose the encrypted file. Type in the password.
      Hit Load. You should now have all your items back!{" "}
    </p>
  </SlideContent>
);

export const slide20 = {
  component: Slide20,
  requirements: {} satisfies SlideRequirement,
};
