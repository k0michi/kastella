import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime';
import { findStringIgnoreCase, isHTTPURL } from './utils';
import { useModel, useObservable } from 'kyoka';
import Model, { DateView, DirectoryView, TagView, ViewType } from './model.js';
import EditorBar from './editor-bar';
import Image from './image';
import { DateTimeFormatter } from '@js-joda/core';
import Timestamp from './timestamp';
import TextEmbed from './text-embed';
import { IconGripVertical } from '@tabler/icons';
import Katex from 'katex';
import { inlineNodeToElement, inlineNodeToString, visit } from './tree';
import { AnchorNode, DirectoryNode, File, HeadingNode, ImageNode, ItemStyle, MathNode, Node, NodeType, PageNode, QuoteNode, ReservedID, TextEmbedNode, TextNode } from './node';

export default function EditorPane() {
  const model = useModel<Model>();
  const nodes = useObservable(model.library.nodes);
  const tags = useObservable(model.library.tags);
  const view = useObservable(model.view);
  const input = useObservable(model.input);
  const atBottom = useObservable(model.atBottom);
  const selected = useObservable(model.selected);
  const writeOnly = useObservable(model.writeOnly);
  const search = useObservable(model.search);
  const lineNumberVisibility = useObservable(model.lineNumberVisibility);
  const dateVisibility = useObservable(model.dateVisibility);
  const hovered = useObservable(model.hovered);
  const filtered = useObservable(model.flattened);
  const range = useObservable(model.range);

  const editorRef = React.useRef<HTMLDivElement>(null);
  const nodesRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const onScroll = () => {
      const clientHeight = editorRef.current!.clientHeight;
      const scrollHeight = editorRef.current!.scrollHeight;
      const scrollTop = editorRef.current!.scrollTop;
      const atBottom = scrollHeight - clientHeight - scrollTop <= 0;
      model.setAtBottom(atBottom);
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
        model.setSelected(id);
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

    resizeObserver.observe(nodesRef.current!);

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
          await model.importImageFile(filePath);
        }

        if (mimeType == 'text/plain') {
          await model.importTextFile(filePath);
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
  }, [model.library.nodes.getSnapShot()]);

  async function confirm() {
    if (input.length == 0) {
      return;
    }

    const [content, tags] = splitTags(input);

    let tagIDs = tags.map(t => {
      const found = model.library.findTag(t);

      if (found == null) {
        return model.library.createTag(t);
      }

      return found.id;
    });

    const parentID = model.getViewDirectory();
    tagIDs = tagIDs.concat(model.getViewTags());

    model.setInput('');

    if (!content.includes(' ') && isHTTPURL(content)) {
      const accessed = Timestamp.fromNs(await bridge.now());
      const meta = await bridge.fetchMeta(content);
      let imageFileID: string | undefined;

      if (meta.imageURL != undefined) {
        try {
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
          model.library.addFile(imageFile);
        } catch (e) {
          // Fetch error
        }
      }

      model.library.addAnchorNode({
        contentURL: content,
        contentType: meta.type,
        contentTitle: meta.title,
        contentDescription: meta.description,
        contentImageFileID: imageFileID,
        contentModified: meta.modified != undefined ? new Timestamp(meta.modified) : undefined,
        contentAccessed: accessed
      }, accessed, parentID, tagIDs);
    } else {
      model.library.addTextNode(content, Timestamp.fromNs(await bridge.now()), parentID, tagIDs);
    }
  }

  React.useEffect(() => {
    if (selected != undefined && !filtered.includes(model.library.getNode(selected))) {
      model.selected.set(undefined);
    }
  }, [filtered]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const view = model.view.get();
      const filtered = model.flattened.get();
      const selected = model.selected.get();

      if (!e.isComposing) {
        if (e.key == 'ArrowUp' && e.metaKey) {
          e.preventDefault();

          model.setSelected(filtered[0].id);
        } else if (e.key == 'ArrowDown' && e.metaKey) {
          e.preventDefault();

          model.setSelected(undefined);
        } else if (e.key == 'ArrowUp' && e.altKey) {
          e.preventDefault();

          if (selected != null) {
            const selectedNode = model.library.getNode(selected);
            const foundIndex = filtered.findIndex(n => n.id == selected);
            const node = filtered[foundIndex];

            for (let i = foundIndex - 1; i >= 0; i--) {
              const n = filtered[i];

              if (n.depth! < node.depth!) {
                break;
              }

              if (n.depth == node.depth) {
                model.library.swapIndex(selectedNode!.id!, n.id);
                break;
              }
            }
          }
        } else if (e.key == 'ArrowDown' && e.altKey) {
          e.preventDefault();

          if (selected != null) {
            const selectedNode = model.library.getNode(selected);
            const foundIndex = filtered.findIndex(n => n.id == selected);
            const node = filtered[foundIndex];

            for (let i = foundIndex + 1; i < filtered.length; i++) {
              const n = filtered[i];

              if (n.depth! < node.depth!) {
                break;
              }

              if (n.depth == node.depth) {
                model.library.swapIndex(selectedNode!.id!, n.id);
                break;
              }
            }
          }
        } else if (e.key == 'ArrowUp') {
          e.preventDefault();

          if (selected == null) {
            model.setSelected(filtered.at(-1)?.id);
          } else {
            const foundIndex = filtered.findIndex(n => n.id == selected);
            const prev = filtered[foundIndex - 1];

            if (prev != null && foundIndex != -1) {
              setTimeout(() => model.setSelected(prev.id));
            }
          }
        } else if (e.key == 'ArrowDown') {
          e.preventDefault();

          const foundIndex = filtered.findIndex(n => n.id == selected);
          const next = filtered[foundIndex + 1];

          if (next != null && foundIndex != -1) {
            setTimeout(() => model.setSelected(next.id));
          } else {
            model.setSelected(undefined);
          }
        } else if (e.key == 'Backspace' && selected != undefined) {
          e.preventDefault();

          if (view?.type == ViewType.Directory && (view as DirectoryView).parentID == ReservedID.Trash) {
            model.library.removeNode(selected);
          } else {
            model.library.moveNodeBefore(selected, ReservedID.Trash);
          }

          const foundIndex = filtered.findIndex(n => n.id == selected);
          const nextNode = filtered[foundIndex + 1];

          if (nextNode != null && foundIndex != -1) {
            model.setSelected(nextNode.id);
          }
        } else if (e.key == 'Tab' && e.shiftKey && selected != undefined) {
          e.preventDefault();
          const foundIndex = filtered.findIndex(n => n.id == selected);

          if (foundIndex == -1) {
            return;
          }

          const node = filtered[foundIndex];

          if (view?.type == ViewType.Directory && (view as DirectoryView).parentID == node.parent!.id) {
            return;
          }

          // Nodes after the target node will keep the same depth
          const nodesAfter = node.parent!.children.slice(node.parent!.children.indexOf(node) + 1);

          for (const n of nodesAfter) {
            model.library.moveNodeBefore(n, node);
          }

          model.library.moveNodeBefore(node, node.parent?.parent!, model.library.nextSiblingNode(node.parent!));
        } else if (e.key == 'Tab' && selected != undefined) {
          e.preventDefault();
          const foundIndex = filtered.findIndex(n => n.id == selected);

          if (foundIndex == -1) {
            return;
          }

          const node = filtered[foundIndex];

          for (let i = foundIndex - 1; i >= 0; i--) {
            const n = filtered[i];

            if (n.depth! < node.depth!) {
              break;
            }

            if (n.depth == node.depth) {
              model.library.moveNodeBefore(selected, n.id);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  React.useEffect(() => {
    model.setSelected(undefined);
  }, [view]);

  React.useEffect(() => {
    const node = nodesRef.current?.querySelector(`[data-id="${selected}"]`);
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
    const MARGIN_Y = 2 ** 10;

    const iObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const element = (e.target as HTMLElement);
        const index = parseInt(element.dataset['index']!);
        const id = element.dataset['id']!;
        const range = model.range.get();

        const editorArea = editorRef.current!;
        const rect = element.getBoundingClientRect();
        const rectFrame = editorArea.getBoundingClientRect();
        const offsetY = rect.y - rectFrame.y;

        if (e.isIntersecting) {
          if (index < range.first) {
            const newRange = {
              ...range,
              first: index
            };

            model.setViewRange(newRange);
          } else if (index > range.last) {
            const newRange = {
              ...range,
              last: index
            };

            model.setViewRange(newRange);
          }
        } else {
          if (index > range.first && index < range.last && offsetY < 0) {
            const newRange = {
              ...range,
              first: index
            };

            model.setViewRange(newRange);
          } else if (index < range.last && index > range.first && offsetY > 0) {
            const newRange = {
              ...range,
              last: index
            };

            model.setViewRange(newRange);
          }
        }
      }

    }, {
      root: editorRef.current,
      rootMargin: `${MARGIN_Y}px 0px ${MARGIN_Y}px 0px`
    });

    const observerOptions = {
      childList: true,
      subtree: true
    }

    const observer = new MutationObserver((mutationList) => {
      for (const m of mutationList) {
        for (const n of m.addedNodes) {
          if (n.nodeType == window.Node.ELEMENT_NODE && (n as HTMLElement).dataset['type'] != null) {
            iObserver.observe(n as Element);
          }
        }

        for (const n of m.removedNodes) {
          if (n.nodeType == window.Node.ELEMENT_NODE && (n as HTMLElement).dataset['type'] != null) {
            iObserver.unobserve(n as Element);
          }
        }
      }
    });

    observer.observe(editorRef.current!, observerOptions);
  }, []);

  const last = filtered.at(-1);
  const lastIndex = last != null ? last.index! + 1 : 1;
  const lastIndexDigits = Math.ceil(Math.log10(lastIndex));
  const baseDepth = filtered[0]?.depth!;

  const PADDINGS = 32;

  return <div id='editor-pane'>
    <EditorBar />
    <div id="editor-area" ref={editorRef}>
      <div id="nodes" ref={nodesRef}>
        <table>
          <tbody
            onMouseLeave={e => {
              model.setHovered(undefined);
            }}
            onMouseMove={e => {
              const id = getAncestorID(e.target as HTMLElement);

              if (hovered != id) {
                model.setHovered(id ?? undefined);
              }
            }}>
            {writeOnly ? null :
              filtered.map((n, i) => {
                if (!(i >= range.first - PADDINGS && i <= range.last + PADDINGS)) {
                  return null;
                }

                const id = n.id;
                /*
                const visible = intersecting.has(id);

                if (!visible) {
                  return <tr key={id} data-id={id} className='invisible'></tr>;
                }*/

                let className = 'node';

                if (id == selected) {
                  className += ' selected';
                }

                const tagNames = n.tags?.map(t => '#' + model.library.getTag(t)?.name);

                let content;

                if (n.type == NodeType.Text) {
                  const textNode = n as Node as TextNode;

                  content = <div className={className}>
                    <div className='content text-node'>{inlineNodeToElement(textNode.content)}</div>
                    <div className='tags'>{tagNames?.join(' ')}</div>
                  </div>;
                } else if (n.type == NodeType.Image) {
                  const imageNode = n as Node as ImageNode;
                  const file = model.library.getFile(imageNode.fileID);

                  if (file != null) {
                    content = <div className={className}>
                      <div className='content image-node'>
                        <Image file={file} />
                      </div>
                      <div className='tags'>{tagNames?.join(' ')}</div>
                    </div>;
                  } else {
                    content = <div className='error'>{`Failed to read ${imageNode.fileID}`}</div>;
                  }
                } else if (n.type == NodeType.Directory) {
                  const dNode = n as Node as DirectoryNode;

                  content = <div className={className}>
                    <div className='content directory-node'>[dir] {dNode.name as string}</div>
                    <div className='tags'>{tagNames?.join(' ')}</div>
                  </div>;
                } else if (n.type == NodeType.Page) {
                  const pNode = n as Node as PageNode;

                  content = <div className={className}>
                    <div className='content page-node'>[page] {pNode.name as string}</div>
                    <div className='tags'>{tagNames?.join(' ')}</div>
                  </div>;
                } else if (n.type == NodeType.Anchor) {
                  const anchor = n as Node as AnchorNode;
                  const imageFile = anchor.contentImageFileID != null ? model.library.getFile(anchor.contentImageFileID) : null;
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
                    <div className='tags'>{tagNames?.join(' ')}</div>
                  </div>;
                } else if (n.type == NodeType.TextEmbed) {
                  const textEmbedNode = n as Node as TextEmbedNode;
                  const file = model.library.getFile(textEmbedNode.fileID);

                  if (file != null) {
                    content = <div className={className}>
                      <div className='content text-embed-node'>
                        <TextEmbed file={file} />
                      </div>
                      <div className='tags'>{tagNames?.join(' ')}</div>
                    </div>;
                  } else {
                    content = <div className='error'>{`Failed to read ${textEmbedNode.fileID}`}</div>;
                  }
                } else if (n.type == NodeType.Math) {
                  const mathNode = n as Node as MathNode;

                  content = <div className={className}>
                    <div className='content math-node' dangerouslySetInnerHTML={{
                      __html: Katex.renderToString(mathNode.expression, { displayMode: true })
                    }}>
                    </div>
                    <div className='tags'>{tagNames?.join(' ')}</div>
                  </div>;
                } else if (n.type == NodeType.Heading) {
                  const headingNode = n as Node as HeadingNode;
                  const headingDepth = model.library.getHeadingDepth(headingNode);
                  const COEFF = 2 ** (1 / 6);
                  const fontSize = Math.max(2 / COEFF ** headingDepth, 1);

                  content = <div className={className}>
                    <div className='content heading-node' style={{ 'fontSize': fontSize + 'em' }}>{inlineNodeToElement(headingNode.content)}</div>
                    <div className='tags'>{tagNames?.join(' ')}</div>
                  </div>;
                } else if (n.type == NodeType.Quote) {
                  const quoteNode = n as Node as QuoteNode;

                  content = <div className={className}>
                    <div className='content quote-node'>{inlineNodeToElement(quoteNode.content)}</div>
                    <div className='tags'>{tagNames?.join(' ')}</div>
                  </div>;
                }

                const itemStyle = n.parent?.list;
                let listStyleType;

                if (itemStyle == ItemStyle.Ordered) {
                  listStyleType = `${(n.parent?.children.indexOf(n)! + 1)}.`;
                }

                return <tr key={n.id} data-type="node" data-id={id} data-index={i} className='visible'>
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
                  {lineNumberVisibility ? <td className='index'>{n.index!}</td> : null}
                  {dateVisibility ? <td className='date'>{n.created!.asString()}</td> : null}
                  <td className='node-wrapper' style={{
                    marginLeft: `${(n.depth! - baseDepth) * 16}px`,
                    display: itemStyle == undefined ? 'block' : 'list-item',
                    listStyleType: listStyleType != undefined ? `'${listStyleType}'` : 'initial'
                  }}>
                    {content}
                  </td>
                </tr>;
              })
            }
            <tr>
              <td className='grip'></td>
              {lineNumberVisibility ? <td className='index'>{'-'.repeat(lastIndexDigits)}</td> : null}
              {dateVisibility ? <td className='date'></td> : null}
              <td>
                <textarea ref={inputRef} rows={1} onChange={e => model.setInput(e.target.value)}
                  onFocus={e => {
                    model.setSelected(undefined);
                  }}
                  onKeyDown={e => {
                    if (e.key == 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      confirm();
                    }
                  }} value={input} />
              </td>
            </tr>
          </tbody>
        </table></div>
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