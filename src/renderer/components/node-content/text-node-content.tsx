import * as React from 'react';
import { TextNode } from '../../node';
import { inlineNodeToElement } from '../../tree';

export interface TextNodeContentProps {
  node: TextNode;
}

export default function TextNodeContent(props: TextNodeContentProps) {
  return <div className='content text-node'>{inlineNodeToElement(props.node.content)}</div>;
}