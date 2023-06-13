import * as React from 'react';
import { MathNode, TextNode } from '../../node';
import { inlineNodeToElement } from '../../tree';
import katex from 'katex';

export interface MathNodeContentProps {
  node: MathNode;
}

export default function MathNodeContent(props: MathNodeContentProps) {
  return <div className='content math-node' dangerouslySetInnerHTML={{
    __html: katex.renderToString(props.node.expression, { displayMode: true })
  }}>
  </div>;
}