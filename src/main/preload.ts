import { ipcRenderer, contextBridge } from 'electron';
import { ChannelType, Channel, Invoke } from '../common/ipc.js';

function makeInvoke<K extends keyof ChannelType>(channel: K) {
  const invoke = ((...args) => ipcRenderer.invoke(channel, ...args)) as Invoke<ChannelType[K]>;
  return invoke;
}

export class Bridge {
  readLibrary = makeInvoke(Channel.readLibrary);
  writeLibrary = makeInvoke(Channel.writeLibrary);
  copyFile = makeInvoke(Channel.copyFile);
  readFile = makeInvoke(Channel.readFile);
  readTextFile = makeInvoke(Channel.readTextFile);
  removeFile = makeInvoke(Channel.removeFile);
  basename = makeInvoke(Channel.basename);
  getMTime = makeInvoke(Channel.getMTime);
  now = makeInvoke(Channel.now);
  fetchMeta = makeInvoke(Channel.fetchMeta);
  fetchFile = makeInvoke(Channel.fetchFile);
  writeFile = makeInvoke(Channel.writeFile);
  writeTextFile = makeInvoke(Channel.writeTextFile);
  openFile = makeInvoke(Channel.openFile);
  setEdited = makeInvoke(Channel.setEdited);
  shouldUseDarkColors = makeInvoke(Channel.shouldUseDarkColors);
  showTagMenu = makeInvoke(Channel.showTagMenu);
  getDeviceID = makeInvoke(Channel.getDeviceID);
  getHostname = makeInvoke(Channel.getHostname);
  onNativeThemeUpdate = (handler: () => void) => {
    ipcRenderer.on(Channel.nativeThemeUpdate, handler);
  };
  offNativeThemeUpdate = (handler: () => void) => {
    ipcRenderer.off(Channel.nativeThemeUpdate, handler);
  };
}

contextBridge.exposeInMainWorld('bridge', new Bridge());