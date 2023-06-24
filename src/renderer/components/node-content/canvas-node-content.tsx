import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { CanvasNode, ImageNode } from '../../node';
import Image from '../image';
import styled from 'styled-components';
import SVGImage from '../svg-image';

const ImageNodeImage = styled(SVGImage)`
  max-width: 100%;

  svg {
    border-radius: 4px;
    display: block;
  }
`;

interface CanvasNodeContentProps {
  node: CanvasNode;
}

export default function CanvasNodeContent(props: CanvasNodeContentProps) {
  const model = useModel<Model>();
  const file = model.library.getFile(props.node.previewFileID);

  if (file != null) {
    return <ImageNodeImage file={file} />;
  } else {
    return <div className='content image-node'>
      <div className='error'>{`Failed to read ${props.node.previewFileID}`}</div>
    </div>;
  }
}