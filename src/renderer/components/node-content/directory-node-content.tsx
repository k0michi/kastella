import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { DirectoryNode } from '../../node';

interface DirectoryNodeContentProps {
  node: DirectoryNode;
}

export default function DirectoryNodeContent(props: DirectoryNodeContentProps) {
  return <div className='content directory-node'>[dir] {props.node.name as string}</div>;
}