import * as React from 'react';
import styled from 'styled-components';

const ButtonToolButton = styled.button`
  border: none;
  background: none;
  padding: 0.15em 0.3em;
  color: ${props => props.theme.color};
  border-radius: 4px;
  line-height: 0;

  &:hover {
    background-color: ${props => props.theme.colorTool};
  }

  &:active:hover {
    background-color: ${props => props.theme.colorToolActive};
  }
`;

export interface ToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
}

export default function ToolButton(props: ToolButtonProps) {
  return <ButtonToolButton {...props} />;
}