import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime';
import { findStringIgnoreCase, isHTTPURL } from './utils';
import { useModel, useObservable } from 'kyoka';
import Model, { AnchorNode, DateView, DirectoryNode, DirectoryView, File, ImageNode, MathNode, Node, NodeType, ReservedID, TagView, TextEmbedNode, TextNode, ViewType } from './model.js';
import EditorBar from './editor-bar';
import Image from './image';
import { DateTimeFormatter } from '@js-joda/core';
import Timestamp from './timestamp';
import TextEmbed from './text-embed';
import { IconGripVertical } from '@tabler/icons';
import Katex from 'katex';

export default function EditorPane() {
  const model = useModel<Model>();
  const nodes = useObservable(model.nodes);
  const tags = useObservable(model.tags);
  const view = useObservable(model.view);
  const [input, setInput] = React.useState<string>('');
  const editorRef = React.useRef<HTMLDivElement>(null);
  const notesRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);
  const [selected, setSelected] = React.useState<string>();
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const writeOnly = useObservable(model.writeOnly);
  const search = useObservable(model.search);
  const lineNumberVisibility = useObservable(model.lineNumberVisibility);
  const dateVisibility = useObservable(model.dateVisibility);
  const intersecting = useObservable(model.intersecting);
  const [hovered, setHovered] = React.useState<string>();

  React.useEffect(() => {
    const onScroll = () => {
      const clientHeight = editorRef.current!.clientHeight;
      const scrollHeight = editorRef.current!.scrollHeight;
      const scrollTop = editorRef.current!.scrollTop;
      const atBottom = scrollHeight - clientHeight - scrollTop <= 0;
      setAtBottom(atBottom);
    }

    editorRef.current?.addEventListener('scroll', onScroll);

    return () => {
      editorRef.current?.removeEventListener('scroll', onScroll);
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

        if (mimeType == 'image/png' || mimeType == 'image/jpeg' || mimeType == 'image/gif') {
          const accessed = Timestamp.fromNs(await bridge.now());
          const modified = Timestamp.fromNs(await bridge.getMTime(filePath));
          const id = uuidv4();
          await bridge.copyFile(id, filePath);
          const basename = await bridge.basename(filePath);
          const image = {
            id,
            name: basename,
            type: mimeType,
            accessed,
            modified
          } as File;
          model.addImageNode(image, accessed);
        }

        if (mimeType == 'text/plain') {
          const accessed = Timestamp.fromNs(await bridge.now());
          const modified = Timestamp.fromNs(await bridge.getMTime(filePath));
          const id = uuidv4();
          await bridge.copyFile(id, filePath);
          const basename = await bridge.basename(filePath);
          const image = {
            id,
            name: basename,
            type: mimeType,
            accessed,
            modified
          } as File;
          model.addTextEmbedNode(image, accessed);
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

  async function confirm() {
    if (input.length == 0) {
      return;
    }

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

    if (view != null && view.type == ViewType.Directory) {
      parentID = (view as DirectoryView).parentID;
    }

    if (view != null && view.type == ViewType.Tag) {
      tagIDs.push((view as TagView).tag);
    }

    setInput('');

    if (!content.includes(' ') && isHTTPURL(content)) {
      const accessed = Timestamp.fromNs(await bridge.now());
      const meta = await bridge.fetchMeta(content);
      let imageFileID: string | undefined;

      if (meta.imageURL != undefined) {
        const image = await bridge.fetchFile(meta.imageURL);
        imageFileID = uuidv4();
        await bridge.writeFile(imageFileID, image.data, image.type);
        const imageFile = {
          id: imageFileID,
          type: image.type,
          url: meta.imageURL,
          modified: image.modified != undefined ? new Timestamp(image.modified) : undefined,
          accessed
        } as File;
        model.addFile(imageFile);
      }

      model.addAnchorNode({
        contentURL: content,
        contentType: meta.type,
        contentTitle: meta.title,
        contentDescription: meta.description,
        contentImageFileID: imageFileID,
        contentModified: meta.modified != undefined ? new Timestamp(meta.modified) : undefined,
        contentAccessed: accessed
      }, accessed, parentID, tagIDs);
    } else {
      model.addTextNode(content, Timestamp.fromNs(await bridge.now()), parentID, tagIDs);
    }
  }

  const filtered = React.useMemo(() => {
    let filtered = nodes.slice();

    filtered.sort((a, b) => a.index - b.index);

    if (search.length > 0) {
      filtered = filtered.filter(n =>
        n.type == NodeType.Text && findStringIgnoreCase((n as TextNode).content, search) ||
        (n.type == NodeType.Anchor &&
          findStringIgnoreCase((n as AnchorNode).contentTitle, search) ||
          findStringIgnoreCase((n as AnchorNode).contentDescription, search) ||
          findStringIgnoreCase((n as AnchorNode).contentURL, search)
        )
      );
    }

    if (view?.type == ViewType.Directory) {
      let parent =  (view as DirectoryView).parentID;

      if (parent == ReservedID.Root) {
        parent = undefined;
      }

      filtered = filtered.filter(n => n.parentID == parent);
    } else {
      filtered = filtered.filter(n => n.parentID != ReservedID.Trash);
    }

    if (view?.type == ViewType.Tag) {
      filtered = filtered.filter(n => n.tags?.includes((view as TagView).tag));
    }

    if (view?.type == ViewType.Date) {
      filtered = filtered.filter(n => n.created.asZonedDateTime().format(DateTimeFormatter.ISO_LOCAL_DATE) == (view as DateView).date);
    }

    return filtered;
  }, [nodes, view, search]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.isComposing) {
        if (e.key == 'ArrowUp' && e.metaKey) {
          e.preventDefault();

          setSelected(filtered[0].id);
        } else if (e.key == 'ArrowDown' && e.metaKey) {
          e.preventDefault();

          setSelected(undefined);
        } else if (e.key == 'ArrowUp' && e.altKey) {
          e.preventDefault();

          if (selected != null) {
            const selectedNode = model.getNode(selected);
            const foundIndex = filtered.findIndex(n => n.id == selected);
            const prevNode = filtered[foundIndex - 1];

            if (selectedNode != null && prevNode != null && foundIndex != -1) {
              model.swapIndex(selectedNode.id, prevNode.id);
            }
          }
        } else if (e.key == 'ArrowDown' && e.altKey) {
          e.preventDefault();

          if (selected != null) {
            const selectedNode = model.getNode(selected);
            const foundIndex = filtered.findIndex(n => n.id == selected);
            const prevNode = filtered[foundIndex + 1];

            if (selectedNode != null && prevNode != null && foundIndex != -1) {
              model.swapIndex(selectedNode.id, prevNode.id);
            }
          }
        } else if (e.key == 'ArrowUp') {
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
          }
        } else if (e.key == 'Backspace' && selected != undefined) {
          if (view?.type == ViewType.Directory && (view as DirectoryView).parentID == ReservedID.Trash) {
            model.removeNode(selected);
          } else {
            model.setParent(selected, ReservedID.Trash);
          }

          const foundIndex = filtered.findIndex(n => n.id == selected);
          const nextNode = filtered[foundIndex + 1];

          if (nextNode != null && foundIndex != -1) {
            setSelected(nextNode.id);
          }
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
    } else {
      inputRef.current?.focus();
    }
  }, [selected]);

  React.useEffect(() => {
    const iObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          model.addIntersecting((e.target as HTMLElement).dataset['id']!);
        } else {
          model.removeIntersecting((e.target as HTMLElement).dataset['id']!);
        }
      }
    }, {
      root: editorRef.current,
      rootMargin: '1024px 0px 1024px 0px'
    });

    const observerOptions = {
      childList: true,
      subtree: true
    }

    const observer = new MutationObserver((mutationList) => {
      for (const m of mutationList) {
        for (const n of m.addedNodes) {
          if (n.nodeType == window.Node.ELEMENT_NODE && (n as HTMLElement).dataset['id'] != null) {
            iObserver.observe(n as Element);
          }
        }

        for (const n of m.removedNodes) {
          if (n.nodeType == window.Node.ELEMENT_NODE && (n as HTMLElement).dataset['id'] != null) {
            iObserver.unobserve(n as Element);
            model.removeIntersecting((n as HTMLElement).dataset['id']!);
          }
        }
      }
    });

    observer.observe(editorRef.current!, observerOptions);
  }, []);

  return <div id='editor-pane'>
    <EditorBar />
    <div id="editor-area" ref={editorRef}>
      <div id="notes" ref={notesRef}>
        <table>
          <tbody
            onMouseLeave={e => {
              setHovered(undefined);
            }}
            onMouseMove={e => {
              const id = getAncestorID(e.target as HTMLElement);

              if (hovered != id) {
                setHovered(id ?? undefined);
              }
            }}>
            {writeOnly ? null :
              filtered.map(n => {
                const id = n.id;
                let className = 'note';

                if (id == selected) {
                  className += ' selected';
                }

                const tagNames = n.tags?.map(t => '#' + model.getTag(t)?.name);
                const visible = intersecting.has(n.id);
                let content;

                if (visible) {
                  if (n.type == undefined || n.type == NodeType.Text) {
                    const textNode = n as TextNode;

                    content = <div className={className}>
                      <span className='content text-node'>{textNode.content as string}</span>{' '}
                      <span className='tags'>{tagNames?.join(' ')}</span>{' '}
                    </div>;
                  } else if (n.type == NodeType.Image) {
                    const imageNode = n as ImageNode;
                    const file = model.getFile(imageNode.fileID);

                    if (file != null) {
                      content = <div className={className}>
                        <div className='content image-node'>
                          <Image file={file} />
                        </div>
                        <span className='tags'>{tagNames?.join(' ')}</span>
                      </div>;
                    } else {
                      content = <div className='error'>{`Failed to read ${imageNode.fileID}`}</div>;
                    }
                  } else if (n.type == NodeType.Directory) {
                    const dNode = n as DirectoryNode;

                    content = <div className={className}>
                      <span className='content directory-node'>[dir] {dNode.name as string}</span>{' '}
                      <span className='tags'>{tagNames?.join(' ')}</span>
                    </div>;
                  } else if (n.type == NodeType.Anchor) {
                    const anchor = n as AnchorNode;
                    const imageFile = anchor.contentImageFileID != null ? model.getFile(anchor.contentImageFileID) : null;
                    const description = anchor.contentDescription;

                    content = <div className={className}>
                      <div className='content anchor-node'>
                        {imageFile != null ? <div className='image'><Image file={imageFile}></Image></div> : null}
                        <div className='details'>
                          <div className='url'>{decodeURI(anchor.contentURL)}</div>
                          <div className='title'><a draggable={false} href={anchor.contentURL}>{anchor.contentTitle}</a></div>
                          {
                            description != undefined ?
                              <div className='description'>{formatFetchedText(description)}</div>
                              : null
                          }
                        </div>
                      </div>
                      <span className='tags'>{tagNames?.join(' ')}</span>
                    </div>;
                  } else if (n.type == NodeType.TextEmbed) {
                    const textEmbedNode = n as TextEmbedNode;
                    const file = model.getFile(textEmbedNode.fileID);

                    if (file != null) {
                      content = <div className={className}>
                        <div className='content text-embed-node'>
                          <TextEmbed file={file} />
                        </div>
                        <span className='tags'>{tagNames?.join(' ')}</span>
                      </div>;
                    } else {
                      content = <div className='error'>{`Failed to read ${textEmbedNode.fileID}`}</div>;
                    }
                  } else if (n.type == NodeType.Math) {
                    const mathNode = n as MathNode;

                    content = <div className={className}>
                      <div className='content math-node' dangerouslySetInnerHTML={{
                        __html: Katex.renderToString(mathNode.expression)
                      }}>
                      </div>
                      <span className='tags'>{tagNames?.join(' ')}</span>
                    </div>;
                  }
                }

                return <tr key={n.id} data-id={id} className={visible ? 'visible' : 'invisible'}>
                  <td className='grip'>{n.id == hovered ?
                    <div draggable
                      onDragStart={e => {
                        const parent = (e.target as HTMLElement).parentElement?.parentElement!;
                        e.dataTransfer.setDragImage(parent, 0, 0);
                        e.dataTransfer.setData('text/plain', n.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}>
                      <IconGripVertical width={16} />
                    </div>
                    : null}</td>
                  {lineNumberVisibility ? <td className='index'>{n.index + 1}</td> : null}
                  {dateVisibility ? <td className='date'>{n.created.asString()}</td> : null}
                  <td>
                    {content}
                  </td>
                </tr>;
              })
            }
          </tbody>
        </table></div>
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
      </div>
    </div>
  </div>;
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

const TEXT_LIMIT = 120;

function formatFetchedText(string: string) {
  return string.replaceAll(/\n+/g, '\n').substring(0, TEXT_LIMIT);
}