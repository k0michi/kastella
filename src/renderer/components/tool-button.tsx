import * as React from 'react';
import styled from 'styled-components';

const ButtonToolButton = styled.button`
  border: 1px solid ${props => props.theme.colorBorder};
  padding: 0.15em 0.3em;
  background-color: ${props => props.theme.colorTool};
  color: ${props => props.theme.color};
  border-radius: 2px;
  line-height: 0;
`;

export interface ToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
}

export default function ToolButton(props: ToolButtonProps) {
  return <ButtonToolButton {...props} />;
}