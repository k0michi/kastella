import { ModelProvider } from 'kyoka';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import EditorPane from './editor-pane';
import ExplorerPane from './explorer-pane';
import Model from './model';
import StatusBar from './status-bar';
import './style.css';

const model = new Model();
model.loadLibrary();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ModelProvider model={model}>
    <>
      <div id="main">
        <ExplorerPane />
        <EditorPane />
      </div>
      <StatusBar />
    </>
  </ModelProvider>
);