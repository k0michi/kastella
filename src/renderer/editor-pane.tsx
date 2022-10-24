import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime';
import { dateToString } from './utils';
import { useModel, useObservable } from 'kyoka';
import produce from 'immer';
import { formatISO } from 'date-fns';
import Model, { DateView, DirectoryNode, DirectoryView, ImageNode, NodeType, TagView, TextNode } from './model';

export default function EditorPane() {
  const model = useModel<Model>();
  const nodes = useObservable(model.nodes);
  const tags = useObservable(model.tags);
  const view = useObservable(model.view);
  const saving = useObservable(model.saving);
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
          model.addImageNode(image);
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
  }, [nodes]);

  function confirm() {
    const [content, tags] = splitTags(input);
    const tagIDs = tags.map(t => {
      const found = model.findTag(t);

      if (found == null) {
        return model.createTag(t);
      }

      return found.id;
    });

    const view = model.view.get();
    let parentID = undefined;

    if (view != null && view.type == 'directory') {
      parentID = (view as DirectoryView).parentID;
    }

    if (view != null && view.type == 'tag') {
      tagIDs.push((view as TagView).tag);
    }

    model.addTextNode(content, parentID, tagIDs);
    setInput('');
  }

  let filtered = nodes;

  if (search.length > 0) {
    filtered = filtered.filter(n => (n.type == undefined || n.type == NodeType.Text) && ((n as TextNode).content as string).includes(search));
  }

  if (view != null && view.type == 'directory') {
    filtered = filtered.filter(n => n.parentID == (view as DirectoryView).parentID);
  }

  if (view != null && view.type == 'tag') {
    filtered = filtered.filter(n => n.tags?.includes((view as TagView).tag));
  }

  if (view != null && view.type == 'date') {
    filtered = filtered.filter(n => formatISO(n.created, { representation: 'date' }) == (view as DateView).date);
  }

  return <div id='editor-pane' ref={appRef}>
    {writeOnly ? null : <div id="notes">
      {filtered.map(n => {
        const id = n.id;

        if (n.type == undefined || n.type == NodeType.Text) {
          const textNode = n as TextNode;

          return <div key={id}>
            <span className='content'>{textNode.content as string}</span>{' '}
            <span className='date'>{dateToString(textNode.created)}</span>{' '}
            <button onClick={e => {
              model.removeNode(id);
            }}>x</button></div>;
        } else if (n.type == NodeType.Image) {
          const imageNode = n as ImageNode;
          const image = model.getFile(imageNode.fileID)!;
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
              model.removeNode(id);
            }}>x</button></div>;
        } else if (n.type == NodeType.Directory) {
          const dNode = n as DirectoryNode;

          return <div key={id}>
            <span className='content'>[dir] {dNode.name as string}</span>{' '}
            <span className='date'>{dateToString(dNode.created)}</span>{' '}
            <button onClick={e => {
              model.removeNode(id);
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

// '... #tagName' => ['...', ['tagName']]
function splitTags(string: string): [string, string[]] {
  const tagExp = /#(\S+)$/;
  let result: RegExpExecArray | null;
  const tags = [];

  while (string = string.trim(), result = tagExp.exec(string), result != null) {
    tags.push(result[1]);
    string = string.substring(0, result.index);
  }

  string = string.trim();
  return [string, tags];
}