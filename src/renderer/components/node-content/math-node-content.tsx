import * as React from 'react';
import { MathNode, TextNode } from '../../node';
import katex from 'katex';
import styled from 'styled-components';

const DivMath = styled.div`
  .katex-display {
    margin: 0;
    padding: .25em 0;

    .katex-html {
      width: fit-content;
    }
  }
`;

export interface MathNodeContentProps {
  node: MathNode;
}

export default function MathNodeContent(props: MathNodeContentProps) {
  return <DivMath dangerouslySetInnerHTML={{
    __html: katex.renderToString(props.node.expression, {
      displayMode: true,
      strict: true,
      trust: false,
    })
  }}>
  </DivMath>;
}