import * as React from 'react';
import { HeadingNode, MathNode, QuoteNode, TextNode } from '../../node';
import { inlineNodeToElement } from '../../tree';
import { useModel } from 'kyoka';
import Model from '../../model';

export interface QuoteNodeContentProps {
  node: QuoteNode;
}

export default function QuoteNodeContent(props: QuoteNodeContentProps) {
  const model = useModel<Model>();
  const headingDepth = model.library.getHeadingDepth(props.node);
  const COEFF = 2 ** (1 / 6);
  const fontSize = Math.max(2 / COEFF ** headingDepth, 1);

  return <div className='content quote-node'>{inlineNodeToElement(props.node.content)}</div>;
}