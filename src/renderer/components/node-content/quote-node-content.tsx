import * as React from 'react';
import { QuoteNode } from '../../node';
import { inlineNodeToElement } from '../../tree';
import styled from 'styled-components';

const DivQuote = styled.div`
  border-left: 2px solid ${props => props.theme.colorEditorQuote};
  padding-left: 12px;
`;

export interface QuoteNodeContentProps {
  node: QuoteNode;
}

export default function QuoteNodeContent(props: QuoteNodeContentProps) {
  return <DivQuote>{inlineNodeToElement(props.node.content)}</DivQuote>;
}