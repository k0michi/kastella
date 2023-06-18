import { ModelProvider } from 'kyoka';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import EditorPane from './components/editor-pane';
import ExplorerPane from './components/explorer-pane';
import Model from './model';
import StatusBar from './components/status-bar';
import './style.css';
import 'katex/dist/katex.css'
import 'modern-normalize/modern-normalize.css';
import ToolBar from './components/tool-bar';

const model = new Model();
model.loadLibrary();

window.addEventListener('beforeunload', e => {
  if (model.unsaved.get()) {
    e.preventDefault();

    // Chrome requires this
    e.returnValue = false;
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ModelProvider model={model}>
    <>
      <ToolBar />
      <div id="main">
        <ExplorerPane />
        <EditorPane />
      </div>
      <StatusBar />
    </>
  </ModelProvider>
);