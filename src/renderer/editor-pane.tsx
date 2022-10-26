import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime';
import { dateToString } from './utils';
import { useModel, useObservable } from 'kyoka';
import produce from 'immer';
import { formatISO } from 'date-fns';
import Model, { DateView, DirectoryNode, DirectoryView, ImageNode, NodeType, TagView, TextNode } from './model';
import EditorBar from './editor-bar';

export default function EditorPane() {
  const model = useModel<Model>();
  const nodes = useObservable(model.nodes);
  const tags = useObservable(model.tags);
  const view = useObservable(model.view);
  const [input, setInput] = React.useState<string>('');
  const [images, setImages] = React.useState<Record<string, string | undefined>>({});
  const editorRef = React.useRef<HTMLDivElement>(null);
  const notesRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);
  const [selected, setSelected] = React.useState<string>();
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const writeOnly = useObservable(model.writeOnly);
  const search = useObservable(model.search);

  React.useEffect(() => {
    const onScroll = () => {
      // FIXME
      const clientHeight = document.documentElement.clientHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const atBottom = scrollHeight - clientHeight - scrollTop <= 0;
      setAtBottom(atBottom);
    }

    editorRef.current?.addEventListener('scroll', onScroll);

    return () => {
      editorRef.current?.removeEventListener('scroll', onScroll);

      for (const image of Object.values(images)) {
        URL.revokeObjectURL(image!);
      }
    };
  }, []);

  React.useEffect(() => {
    const onClicked = (e: MouseEvent) => {
      const id = getAncestorID(e.target as HTMLElement);

      if (id != null) {
        setSelected(id);
      }
    };

    editorRef.current?.addEventListener('click', onClicked);

    return () => {
      editorRef.current?.removeEventListener('click', onClicked);
    };
  }, []);

  React.useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (atBottom) {
        editorRef.current?.scroll(0, editorRef.current?.scrollHeight);
      }
    });

    resizeObserver.observe(notesRef.current!);

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

  const filtered = React.useMemo(() => {
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

    return filtered;
  }, [nodes, view, search]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.isComposing) {
        if (e.key == 'ArrowUp') {
          e.preventDefault();

          if (selected == null) {
            setSelected(filtered.at(-1)?.id);
          } else {
            const foundIndex = filtered.findIndex(n => n.id == selected);
            const prev = filtered[foundIndex - 1];

            if (prev != null && foundIndex != -1) {
              setTimeout(() => setSelected(prev.id));
            }
          }
        } else if (e.key == 'ArrowDown') {
          e.preventDefault();
          const foundIndex = filtered.findIndex(n => n.id == selected);
          const next = filtered[foundIndex + 1];

          if (next != null && foundIndex != -1) {
            setTimeout(() => setSelected(next.id));
          } else {
            setSelected(undefined);
            inputRef.current?.focus();
          }
        } else if (e.key == 'Backspace' && selected != undefined) {
          if (view.type == 'directory' && (view as DirectoryView).parentID == 'trash') {
            model.removeNode(selected);
          } else {
            model.setParent(selected, 'trash');
          }

          setSelected(undefined);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selected, filtered, view]);

  React.useEffect(() => {
    setSelected(undefined);
  }, [view]);

  React.useEffect(() => {
    const node = notesRef.current?.querySelector(`[data-id="${selected}"]`);
    const editorArea = editorRef.current;

    if (node != null && editorArea != null) {
      const rect = node.getBoundingClientRect();
      const rectFrame = editorArea.getBoundingClientRect();
      // offsetY is a relative Y coordinate of an element from the top of #editor-area
      const offsetY = rect.y - rectFrame.y;

      if (offsetY < 0) {
        editorRef.current?.scrollBy(0, offsetY);
      } else if (editorRef.current != null && offsetY + rect.height > editorArea.clientHeight) {
        editorRef.current.scrollBy(0, offsetY + rect.height - editorArea.clientHeight);
      }
    }

    if (selected != null) {
      inputRef.current?.blur();
    }
  }, [selected]);

  return <div id='editor-pane'>
    <EditorBar />
    <div id="editor-area" ref={editorRef}>
      <div id="notes" ref={notesRef}>
        {writeOnly ? null :
          filtered.map(n => {
            const id = n.id;
            let className = '';

            if (id == selected) {
              className += ' selected';
            }

            if (n.type == undefined || n.type == NodeType.Text) {
              const textNode = n as TextNode;

              return <div key={id} className={className} data-id={id}>
                <span className='content'>{textNode.content as string}</span>{' '}
                <span className='date'>{dateToString(textNode.created)}</span></div>;
            } else if (n.type == NodeType.Image) {
              const imageNode = n as ImageNode;
              const image = model.getFile(imageNode.fileID);

              if (image != null) {
                const imageURL = images[image.id];
  
                if (imageURL == undefined) {
                  bridge.readFile(image.id).then(bytes => {
                    const newImages = produce(images, d => {
                      d[image.id] = uint8ArrayObjectURL(bytes, image.type);
                    });
                    setImages(newImages);
                  });
                }
  
                return <div key={id} className={className} data-id={id}>
                  <img className='content' src={imageURL}></img>{' '}
                  <span className='date'>{dateToString(n.created)}</span></div>;
              } else {
                return <div className='error'>`Failed to lead ${imageNode.fileID}`</div>;
              }
            } else if (n.type == NodeType.Directory) {
              const dNode = n as DirectoryNode;

              return <div key={id} className={className} data-id={id}>
                <span className='content'>[dir] {dNode.name as string}</span>{' '}
                <span className='date'>{dateToString(dNode.created)}</span></div>;
            }
          })
        }</div>
      <div id="controls">
        <div id='input'>
          <textarea ref={inputRef} rows={1} onChange={e => setInput(e.target.value)}
            onFocus={e => {
              setSelected(undefined);
            }}
            onKeyDown={e => {
              if (e.key == 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                confirm();
              }
            }} value={input} />
        </div>
        <div>
        </div>
      </div>
    </div>
  </div>;
}

function uint8ArrayObjectURL(array: Uint8Array, mediaType: string) {
  return URL.createObjectURL(new Blob([array.buffer], { type: mediaType }));
}

// '... #tagName' => ['...', ['tagName']]
function splitTags(string: string): [string, string[]] {
  const tagExp = /\s+#(\S+)$/;
  let result: RegExpExecArray | null;
  const tags = [];

  while (string = string.trim(), result = tagExp.exec(string), result != null) {
    tags.push(result[1]);
    string = string.substring(0, result.index);
  }

  string = string.trim();
  return [string, tags];
}

function getAncestorID(element: HTMLElement | null): string | null {
  if (element == null) {
    return null;
  }

  if (element.dataset.id != null) {
    return element.dataset.id;
  }

  return getAncestorID(element.parentElement);
}