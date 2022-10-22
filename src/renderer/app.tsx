import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime';
import { dateToString } from './utils';
import { useModel, useObservable } from 'kyoka';
import Model, { Image, Type } from './model';
import produce from 'immer';

export default function App() {
  const model = useModel<Model>();
  const notes = useObservable(model.notes);
  const [input, setInput] = React.useState<string>('');
  const [writeOnly, setWriteOnly] = React.useState<boolean>(true);
  const composing = React.useRef<boolean>(false);
  const [search, setSearch] = React.useState<string>('');
  const [images, setImages] = React.useState<Record<string, string | undefined>>({});
  const appRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);

  React.useEffect(() => {
    const onScroll = () => {
      const clientHeight = document.documentElement.clientHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const atBottom = scrollHeight - clientHeight - scrollTop <= 0;
      setAtBottom(atBottom);
    }

    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);

      for (const image of Object.values(images)) {
        URL.revokeObjectURL(image!);
      }
    };
  }, []);

  React.useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (atBottom) {
        window.scroll(0, document.documentElement.scrollHeight);
      }
    });

    resizeObserver.observe(appRef.current!);

    return () => {
      resizeObserver.disconnect();
    }
  }, [atBottom]);

  React.useEffect(() => {
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      for (const f of e.dataTransfer!.files) {
        const filePath = f.path;
        const mimeType = mime.getType(filePath);

        if (mimeType == 'image/png' || mimeType == 'image/jpeg') {
          const id = uuidv4();
          await bridge.copyFile(id, filePath);
          const basename = await bridge.basename(filePath);
          const image = { id, name: basename, type: mimeType };

          const now = new Date();
          model.addNote({
            type: Type.Image, content: image, created: now, modified: now, id: uuidv4()
          });
        }
      }
    };

    document.addEventListener('drop', onDrop);

    const onDragover = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragover', onDragover);

    return () => {
      document.removeEventListener('drop', onDrop);
      document.removeEventListener('dragover', onDragover);
    };
  }, [notes]);

  function confirm() {
    const now = new Date();
    model.addNote({ content: input, created: now, modified: now, id: uuidv4() });
    setInput('');
  }

  return <div id='app' ref={appRef}>
    {writeOnly ? null : <div id="notes">
      {notes.filter(n => search.length > 0 ? (n.type == undefined || n.type == Type.Text) && (n.content as string).includes(search) : true).map(n => {
        const id = n.id;

        if (n.type == undefined || n.type == Type.Text) {
          return <div key={id}>
            <span className='content'>{n.content as string}</span>{' '}
            <span className='date'>{dateToString(n.created)}</span>{' '}
            <button onClick={e => {
              model.removeNote(id);
            }}>x</button></div>;
        } else if (n.type == Type.Image) {
          const image = n.content as Image;
          const imageURL = images[image.id];

          if (imageURL == undefined) {
            bridge.readFile(image.id).then(bytes => {
              const newImages = produce(images, d => {
                d[image.id] = uint8ArrayObjectURL(bytes, image.type);
              });
              setImages(newImages);
            });
          }

          return <div key={id}>
            <img className='content' src={imageURL}></img>{' '}
            <span className='date'>{dateToString(n.created)}</span>{' '}
            <button onClick={e => {
              model.removeNote(id);
            }}>x</button></div>;
        }
      })}
    </div>}
    <div id="controls">
      <div id='input'>
        <textarea onChange={e => setInput(e.target.value)} onKeyDown={e => {
          if (e.key == 'Enter' && !composing.current) {
            e.preventDefault();
            confirm();
          }
        }} onCompositionStart={e => {
          composing.current = true;
        }} onCompositionEnd={e => {
          composing.current = false;
        }} value={input} />
        <button onClick={e => confirm()}>Confirm</button>
        <input checked={writeOnly} type="checkbox" id="write-only" onChange={e => {
          setWriteOnly(e.target.checked);
        }} />
        <label htmlFor="write-only">Write-only</label>
      </div>
      <div>
        <textarea onChange={e => setSearch(e.target.value)} value={search} />
      </div>
    </div>
  </div>;
}

function uint8ArrayObjectURL(array: Uint8Array, mediaType: string) {
  return URL.createObjectURL(new Blob([array.buffer], { type: mediaType }));
}