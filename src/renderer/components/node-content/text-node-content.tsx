import * as React from 'react';
import { TextNode } from '../../node';
import { inlineNodeToElement } from '../../tree';
import styled from 'styled-components';

const DivTextNode = styled.div`
  a {
    color: inherit;
  }
`;

export interface TextNodeContentProps {
  node: TextNode;
}

export default function TextNodeContent(props: TextNodeContentProps) {
  return <DivTextNode>{inlineNodeToElement(props.node.content)}</DivTextNode>;
}