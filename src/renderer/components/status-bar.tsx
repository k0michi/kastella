import * as React from 'react';
import { useModel, useObservable } from 'kyoka';
import Model from '../model';
import styled from 'styled-components';

const DivStatusBar = styled.div`
  border-top: 1px solid ${props => props.theme.colorBorder};
  box-sizing: content-box;
  padding: 4px;
  min-height: 1em;
  line-height: 1;
  flex: 0 0 fit-content;
  background-color: ${props => props.theme.colorStatus};
`;

export default function StatusBar() {
  const model = useModel<Model>();
  const status = useObservable(model.status);

  return (
    <DivStatusBar>{status?.message}</DivStatusBar>
  );
}