import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { PageNode, TextEmbedNode } from '../../node';
import TextEmbed from '../text-embed';

interface TextEmbedNodeContentProps {
  node: TextEmbedNode;
}

export default function TextEmbedNodeContent(props: TextEmbedNodeContentProps) {
  const model = useModel<Model>();
  const file = model.library.getFile(props.node.fileID);

  if (file != null) {
    return <div className='content text-embed-node'>
      <TextEmbed file={file} />
    </div>;
  } else {
    return <div className='content text-embed-node'>
      <div className='error'>{`Failed to read ${props.node.fileID}`}</div>
    </div>;
  }
}