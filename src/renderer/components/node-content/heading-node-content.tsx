import * as React from 'react';
import { HeadingNode, MathNode, TextNode } from '../../node';
import { inlineNodeToElement } from '../../tree';
import { useModel } from 'kyoka';
import Model from '../../model';

export interface HeadingNodeContentProps {
  node: HeadingNode;
}

export default function HeadingNodeContent(props: HeadingNodeContentProps) {
  const model = useModel<Model>();
  const headingDepth = model.library.getHeadingDepth(props.node);
  const COEFF = 2 ** (1 / 6);
  const fontSize = Math.max(2 / COEFF ** headingDepth, 1);

  return <div className='content heading-node' style={{ 'fontSize': fontSize + 'em' }}>{inlineNodeToElement(props.node.content)}</div>;
}