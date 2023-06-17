import { ipcRenderer, contextBridge } from 'electron';
import { FetchedFile, FetchedMeta, FileType } from '../common/fetch.js';

export class Bridge {
  readLibrary = (): Promise<string> => ipcRenderer.invoke('read-library');
  writeLibrary = (content: string): Promise<void> => ipcRenderer.invoke('write-library', content);
  copyFile = (id: string, filePath: string): Promise<void> => ipcRenderer.invoke('copy-file', id, filePath);
  readFile = (id: string): Promise<Uint8Array> => ipcRenderer.invoke('read-file', id);
  readTextFile = (id: string): Promise<string> => ipcRenderer.invoke('read-text-file', id);
  removeFile = (id: string): Promise<Uint8Array> => ipcRenderer.invoke('remove-file', id);
  basename = (filePath: string): Promise<string> => ipcRenderer.invoke('basename', filePath);
  getMTime = (filePath: string): Promise<bigint> => ipcRenderer.invoke('get-mtime', filePath);
  now = (): Promise<bigint> => ipcRenderer.invoke('now');
  fetchMeta = (url: string): Promise<FetchedMeta> => ipcRenderer.invoke('fetch-meta', url);
  fetchFile = (url: string): Promise<FetchedFile> => ipcRenderer.invoke('fetch-file', url);
  writeFile = (id: string, data: Uint8Array, type: string): Promise<void> => ipcRenderer.invoke('write-file', id, data, type);
  writeTextFile = (id: string, data: string, type: string): Promise<void> => ipcRenderer.invoke('write-text-file', id, data, type);
  openFile = (fileType: FileType): Promise<string[] | null> => ipcRenderer.invoke('open-file', fileType);
  setEdited = (edited: boolean): Promise<void> => ipcRenderer.invoke('set-edited', edited);
}

contextBridge.exposeInMainWorld('bridge', new Bridge());