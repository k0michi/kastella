import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime';
import { useModel, useObservable } from 'kyoka';
import ContentEditable from 'react-contenteditable'

import { isHTTPURL } from '../utils';
import Model, { DirectoryView, ViewType } from '../model.js';
import EditorBar from './editor-bar';
import Timestamp from '../timestamp';
import { AnchorNode, DirectoryNode, File, HeadingNode, ImageNode, ItemStyle, MathNode, NodeType, PageNode, QuoteNode, ReservedID, CodeNode, TextNode, CanvasNode } from '../node';
import Row from './row';
import TextNodeContent from './node-content/text-node-content';
import ImageNodeContent from './node-content/image-node-content';
import DirectoryNodeContent from './node-content/directory-node-content';
import PageNodeContent from './node-content/page-node-content';
import AnchorNodeContent from './node-content/anchor-node-content';
import CodeNodeContent from './node-content/code-node-content';
import MathNodeContent from './node-content/math-node-content';
import HeadingNodeContent from './node-content/heading-node-content';
import QuoteNodeContent from './node-content/quote-node-content';
import CanvasNodeContent from './node-content/canvas-node-content';
import { elementToInlineNode } from '../tree';
import { isHTMLEmpty, parseHTMLFragment } from '../html';
import styled from 'styled-components';

const DivEditorPane = styled.div`
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  font-size: 14px;
  overflow-y: auto;
  overflow-x: auto;
  max-width: 100%;
  background-color: ${props => props.theme.colorEditor};
`;

const DivEditorArea = styled.div`
  flex: 1 1 0;
  padding: 12px;
  overflow-y: auto;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.75;
`;

const DivNodes = styled.div`
  white-space: pre-wrap;
`;

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const DivNode = styled.div<{ $block?: boolean, $selected?: boolean }>`
  padding-left: 4px;
  position: relative;
  display: flex;
  flex-direction: ${props => props.$block ? 'column' : 'row'};
  gap: ${props => props.$block ? '4px' : '12px'};
  width: 100%;
  background-color: ${props => props.$selected ? props.theme.colorEditorSelected : 'unset'};
`;

const DivTags = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: auto;
  margin-bottom: auto;
  user-select: none;
`;

const DivTag = styled.div`
  background-color: ${props => props.theme.colorEditorTagBack};
  color: ${props => props.theme.colorEditorTagFore};
  padding: 0px 6px;
  font-size: 10px;
  border-radius: 6px;
  white-space: nowrap;
`;

// How many nodes below and above the intersection should be present
const PADDINGS = 32;

export default function EditorPane() {
  const model = useModel<Model>();
  const view = useObservable(model.view);
  const input = useObservable(model.input);
  const atBottom = useObservable(model.atBottom);
  const selected = useObservable(model.selected);
  const writeOnly = useObservable(model.writeOnly);
  const search = useObservable(model.search);
  const hovered = useObservable(model.hovered);
  const filtered = useObservable(model.flattened);
  const range = useObservable(model.range);

  const editorRef = React.useRef<HTMLDivElement>(null);
  const nodesRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const onScroll = (e: Event) => {
      const editor = editorRef.current!;

      const clientHeight = editor.clientHeight;
      const scrollHeight = editor.scrollHeight;
      const scrollTop = editor.scrollTop;
      const atBottom = scrollHeight - clientHeight - scrollTop <= 0;
      model.setAtBottom(atBottom);

      if (scrollTop == 0 && model.range.get().first != 0) {
        // Temporal fix for the scroll issue when scrollTop == 0
        e.preventDefault();
        e.stopPropagation();
        editor.scrollBy(0, 2);
      }
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

  async function confirm(input: string) {
    if (input.length == 0) {
      return;
    }

    const fragment = parseHTMLFragment(input);
    const plainInput = fragment.innerHTML;

    const lastNode = fragment.childNodes[fragment.childNodes.length - 1];
    const tagIDs = new Set<string>();

    if (lastNode.nodeType == Node.TEXT_NODE) {
      const [content, tags] = splitTags(input);
      (lastNode as globalThis.Text).data = content;

      for (const t of tags) {
        const found = model.library.findTag(t);

        if (found == null) {
          const tagID = model.library.createTag(t);
          tagIDs.add(tagID);
        } else {
          tagIDs.add(found.id);
        }
      }
    }

    const parentID = model.getViewDirectory();

    for (const t of model.getViewTags()) {
      tagIDs.add(t);
    }

    model.setInput('');

    if (!plainInput.includes(' ') && isHTTPURL(plainInput)) {
      const accessed = Timestamp.fromNs(await bridge.now());
      const meta = await bridge.fetchMeta(plainInput);
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
        contentURL: plainInput,
        contentType: meta.type,
        contentTitle: meta.title,
        contentDescription: meta.description,
        contentImageFileID: imageFileID,
        contentModified: meta.modified != undefined ? new Timestamp(meta.modified) : undefined,
        contentAccessed: accessed
      }, accessed, parentID, Array.from(tagIDs));
    } else {
      model.library.addTextNodeWithFormat(elementToInlineNode(fragment), Timestamp.fromNs(await bridge.now()), parentID, Array.from(tagIDs));
    }
  }

  React.useEffect(() => {
    if (selected != undefined && !filtered.find(n => n.id == selected)) {
      model.selected.set(undefined);
    }
  }, [filtered]);

  React.useEffect(() => {
    const length = filtered.length;

    if (!writeOnly) {
      model.setViewRange({
        first: length - 1,
        last: length - 1
      });
    }
  }, [writeOnly, view, search]);

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

    if (selected != 'input') {
      if (selected != null) {
        inputRef.current?.blur();
      } else {
        inputRef.current?.focus();
      }
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

  const baseDepth = filtered[0]?.depth!;
  const showInputRow = view?.type != ViewType.Date && search == '';
  let nextIndex: number | undefined;

  if (view?.type == ViewType.Directory) {
    const dirView = view as DirectoryView;
    nextIndex = model.library.getLastNode(model.library.getNode(dirView.parentID))?.index! + 1;
  } else {
    nextIndex = model.library.getLastNode(model.library.getNode(ReservedID.Master))?.index! + 1;
  }

  return <DivEditorPane>
    <EditorBar />
    <DivEditorArea ref={editorRef}>
      <DivNodes ref={nodesRef}>
        <Table>
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
                const isSelected = id == selected;

                const tagNames = n.tags?.map(t => '#' + model.library.getTag(t)?.name);

                const tags = <DivTags>
                  {tagNames?.map(t => <DivTag key={t}>{t}</DivTag>)}
                </DivTags>;

                let content;

                if (n.type == NodeType.Text) {
                  const textNode = n as TextNode;

                  content = <DivNode $selected={isSelected}>
                    <TextNodeContent node={textNode} />
                    {tags}
                  </DivNode>;
                } else if (n.type == NodeType.Image) {
                  const imageNode = n as ImageNode;

                  content = <DivNode $block $selected={isSelected}>
                    <ImageNodeContent node={imageNode} />
                    {tags}
                  </DivNode>
                } else if (n.type == NodeType.Directory) {
                  const dNode = n as DirectoryNode;

                  content = <DivNode $selected={isSelected}>
                    <DirectoryNodeContent node={dNode} />
                    {tags}
                  </DivNode>;
                } else if (n.type == NodeType.Page) {
                  const pNode = n as PageNode;

                  content = <DivNode $selected={isSelected}>
                    <PageNodeContent node={pNode} />
                    {tags}
                  </DivNode>;
                } else if (n.type == NodeType.Anchor) {
                  const anchor = n as AnchorNode;

                  content = <DivNode $block $selected={isSelected}>
                    <AnchorNodeContent node={anchor} />
                    {tags}
                  </DivNode>;
                } else if (n.type == NodeType.Code) {
                  const codeNode = n as CodeNode;

                  content = <DivNode $block $selected={isSelected}>
                    <CodeNodeContent node={codeNode} />
                    {tags}
                  </DivNode>;
                } else if (n.type == NodeType.Math) {
                  const mathNode = n as MathNode;

                  content = <DivNode $block $selected={isSelected}>
                    <MathNodeContent node={mathNode} />
                    {tags}
                  </DivNode>;
                } else if (n.type == NodeType.Heading) {
                  const headingNode = n as HeadingNode;

                  content = <DivNode $selected={isSelected}>
                    <HeadingNodeContent node={headingNode} />
                    {tags}
                  </DivNode>;
                } else if (n.type == NodeType.Quote) {
                  const quoteNode = n as QuoteNode;

                  content = <DivNode $block $selected={isSelected}>
                    <QuoteNodeContent node={quoteNode} />
                    {tags}
                  </DivNode>;
                } else if (n.type == NodeType.Canvas) {
                  const canvasNode = n as CanvasNode;

                  content = <DivNode $block $selected={isSelected}>
                    <CanvasNodeContent node={canvasNode} />
                    {tags}
                  </DivNode>
                }

                const itemStyle = n.parent?.list;
                let listStyleType;

                if (itemStyle == ItemStyle.Ordered) {
                  listStyleType = `${(n.parent?.children.indexOf(n)! + 1)}.`;
                }

                return <Row
                  key={id}
                  id={id}
                  index={n.index!}
                  pseudoIndex={i}
                  depth={n.depth! - baseDepth}
                  itemStyle={itemStyle}
                  listStyleType={listStyleType}
                >
                  {content}
                </Row>;
              })
            }
            {showInputRow ? <Row
              id={null}
              index={nextIndex}
              pseudoIndex={filtered.length}
              depth={0}
              empty={isHTMLEmpty(input)}
              disallowDrag={true}>
              <ContentEditable style={{ outline: 'none' }} innerRef={inputRef} onChange={e => model.setInput(e.target.value)}
                onFocus={e => {
                  model.setSelected(undefined);
                }}
                onKeyDown={e => {
                  if (e.key == 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    confirm(model.input.get());
                  }
                }}
                onPaste={e => {
                  e.preventDefault();
                  // Paste as plain text
                  let paste = e.clipboardData.getData('text');
                  document.execCommand('insertText', false, paste);
                }}
                html={input} />
            </Row> : null}
          </tbody>
        </Table>
      </DivNodes>
    </DivEditorArea>
  </DivEditorPane>;
}

// '... #tagName' => ['...', ['tagName']]
function splitTags(string: string): [string, string[]] {
  const tagExp = /\s+#([a-zA-Z0-9]+)$/;
  let result: RegExpExecArray | null;
  const tags: string[] = [];

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