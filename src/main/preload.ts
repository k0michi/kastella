import { ipcRenderer, contextBridge } from 'electron';

export class Bridge {
  readNote = () => ipcRenderer.invoke('read-note');
  writeNote = (content: string) => ipcRenderer.invoke('write-note', content);
}

contextBridge.exposeInMainWorld('bridge', new Bridge());