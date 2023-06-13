import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../model';
import { DirectoryNode } from '../node';

interface DirectoryContentProps {
  node: DirectoryNode;
}

export default function DirectoryContent(props: DirectoryContentProps) {
  return <div className='content directory-node'>[dir] {props.node.name as string}</div>;
}