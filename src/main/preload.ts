import { ipcRenderer, contextBridge } from 'electron';
import { ChannelTypes, Channels, Invoke } from '../common/ipc.js';

function makeInvoke<K extends keyof ChannelTypes>(channel: K) {
  const invoke = ((...args) => ipcRenderer.invoke(channel, ...args)) as Invoke<ChannelTypes[K]>;
  return invoke;
}

export class Bridge {
  readLibrary = makeInvoke(Channels.readLibrary);
  writeLibrary = makeInvoke(Channels.writeLibrary);
  copyFile = makeInvoke(Channels.copyFile);
  readFile = makeInvoke(Channels.readFile);
  readTextFile = makeInvoke(Channels.readTextFile);
  removeFile = makeInvoke(Channels.removeFile);
  basename = makeInvoke(Channels.basename);
  getMTime = makeInvoke(Channels.getMTime);
  now = makeInvoke(Channels.now);
  fetchMeta = makeInvoke(Channels.fetchMeta);
  fetchFile = makeInvoke(Channels.fetchFile);
  writeFile = makeInvoke(Channels.writeFile);
  writeTextFile = makeInvoke(Channels.writeTextFile);
  openFile = makeInvoke(Channels.openFile);
  setEdited = makeInvoke(Channels.setEdited);
  shouldUseDarkColors = makeInvoke(Channels.shouldUseDarkColors);
  showTagMenu = makeInvoke(Channels.showTagMenu);
  onNativeThemeUpdate = (handler: () => void) => {
    ipcRenderer.on(Channels.nativeThemeUpdate, handler);
  };
  offNativeThemeUpdate = (handler: () => void) => {
    ipcRenderer.off(Channels.nativeThemeUpdate, handler);
  };
}

contextBridge.exposeInMainWorld('bridge', new Bridge());