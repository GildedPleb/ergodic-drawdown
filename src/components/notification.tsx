import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import styled from "styled-components";

import { isMobile } from "../constants";

// Styled components
const StyledToastContainer = styled(ToastContainer)`
  .Toastify__toast {
    background-color: hsl(0, 0%, 14%);
    border: 1px solid grey;
    border-radius: 1px;
  }
  .Toastify__close-button {
    color: #666;
    opacity: 0.8;
    align-self: center;
  }

  padding: 20px;
`;

const MOBILE_WELCOME_KEY = "mobile-welcome-shown";

export const Notifications: React.FC = () => {
  const [, setHasShownWelcome] = useState(false);

  useEffect(() => {
    if (isMobile() && localStorage.getItem(MOBILE_WELCOME_KEY) !== "true") {
      toast.info(
        "Welcome to Our App! For getting started, we recommend using a desktop web browser to access our helpful Tutorial feature.",
        {
          autoClose: 8000,
          closeOnClick: true,
          draggable: true,
          hideProgressBar: true,
          onClose: () => {
            localStorage.setItem(MOBILE_WELCOME_KEY, "true");
            setHasShownWelcome(true);
          },
          pauseOnHover: true,
          position: "top-center",
        },
      );
    }
  }, []);

  return <StyledToastContainer limit={3} newestOnTop={true} />;
};

export default Notifications;
