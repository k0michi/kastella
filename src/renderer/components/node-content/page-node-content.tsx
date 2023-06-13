import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { PageNode } from '../../node';

interface PageNodeContentProps {
  node: PageNode;
}

export default function PageNodeContent(props: PageNodeContentProps) {
  return <div className='content page-node'>[page] {props.node.name}</div>;
}