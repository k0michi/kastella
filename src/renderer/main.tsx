import { ModelProvider } from 'kyoka';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import EditorPane from './editor-pane';
import ExplorerPane from './explorer-pane';
import Model from './model';
import './style.css';

const model = new Model();
model.loadNotes();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ModelProvider model={model}>
    <div id="app">
      <ExplorerPane />
      <EditorPane />
    </div>
  </ModelProvider>
);