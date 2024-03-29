import * as React from 'react';
import Katex from 'katex';
import { v4 as uuidv4 } from 'uuid';
import { useModel, useObservable } from 'kyoka';
import Model from '../model';
import Timestamp from '../timestamp';
import { File, ItemStyle, NodeType } from '../node';
import { IconMathFunction, IconHeading, IconQuote, IconList, IconListNumbers, IconMenu2, IconPhoto, IconFileText, IconCode, IconBold, IconAnchor, IconLink, IconBrush, IconItalic, IconStrikethrough, IconUnderline, IconSubscript, IconSuperscript, IconClearFormatting, IconFileCode } from '@tabler/icons';
import ToolButton from './tool-button';
import styled from 'styled-components';
import { CommonDialog, CommonDialogButton, CommonDialogButtons, CommonDialogButtonsLeft, CommonDialogButtonsRight, CommonDialogTitle } from './common-dialog';
import CanvasDialog from './excalidraw-dialog';
import { FileType, FileKind } from '../../common/file-type';

const DivToolBar = styled.div`
  border-bottom: 1px solid ${props => props.theme.colorBorder};
  box-sizing: content-box;
  padding: 4px;
  min-height: 1em;
  line-height: 1;
  flex: 0 0 fit-content;
  background-color: ${props => props.theme.colorToolBar};

  display: flex;
  flex-direction: row;
  gap: 4px;
`;

const TextAreaMathInput = styled.textarea`
  resize: none;
  width: 100%;
  height: fit-content;
`;

const DivMathPreview = styled.div<{ $error?: boolean }>`
  margin-top: 4px;
  border: 1px solid ${props => props.theme.colorMathPreviewBorder};
  overflow-x: auto;
  color: ${props => props.$error ? props.theme.colorError : 'unset'};
`;

export default function ToolBar() {
  const model = useModel<Model>();

  const [openMathModal, setOpenMathModal] = React.useState(false);
  const [exp, setExp] = React.useState<string>('');

  const [openCanvasModal, setOpenCanvasModal] = React.useState(false);

  const rendered = React.useMemo(() => {
    let result;

    try {
      result = Katex.renderToString(exp, {
        displayMode: true,
        strict: true,
        trust: false,
      });
    } catch (e) {
      return e as Error;
    }

    return result;
  }, [exp]);

  return (
    <>
      <DivToolBar>
        <ToolButton title='Math Block' onClick={e => {
          setOpenMathModal(true);
        }}><IconMathFunction stroke={2} size={16} /></ToolButton>
        <ToolButton title='Heading' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            if (model.library.isHeading(selected)) {
              model.library.changeNodeType(selected, NodeType.Text);
            } else if (model.library.isText(selected) || model.library.isQuote(selected)) {
              model.library.changeNodeType(selected, NodeType.Heading);
            }
          }
        }}><IconHeading stroke={2} size={16} /></ToolButton>
        <ToolButton title='Quote' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            if (model.library.isQuote(selected)) {
              model.library.changeNodeType(selected, NodeType.Text);
            } else if (model.library.isText(selected) || model.library.isHeading(selected)) {
              model.library.changeNodeType(selected, NodeType.Quote);
            }
          }
        }}><IconQuote stroke={2} size={16} /></ToolButton>
        <ToolButton title='Item Style: None' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            model.library.setListStyle(selected, undefined);
          }
        }}><IconMenu2 stroke={2} size={16} /></ToolButton>
        <ToolButton title='Item Style: Unordered' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            model.library.setListStyle(selected, ItemStyle.Unordered);
          }
        }}><IconList stroke={2} size={16} /></ToolButton>
        <ToolButton title='Item Style: Ordered' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            model.library.setListStyle(selected, ItemStyle.Ordered);
          }
        }}><IconListNumbers stroke={2} size={16} /></ToolButton>
        <ToolButton title='Image' onClick={async e => {
          const result = await bridge.openFile(FileKind.Image);

          if (result != null) {
            for (const filePath of result) {
              await model.importImageFile(filePath);
            }
          }
        }}><IconPhoto stroke={2} size={16} /></ToolButton>
        <ToolButton title='Code Block from File' onClick={async e => {
          const result = await bridge.openFile(FileKind.Text);

          if (result != null) {
            for (const filePath of result) {
              await model.importTextFile(filePath);
            }
          }
        }}><IconFileCode stroke={2} size={16} /></ToolButton>
        <ToolButton title='Canvas' onClick={async e => {
          setOpenCanvasModal(true);
        }}><IconBrush stroke={2} size={16} /></ToolButton>
        <ToolButton title='Bold' onClick={e => {
          document.execCommand('bold');
        }}><IconBold stroke={2} size={16} /></ToolButton>
        <ToolButton title='Italic' onClick={e => {
          document.execCommand('italic');
        }}><IconItalic stroke={2} size={16} /></ToolButton>
        <ToolButton title='Underline' onClick={e => {
          document.execCommand('underline');
        }}><IconUnderline stroke={2} size={16} /></ToolButton>
        <ToolButton title='Strikethrough' onClick={e => {
          document.execCommand('strikeThrough');
        }}><IconStrikethrough stroke={2} size={16} /></ToolButton>
        <ToolButton title='Subscript' onClick={e => {
          document.execCommand('subscript');
        }}><IconSubscript stroke={2} size={16} /></ToolButton>
        <ToolButton title='Superscript' onClick={e => {
          document.execCommand('superscript');
        }}><IconSuperscript stroke={2} size={16} /></ToolButton>
        <ToolButton title='Clear Formatting' onClick={e => {
          document.execCommand('removeFormat');
        }}><IconClearFormatting stroke={2} size={16} /></ToolButton>
        <ToolButton title='Code' onClick={e => {
          const selection = window.getSelection();
          const range = selection?.getRangeAt(0);

          if (range != null) {
            const anc = getContentEditableAncestor(range);

            if (anc != null) {
              const selectedContent = range.extractContents();
              const codeElem = document.createElement('code');
              const textContent = selectedContent.textContent;

              if (selectedContent != undefined && textContent != null) {
                codeElem.append(textContent);
              }

              range.insertNode(codeElem);
              const event = new Event('input', { bubbles: true, cancelable: true });
              anc.dispatchEvent(event);
            }
          }
        }}><IconCode stroke={2} size={16} /></ToolButton>
      </DivToolBar>
      <CommonDialog open={openMathModal}>
        <CommonDialogTitle>Insert Math Block</CommonDialogTitle>
        <TextAreaMathInput
          rows={2}
          placeholder='f(x)'
          onChange={e => {
            setExp(e.target.value);
          }}
          value={exp} />
        <DivMathPreview $error={rendered instanceof Error} dangerouslySetInnerHTML={
          {
            __html: rendered instanceof Error ? (rendered.message) : rendered
          }
        } />
        <CommonDialogButtons>
          <CommonDialogButtonsLeft>
            <CommonDialogButton onClick={e => setOpenMathModal(false)}>Cancel</CommonDialogButton>
          </CommonDialogButtonsLeft>
          <CommonDialogButtonsRight>
            <CommonDialogButton highlighted onClick={async e => {
              if (!(rendered instanceof Error)) {
                const now = Timestamp.fromNs(await bridge.now());
                let tagIDs: string[] = [];

                const parentID = model.getViewDirectory();
                tagIDs = tagIDs.concat(model.getViewTags());

                model.library.addMathNode(exp, now, parentID, tagIDs);
              }

              setOpenMathModal(false);
            }}>OK</CommonDialogButton>
          </CommonDialogButtonsRight>
        </CommonDialogButtons>
      </CommonDialog>
      <CanvasDialog open={openCanvasModal} onClose={async (e) => {
        const json = e.json;
        const svg = e.svg;

        const fileID = uuidv4();
        await bridge.writeTextFile(fileID, json, FileType.JSON);
        const now = Timestamp.fromNs(await bridge.now());

        const file: File = {
          id: fileID,
          type: FileType.JSON,
          modified: now,
          created: now,
        };

        model.library.addFile(file);

        const previewFileID = uuidv4();
        await bridge.writeTextFile(previewFileID, svg, FileType.SVG);

        const previewFile: File = {
          id: previewFileID,
          type: FileType.SVG,
          modified: now,
          created: now,
        };

        model.library.addFile(previewFile);

        let tagIDs: string[] = model.getViewTags();
        const parentID = model.getViewDirectory();

        model.library.addCanvasNode(fileID, previewFileID, now, parentID, tagIDs);

        setOpenCanvasModal(false);
      }} />
    </>
  );
}

function getContentEditableAncestor(range: Range) {
  let node: Node | null = range.commonAncestorContainer;

  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).isContentEditable) {
      return node;
    }

    node = node.parentNode;
  }

  return null;
}