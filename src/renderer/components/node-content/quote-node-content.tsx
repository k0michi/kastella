import * as React from 'react';
import { QuoteNode } from '../../node';
import { inlineNodeToElement } from '../../tree';
import { useModel } from 'kyoka';
import Model from '../../model';

export interface QuoteNodeContentProps {
  node: QuoteNode;
}

export default function QuoteNodeContent(props: QuoteNodeContentProps) {
  return <div className='content quote-node'>{inlineNodeToElement(props.node.content)}</div>;
}