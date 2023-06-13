import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../model';
import { PageNode } from '../node';

interface PageContentProps {
  node: PageNode;
}

export default function PageContent(props: PageContentProps) {
  return <div className='content page-node'>[page] {props.node.name}</div>;
}