import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import * as mime from 'mime';
import produce from 'immer';

enum Type {
  Text = 'text',
  Image = 'image'
}

interface Note {
  id: string;
  type?: string;
  content: string | Image;
  created: Date;
  modified: Date;
}

interface Image {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export default function App() {
  const [input, setInput] = React.useState<string>('');
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [writeOnly, setWriteOnly] = React.useState<boolean>(true);
  const composing = React.useRef<boolean>(false);
  const [search, setSearch] = React.useState<string>('');
  const [images, setImages] = React.useState<Record<string, string | undefined>>({});

  React.useEffect(() => {
    bridge.readNote().then((c: string) => {
      const notes = JSON.parse(c, (key, value) => {
        if (key == 'created' || key == 'modified') {
          return new Date(value);
        }

        return value;
      }) as Note[];
      setNotes(notes);
    }).catch(e => {
      setNotes([]);
    });
  }, []);

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
          const newNotes = produce(notes, d => {
            d.push({
              type: Type.Image, content: image, created: now, modified: now, id: uuidv4()
            })
          });
          setNotes(newNotes);
          bridge.writeNote(JSON.stringify(newNotes));
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

  const notesReversed = [...notes];
  notesReversed.reverse();

  function confirm() {
    const now = new Date();
    const newNotes = produce(notes, d => {
      d.push({ content: input, created: now, modified: now, id: uuidv4() });
    });
    setNotes(newNotes);
    setInput('');
    bridge.writeNote(JSON.stringify(newNotes));
  }

  return <>
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
    {writeOnly ? null : <div id="notes">
      {notesReversed.filter(n => search.length > 0 ? (n.type == undefined || n.type == Type.Text) && (n.content as string).includes(search) : true).map(n => {
        const id = n.id;

        if (n.type == undefined || n.type == Type.Text) {
          return <div key={id}>
            <span className='content'>{n.content as string}</span>{' '}
            <span className='date'>{dateToString(n.created)}</span>{' '}
            <button onClick={e => {
              const newNotes = [...notes];
              newNotes.splice(newNotes.findIndex(n => n.id == id), 1);
              setNotes(newNotes);
              bridge.writeNote(JSON.stringify(newNotes));
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
              const newNotes = [...notes];
              newNotes.splice(newNotes.findIndex(n => n.id == id), 1);
              setNotes(newNotes);
              bridge.writeNote(JSON.stringify(newNotes));
            }}>x</button></div>;
        }
      })}
    </div>}
  </>;
}

function dateToString(date: Date) {
  return format(date, 'yyyy/MM/dd HH:mm:ss');
}

function uint8ArrayObjectURL(array: Uint8Array, mediaType: string) {
  return URL.createObjectURL(new Blob([array.buffer], { type: mediaType }));
}