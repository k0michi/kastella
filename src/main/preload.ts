import { ipcRenderer, contextBridge } from 'electron';

export class Bridge {
  readLibrary = (): Promise<string> => ipcRenderer.invoke('read-library');
  writeLibrary = (content: string): Promise<void> => ipcRenderer.invoke('write-library', content);
  copyFile = (id: string, filePath: string): Promise<void> => ipcRenderer.invoke('copy-file', id, filePath);
  readFile = (id: string): Promise<Uint8Array> => ipcRenderer.invoke('read-file', id);
  removeFile = (id: string): Promise<Uint8Array> => ipcRenderer.invoke('remove-file', id);
  basename = (filePath: string): Promise<string> => ipcRenderer.invoke('basename', filePath);
}

contextBridge.exposeInMainWorld('bridge', new Bridge());