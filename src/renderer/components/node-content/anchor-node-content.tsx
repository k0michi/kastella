import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { AnchorNode } from '../../node';
import Image from '../image';
import styled from 'styled-components';

const DivAnchorNode = styled.div`
  display: flex;
  flex-direction: row;
  gap: 12px;
  border: 1px solid ${props => props.theme.colorAnchorBorder};
  border-radius: 6px;
  padding: 14px;
  margin: 4px;
`;

const DivImage = styled.div`
  display: flex;
  align-items: center;
`;

const ImageAnchorNode = styled(Image)`
  width: 192px;
  display: block;
`;

const DivURL = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colorSecondary};
`;

const DivTitle = styled.div`
  font-size: 18px;
`;

const A = styled.a`
  color: inherit;
`;

interface AnchorNodeContentProps {
  node: AnchorNode;
}

export default function AnchorNodeContent(props: AnchorNodeContentProps) {
  const model = useModel<Model>();
  const anchor = props.node;
  const imageFile = anchor.contentImageFileID != null ? model.library.getFile(anchor.contentImageFileID) : null;
  const description = anchor.contentDescription;

  return <DivAnchorNode>
    {imageFile != null ? <DivImage><ImageAnchorNode file={imageFile} /></DivImage> : null}
    <div className='details'>
      <DivURL>{decodeURI(anchor.contentURL)}</DivURL>
      <DivTitle><A draggable={false} href={anchor.contentURL}>{anchor.contentTitle}</A></DivTitle>
      {
        description != undefined ?
          <div className='description'>{formatFetchedText(description)}</div>
          : null
      }
    </div>
  </DivAnchorNode>;
}

const TEXT_LIMIT = 120;

function formatFetchedText(string: string) {
  let formatted = string.replaceAll(/\n+/g, '\n');

  if (formatted.length > TEXT_LIMIT) {
    formatted = formatted.substring(0, TEXT_LIMIT) + '…';
  }

  return formatted;
}