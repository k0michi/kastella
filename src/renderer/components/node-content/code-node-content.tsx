import { useModel } from 'kyoka';
import * as React from 'react';
import Model from '../../model';
import { CodeNode } from '../../node';
import CodeEmbed from '../code-embed';

interface CodeNodeContentProps {
  node: CodeNode;
}

export default function CodeNodeContent(props: CodeNodeContentProps) {
  const model = useModel<Model>();
  const isEmbedded = props.node.fileID != null;

  if (isEmbedded) {
    const file = model.library.getFile(props.node.fileID!);

    if (file != null) {
      return <div className='content code-node'>
        <CodeEmbed file={file} />
      </div>;
    } else {
      return <div className='content code-node'>
        <div className='error'>{`Failed to read ${props.node.fileID}`}</div>
      </div>;
    }
  } else {
    return <div className='content code-node'>
      <pre>
        {props.node.content}
      </pre>
    </div>;
  }
}