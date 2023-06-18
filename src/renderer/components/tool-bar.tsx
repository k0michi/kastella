import * as React from 'react';
import Katex from 'katex';
import { v4 as uuidv4 } from 'uuid';
import { useModel, useObservable } from 'kyoka';
import Model, { DirectoryView, TagView, ViewType } from '../model';
import Timestamp from '../timestamp';
import { File, ItemStyle, NodeType } from '../node';
import { IconMathFunction, IconHeading, IconQuote, IconList, IconListNumbers, IconMenu2, IconPhoto, IconFileText, IconCode, IconBold, IconAnchor, IconLink, IconBrush, IconItalic, IconStrikethrough, IconUnderline, IconSubscript, IconSuperscript, IconClearFormatting } from '@tabler/icons';
import { FileType } from '../../common/fetch';
import { Excalidraw, MainMenu, exportToSvg, serializeAsJSON } from "@excalidraw/excalidraw";
import mime from 'mime';
import { ExcalidrawAPIRefValue, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

export default function ToolBar() {
  const model = useModel<Model>();
  const selected = useObservable(model.selected);

  const mathModalRef = React.useRef<HTMLDialogElement>(null);
  const [exp, setExp] = React.useState<string>('');

  const [excalidrawAPI, setExcalidrawAPI] = React.useState<ExcalidrawAPIRefValue | null>(null);
  const canvasModalRef = React.useRef<HTMLDialogElement>(null);

  const rendered = React.useMemo(() => {
    let result;

    try {
      result = Katex.renderToString(exp, {
        displayMode: true
      });
    } catch (e) {
      return e as Error;
    }

    return result;
  }, [exp]);

  return (
    <>
      <div id="tool-bar">
        <button className='tool' onClick={e => {
          mathModalRef.current?.showModal();
        }}><IconMathFunction stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            if (model.library.isHeading(selected)) {
              model.library.changeNodeType(selected, NodeType.Text);
            } else if (model.library.isText(selected) || model.library.isQuote(selected)) {
              model.library.changeNodeType(selected, NodeType.Heading);
            }
          }
        }}><IconHeading stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            if (model.library.isQuote(selected)) {
              model.library.changeNodeType(selected, NodeType.Text);
            } else if (model.library.isText(selected) || model.library.isHeading(selected)) {
              model.library.changeNodeType(selected, NodeType.Quote);
            }
          }
        }}><IconQuote stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            model.library.setListStyle(selected, undefined);
          }
        }}><IconMenu2 stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            model.library.setListStyle(selected, ItemStyle.Unordered);
          }
        }}><IconList stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          const selected = model.selected.get();

          if (selected != undefined) {
            model.library.setListStyle(selected, ItemStyle.Ordered);
          }
        }}><IconListNumbers stroke={2} size={16} /></button>
        <button className='tool' onClick={async e => {
          const result = await bridge.openFile(FileType.Image);

          if (result != null) {
            for (const filePath of result) {
              await model.importImageFile(filePath);
            }
          }
        }}><IconPhoto stroke={2} size={16} /></button>
        <button className='tool' onClick={async e => {
          const result = await bridge.openFile(FileType.Text);

          if (result != null) {
            for (const filePath of result) {
              await model.importTextFile(filePath);
            }
          }
        }}><IconFileText stroke={2} size={16} /></button>
        <button className='tool' onClick={async e => {
          canvasModalRef.current?.showModal();
        }}><IconBrush stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          document.execCommand('bold');
        }}><IconBold stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          document.execCommand('italic');
        }}><IconItalic stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          document.execCommand('underline');
        }}><IconUnderline stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          document.execCommand('strikeThrough');
        }}><IconStrikethrough stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          document.execCommand('subscript');
        }}><IconSubscript stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          document.execCommand('superscript');
        }}><IconSuperscript stroke={2} size={16} /></button>
        <button className='tool' onClick={e => {
          document.execCommand('removeFormat');
        }}><IconClearFormatting stroke={2} size={16} /></button>
      </div>
      <dialog ref={mathModalRef}>
        <div className='dialog-container'>
          <div className='dialog-title'>Insert Math Block</div>
          <textarea
            rows={2}
            className='exp-input'
            placeholder='f(x)'
            onChange={e => {
              setExp(e.target.value);
            }}
            value={exp} />
          <div className={['math-preview', rendered instanceof Error ? 'error' : ''].join(' ')} dangerouslySetInnerHTML={
            {
              __html: rendered instanceof Error ? (rendered.message) : rendered
            }
          }></div>
          <div className='dialog-buttons'>
            <div className='left'><button onClick={e => mathModalRef.current?.close()}>Cancel</button></div>
            <div className='right'><button className='highlighted' onClick={async e => {
              if (!(rendered instanceof Error)) {
                const now = Timestamp.fromNs(await bridge.now());
                let tagIDs: string[] = [];

                const parentID = model.getViewDirectory();
                tagIDs = tagIDs.concat(model.getViewTags());

                model.library.addMathNode(exp, now, parentID, tagIDs);
              }

              mathModalRef.current?.close();
            }}>OK</button></div>
          </div>
        </div>
      </dialog>
      <dialog ref={canvasModalRef} style={{ height: "100%", width: "100%", margin: 0 }}>
        <div className='dialog-container' style={{ height: "100%", width: "100%" }}>
          <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw ref={(api) => setExcalidrawAPI(api)}>
              <MainMenu>
                <MainMenu.Item onSelect={async () => {
                  if (excalidrawAPI?.ready) {
                    const elements = excalidrawAPI.getSceneElements();
                    const appState = excalidrawAPI.getAppState();
                    const files = excalidrawAPI.getFiles();
                    const json = serializeAsJSON(elements, appState, files, 'local');
                    const xmlSerializer = new XMLSerializer();
                    const svg = xmlSerializer.serializeToString(await exportToSvg({ elements, appState, files }));

                    const fileID = uuidv4();
                    await bridge.writeTextFile(fileID, json, 'application/json');
                    const now = await bridge.now();

                    const file = {
                      id: fileID,
                      type: 'application/json',
                      modified: Timestamp.fromNs(now),
                      created: Timestamp.fromNs(now),
                    } as File;

                    model.library.addFile(file);

                    const previewFileID = uuidv4();
                    await bridge.writeTextFile(previewFileID, svg, 'image/svg+xml');

                    const previewFile = {
                      id: previewFileID,
                      type: 'image/svg+xml',
                      modified: Timestamp.fromNs(now),
                      created: Timestamp.fromNs(now),
                    } as File;

                    model.library.addFile(previewFile);

                    let tagIDs: string[] = model.getViewTags();
                    const parentID = model.getViewDirectory();

                    model.library.addCanvasNode(fileID, previewFileID, Timestamp.fromNs(now), parentID, tagIDs);

                    excalidrawAPI.resetScene();
                    canvasModalRef.current?.close();
                  }
                }}>
                  Close
                </MainMenu.Item>
                <MainMenu.DefaultItems.ClearCanvas />
                <MainMenu.DefaultItems.ChangeCanvasBackground />
              </MainMenu>
            </Excalidraw>
          </div>
        </div>
      </dialog>
    </>
  );
}