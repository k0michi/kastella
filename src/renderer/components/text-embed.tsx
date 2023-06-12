import * as React from 'react';
import { File } from '../node';

export interface TextEmbedProps {
  file: File;
}

export default function TextEmbed(props: TextEmbedProps) {
  const [text, setText] = React.useState<string>();

  React.useEffect(() => {
    bridge.readTextFile(props.file.id).then(string => {
      setText(string);
    });
  }, [props.file.id]);

  return <pre>{text}</pre>;
}