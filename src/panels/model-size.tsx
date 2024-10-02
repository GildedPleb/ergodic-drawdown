import { useEffect, useState } from "react";
import styled from "styled-components";

import DataPointCount from "../components/data-point-count";
import { useModel } from "../contexts/model";

const Container = styled.div`
  display: flex;
  gap: 0 5px;
  justify-content: flex-end;
  color: grey;
  font-size: small;
  margin-top: -19px;
  padding-right: 5px;

  z-index: 12;
`;

const ModelSize = ({ isExpanded }: { isExpanded: boolean }): JSX.Element => {
  const { model, walk } = useModel();
  const [display, setDisplay] = useState(<DataPointCount />);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const summary = `${model} • ${walk}`;
      setDisplay(isExpanded ? <DataPointCount /> : <span>{summary}</span>);
    }, 200);
    return () => {
      clearTimeout(timeout);
    };
  }, [isExpanded, model, walk]);
  return <Container>{display}</Container>;
};

export default ModelSize;
