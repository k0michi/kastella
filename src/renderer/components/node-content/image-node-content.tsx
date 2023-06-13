import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { ImageNode } from '../../node';
import Image from '../image';

interface ImageNodeContentProps {
  node: ImageNode;
}

export default function ImageNodeContent(props: ImageNodeContentProps) {
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