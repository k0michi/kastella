import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { ImageNode } from '../../node';
import Image from '../image';
import styled from 'styled-components';

const ImageNodeImage = styled(Image)`
  max-width: 100%;
  border-radius: 4px;
  display: block;
`;

interface ImageNodeContentProps {
  node: ImageNode;
}

export default function ImageNodeContent(props: ImageNodeContentProps) {
  const model = useModel<Model>();
  const file = model.library.getFile(props.node.fileID);

  if (file != null) {
    return <div className='content image-node'>
      <ImageNodeImage file={file} />
    </div>
  } else {
    return <div className='content image-node'>
      <div className='error'>{`Failed to read ${props.node.fileID}`}</div>
    </div>;
  }
}