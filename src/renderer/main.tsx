import { ModelProvider, useModel, useObservable } from 'kyoka';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import EditorPane from './components/editor-pane';
import ExplorerPane from './components/explorer-pane';
import Model from './model';
import StatusBar from './components/status-bar';
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
  colorToolActive: 'hsl(227, 9%, 29%)',
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
  colorButton0Back: '#dcdcdc',
  colorButton0BackActive: '#c5c5c5',
  colorButton0Fore: 'rgb(6, 6, 6)',
  colorButton1Back: 'rgb(63, 114, 226)',
  colorButton1BackActive: 'rgb(54, 95, 183)',
  colorButton1Fore: 'rgb(255, 255, 255)',
  colorMathPreviewBorder: '#eee',
  colorButtonDisabledBack: '#e8e8e8',
  colorButtonDisabledFore: '#b6b6b6',
  colorAnchorBorder: 'hsl(220, 2%, 33%)',
};

const lightTheme: Theme = {
  ...darkTheme,
  color: 'black',
  colorSecondary: 'rgb(97, 97, 97)',
  colorBorder: 'hsl(206, 5%, 74%)',
  colorEditor: 'hsl(0, 0%, 100%)',
  colorToolBar: 'hsl(210, 7%, 95%)',
  colorTool: 'hsl(0, 0%, 89.41176470588236%)',
  colorToolActive: 'hsl(0, 0%, 83.13725490196079%)',
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
  colorAnchorBorder: 'rgb(219, 219, 219)',
};

const GlobalStyle = createGlobalStyle`
  html {
    font-family: sans-serif;
    color: ${props => props.theme.color};
    -webkit-font-smoothing: antialiased;
    word-break: break-all;
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

const DivResizer = styled.div`
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: 4px;
  margin-left: -4px;
  border-left: 4px solid transparent;
  cursor: col-resize;
  resize: horizontal;
  background-color: ${props => props.theme.colorBorder};
  background-clip: padding-box;
`;

const model = new Model();
model.loadLibrary();

bridge.onNativeThemeUpdate(async () => {
  model.setDarkMode(await bridge.shouldUseDarkColors());
});

model.setDarkMode(await bridge.shouldUseDarkColors());

window.addEventListener('beforeunload', e => {
  if (model.unsaved.get()) {
    e.preventDefault();

    // Chrome requires this
    e.returnValue = false;
  }
});

function App() {
  const model = useModel<Model>();
  const darkMode = useObservable(model.darkMode);

  // https://codesandbox.io/s/react-resizable-sidebar-kz9de
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(200);

  const startResizing = React.useCallback(() => {
    setResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setResizing(false);
  }, []);

  const onMouseMove = React.useCallback((e: MouseEvent) => {
    if (resizing) {
      setSidebarWidth(e.clientX - sidebarRef.current!.getBoundingClientRect().left);
    }
  }, [resizing]);

  React.useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopResizing);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [onMouseMove, stopResizing]);

  return <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
    <GlobalStyle />
    <DivLayoutRoot>
      <ToolBar />
      <DivMain>
        <ExplorerPane ref={sidebarRef} width={sidebarWidth} />
        <DivResizer onMouseDown={e => startResizing()} />
        <EditorPane />
      </DivMain>
      <StatusBar />
    </DivLayoutRoot>
  </ThemeProvider>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ModelProvider model={model}>
    <App />
  </ModelProvider>
);