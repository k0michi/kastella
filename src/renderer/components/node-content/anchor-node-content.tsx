import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { AnchorNode } from '../../node';
import Image from '../image';

interface AnchorNodeContentProps {
  node: AnchorNode;
}

export default function AnchorNodeContent(props: AnchorNodeContentProps) {
  const model = useModel<Model>();
  const anchor = props.node;
  const imageFile = anchor.contentImageFileID != null ? model.library.getFile(anchor.contentImageFileID) : null;
  const description = anchor.contentDescription;

  return <div className='content anchor-node'>
    {imageFile != null ? <div className='image'><Image file={imageFile} /></div> : null}
    <div className='details'>
      <div className='url'>{decodeURI(anchor.contentURL)}</div>
      <div className='title'><a draggable={false} href={anchor.contentURL}>{anchor.contentTitle}</a></div>
      {
        description != undefined ?
          <div className='description'>{formatFetchedText(description)}</div>
          : null
      }
    </div>
  </div>;
}

const TEXT_LIMIT = 120;

function formatFetchedText(string: string) {
  let formatted = string.replaceAll(/\n+/g, '\n');

  if (formatted.length > TEXT_LIMIT) {
    formatted = formatted.substring(0, TEXT_LIMIT) + '…';
  }

  return formatted;
}