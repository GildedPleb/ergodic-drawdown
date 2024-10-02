import React from "react";
import styled from "styled-components";

const label = "View source on GitHub";
const verify = "Verify";
const source = "Source on GitHub";

const Container = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 135px;
  overflow: hidden;
  z-index: 1000;
`;

const HREF = styled.a`
  display: block;
  width: 300px;
  height: 45px;
  background: #1a1a1a;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: bold;
  text-align: center;
  position: absolute;
  top: 30px;
  right: -100px;
  transform: rotate(45deg);
  transition: all 0.3s;
  border: 1px solid #1a1a1a;
  &:hover {
    border-color: #646cff;
  }
`;

const ForkUs = (): React.JSX.Element => {
  return (
    <Container className="angled-ribbon">
      <HREF
        aria-label={label}
        href="https://github.com/gildedpleb/ergodic-drawdown"
      >
        {verify}
        <br />
        {source}
      </HREF>
    </Container>
  );
};

export default ForkUs;
