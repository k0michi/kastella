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
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';

export type Theme = typeof darkTheme;

const darkTheme = {
  color: 'white',
  colorSecondary: 'rgb(168, 168, 168)',
  colorBorder: 'hsl(230, 10%, 28%)',
  colorEditor: 'hsl(240, 3%, 13%)',
  colorToolBar: 'hsl(230, 8%, 10%)',
  colorTool: 'hsl(230, 12%, 18%)',
  colorEditorBar: 'hsl(230, 10%, 14%)',
  colorEditorIndex: 'hsl(230, 7%, 44%)',
  colorEditorIndexEmpty: 'hsl(223, 4%, 34%)',
  colorEditorSelected: 'rgba(121, 221, 252, 0.371)',
  colorEditorQuote: 'rgb(232, 232, 232)',
  colorError: 'red',
  colorEditorTagBack: 'rgb(233, 233, 233)',
  colorEditorTagFore: 'rgb(0, 0, 0)',
  colorExplorer: 'hsl(230, 11%, 16%)',
  colorExplorerHeader: 'rgb(234, 234, 234)',
  colorExplorerSelected: 'rgb(63, 123, 200)',
  colorStatus: 'hsl(230, 8%, 10%)',
  colorButton1Back: 'rgb(63, 114, 226)',
  colorButton1Fore: 'rgb(255, 255, 255)',
  colorMathPreviewBorder: '#eee',
  colorAnchorBorder: 'hsl(220, 2%, 33%)',
};

const lightTheme: Theme = {
  ...darkTheme,
  color: 'black',
  colorSecondary: 'rgb(97, 97, 97)',
  colorBorder: 'hsl(206, 5%, 74%)',
  colorEditor: 'hsl(0, 0%, 100%)',
  colorToolBar: 'hsl(210, 7%, 95%)',
  colorTool: 'hsl(0, 0%, 100%)',
  colorEditorBar: 'hsl(204, 11%, 91%)',
  colorEditorIndex: 'hsl(200, 7%, 44%)',
  colorEditorIndexEmpty: 'hsl(229, 15%, 78%)',
  colorEditorSelected: 'rgba(121, 221, 252, 0.371)',
  colorEditorQuote: 'rgb(26, 26, 26)',
  colorExplorer: 'hsl(210, 5%, 93%)',
  colorExplorerHeader: 'rgb(0, 0, 0)',
  colorExplorerSelected: 'rgb(63, 123, 200)',
  colorStatus: 'hsl(195, 14%, 95%)',
  colorButton1Back: 'rgb(63, 114, 226)',
  colorButton1Fore: 'rgb(255, 255, 255)',
  colorMathPreviewBorder: '#eee',
  colorAnchorBorder: 'rgb(219, 219, 219)',
};

const GlobalStyle = createGlobalStyle`
  html {
    font-family: sans-serif;
    color: ${props => props.theme.color};
    -webkit-font-smoothing: antialiased;
  }

  html,
  body,
  #root {
    height: 100%;
  }
`;

const DivLayoutRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const DivMain = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 1 0;
  overflow-y: hidden;
  overflow-x: hidden;
`;

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
    <ThemeProvider theme={lightTheme}>
      <GlobalStyle />
      <DivLayoutRoot>
        <ToolBar />
        <DivMain>
          <ExplorerPane />
          <EditorPane />
        </DivMain>
        <StatusBar />
      </DivLayoutRoot>
    </ThemeProvider>
  </ModelProvider>
);