import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../model';
import { ImageNode } from '../node';
import Image from './image';

interface ImageContentProps {
  node: ImageNode;
}

export default function ImageContent(props: ImageContentProps) {
  const model = useModel<Model>();
  const file = model.library.getFile(props.node.fileID);

  if (file != null) {
    return <div className='content image-node'>
      <Image file={file} />
    </div>
  } else {
    return <div className='content image-node'>
      <div className='error'>{`Failed to read ${props.node.fileID}`}</div>
    </div>;
  }
}