import * as React from 'react';
import { Excalidraw, MainMenu, exportToSvg, serializeAsJSON } from "@excalidraw/excalidraw";
import { ExcalidrawAPIRefValue, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

import Dialog from './dialog';

export interface CanvasCloseEvent {
  json: string;
  svg: string;
}

export interface CanvasDialogProps {
  open: boolean;
  onClose?: (e: CanvasCloseEvent) => void;
}

export default function CanvasDialog(props: CanvasDialogProps) {
  const [excalidrawAPI, setExcalidrawAPI] = React.useState<ExcalidrawAPIRefValue | null>(null);

  return <Dialog open={props.open} style={{ height: "100%", width: "100%" }}>
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

            excalidrawAPI.resetScene();

            const closeEvent: CanvasCloseEvent = {
              svg, json
            };

            if (props.onClose) {
              props.onClose(closeEvent);
            }
          }
        }}>
          Close
        </MainMenu.Item>
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    </Excalidraw>
  </Dialog>;
}