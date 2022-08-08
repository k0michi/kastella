import { ipcRenderer, contextBridge } from 'electron';

export class Bridge {
}

contextBridge.exposeInMainWorld('bridge', new Bridge());