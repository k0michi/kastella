import * as React from 'react';
import { File } from '../node';

export interface ImageProps {
  file: File;
}

export default function Image(props: ImageProps) {
  const [url, setURL] = React.useState<string>();

  React.useEffect(() => {
    bridge.readFile(props.file.id).then(bytes => {
      setURL(uint8ArrayObjectURL(bytes, props.file.type));
    });
  }, [props.file.id]);

  React.useEffect(() => {
    return () => {
      if (url != undefined) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  return <img draggable={false} src={url}></img>;
}

function uint8ArrayObjectURL(array: Uint8Array, mediaType: string) {
  return URL.createObjectURL(new Blob([array.buffer], { type: mediaType }));
}