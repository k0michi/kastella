import * as React from 'react';
import { File } from '../node';

export interface SVGImageProps {
  className?: string;
  file: File;
}

export default function SVGImage(props: SVGImageProps) {
  const [content, setContent] = React.useState<string>();

  React.useEffect(() => {
    bridge.readTextFile(props.file.id).then(text => {
      setContent(text);
    });
  }, [props.file.id]);

  return <div dangerouslySetInnerHTML={{ __html: content ?? '' }} className={props.className}></div>;
}