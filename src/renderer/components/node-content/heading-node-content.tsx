import * as React from 'react';
import { HeadingNode, MathNode, TextNode } from '../../node';
import { inlineNodeToElement } from '../../tree';
import { useModel } from 'kyoka';
import Model from '../../model';
import styled from 'styled-components';

const DivHeading = styled.div<{ $fontSize: string }>`
  font-size: ${props => props.$fontSize};
  font-weight: bold;
`;

export interface HeadingNodeContentProps {
  node: HeadingNode;
}

export default function HeadingNodeContent(props: HeadingNodeContentProps) {
  const model = useModel<Model>();
  const headingDepth = model.library.getHeadingDepth(props.node);
  const COEFF = 2 ** (1 / 6);
  const fontSize = Math.max(2 / COEFF ** headingDepth, 1);

  return <DivHeading $fontSize={`${fontSize}em`}>{inlineNodeToElement(props.node.content)}</DivHeading>;
}