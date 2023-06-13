import * as React from 'react';
import { TextNode } from '../node';
import { inlineNodeToElement } from '../tree';

export interface TextContentProps {
  node: TextNode;
}

export default function TextContent(props: TextContentProps) {
  return <div className='content text-node'>{inlineNodeToElement(props.node.content)}</div>;
}