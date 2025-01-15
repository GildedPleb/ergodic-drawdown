import sc, { createGlobalStyle } from "styled-components";
import reset from "styled-reset";

// Needed for intellisense
const styled = { createGlobalStyle, ...sc };

const GlobalStyle = styled.createGlobalStyle`
  ${reset}

  html,
  body {
    box-sizing: border-box;

    padding: 0;
    margin: 0;
    min-width: 320px;
    min-height: 100vh;

    display: flex;
    place-items: center;

    color-scheme: light dark;
    color: #f3f3f3;
    background-color: hsl(0, 0%, 14%);

    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-synthesis: none;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
    text-align: left;
  }

  &#root {
    width: 100vw;
    height: 100vh;
  }

  a {
    font-weight: 500;
    color: #646cff;
    text-decoration: inherit;
  }
  a:hover {
    color: #535bf2;
  }

  button {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    text-decoration: underline;
    font-family: inherit;
    background-color: #131313;
    cursor: pointer;
    transition: border-color 0.25s;
  }
  button:hover {
    border-color: #646cff;
  }
  button:focus,
  button:focus-visible {
    outline: 4px auto -webkit-focus-ring-color;
  }

  h1 {
    font-size: 3.2em;
    line-height: 1.1;
  }

  p {
    margin: 0.5rem 0.5rem;
    font-size: 0.8rem;
  }

  ul {
    list-style-type: disc;
    margin-left: 0.5rem;
  }

  li {
    margin: 0.8rem 0.8rem;
    font-size: 0.8rem;
  }

  strong {
    font-weight: bold;
  }

  em {
    font-style: italic;
  }

  input {
    color: #ffffff;
    background-color: hsl(0, 0%, 14%);
    border: 1px solid grey;
  }

  @media (prefers-color-scheme: light) {
    :root {
      color: #213547;
      background-color: #ffffff;
    }
    a:hover {
      color: #747bff;
    }
    button {
      background-color: #f9f9f9;
    }
  }

  @media only screen and (max-width: 460px) {
  }
`;

export default GlobalStyle;
