import { ipcRenderer, contextBridge } from 'electron';

export class Bridge {
  readNote = (): Promise<string> => ipcRenderer.invoke('read-note');
  writeNote = (content: string): Promise<void> => ipcRenderer.invoke('write-note', content);
  copyFile = (id: string, filePath: string): Promise<void> => ipcRenderer.invoke('copy-file', id, filePath);
  readFile = (id: string): Promise<Uint8Array> => ipcRenderer.invoke('read-file', id);
  basename = (filePath: string): Promise<string> => ipcRenderer.invoke('basename', filePath);
}

contextBridge.exposeInMainWorld('bridge', new Bridge());