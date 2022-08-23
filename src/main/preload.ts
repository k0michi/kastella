import { ipcRenderer, contextBridge } from 'electron';

export class Bridge {
  readNote = (...args: any[]) => ipcRenderer.invoke('read-note', ...args);
  writeNote = (...args: any[]) => ipcRenderer.invoke('write-note', ...args);
}

contextBridge.exposeInMainWorld('bridge', new Bridge());