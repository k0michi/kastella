import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { CanvasNode, ImageNode } from '../../node';
import Image from '../image';

interface CanvasNodeContentProps {
  node: CanvasNode;
}

export default function CanvasNodeContent(props: CanvasNodeContentProps) {
  const model = useModel<Model>();
  const file = model.library.getFile(props.node.previewFileID);

  if (file != null) {
    return <div className='content image-node'>
      <Image file={file} />
    </div>
  } else {
    return <div className='content image-node'>
      <div className='error'>{`Failed to read ${props.node.previewFileID}`}</div>
    </div>;
  }
}