import { ModelProvider } from 'kyoka';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app';
import Model from './model';
import './style.css';

const model = new Model();
model.loadNotes();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ModelProvider model={model}>
    <App />
  </ModelProvider>
);