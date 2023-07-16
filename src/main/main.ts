// Modules to control application life and create native browser window

import { app, BrowserWindow, dialog, Event, ipcMain, shell, nativeTheme, IpcMainInvokeEvent, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { now } from '@k0michi/now';
import * as mime from 'mime';
import * as os from 'os';
import * as crypto from 'crypto';

import { fetchFile, fetchMeta } from './fetch.js';
import { FileKind, FileType } from '../common/file-type.js';
import { ChannelType, Channel, Handler } from '../common/ipc.js';
import { NodeMenu, TagMenu } from '../common/menu.js';

// Paths
const devURL = `http://localhost:5173/`;
const configFileName = 'config.json';
const deviceIDFileName = 'device.json';
const userDataPath = app.getPath('userData');
let defaultLibraryPath = path.join(userDataPath, 'library');

// Variables
let mainWindow: BrowserWindow | undefined;
let config: Config;
let deviceID: string;
let libraryPath: string;

interface Config {
  libraryPath?: string;
}

function getConfigPath() {
  return path.join(userDataPath, configFileName);
}

function getDeviceFilePath() {
  return path.join(userDataPath, deviceIDFileName);
}

async function loadConfig() {
  const configPath = getConfigPath();
  let configContent: string;

  try {
    configContent = await fs.readFile(configPath, 'utf-8');
  } catch (error) {
    // Does not exist
    configContent = JSON.stringify({});
    await fs.writeFile(configPath, configContent);
  }

  config = JSON.parse(configContent);
}

async function loadDeviceID() {
  const devicePath = getDeviceFilePath();
  let deviceContent: string;

  try {
    deviceContent = await fs.readFile(devicePath, 'utf-8');
  } catch (error) {
    // Does not exist
    deviceContent = JSON.stringify(crypto.randomUUID());
    await fs.writeFile(devicePath, deviceContent);
  }

  deviceID = JSON.parse(deviceContent);
}

function getLibraryPath() {
  if (!app.isPackaged) {
    // Development
    return './library';
  }


  return config.libraryPath ?? defaultLibraryPath;
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js')
    },
    icon: path.join(__dirname, '../../../assets/kastella_512.png')
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  } else {
    mainWindow.loadURL(devURL);
  }

  function handleNavigate(e: Event, url: string) {
    if (url != devURL) {
      e.preventDefault();
      shell.openExternal(url);
    }
  }

  mainWindow.webContents.on('will-navigate', handleNavigate);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url == devURL) {
      return { action: 'allow' };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  await loadConfig();
  await loadDeviceID();
  libraryPath = getLibraryPath();

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function handle<C extends keyof ChannelType>(channel: C, handler: Handler<ChannelType[C]>) {
  ipcMain.handle(channel, handler as (event: IpcMainInvokeEvent, ...args: any[]) => (Promise<void>) | (any));
}

handle(Channel.readLibrary, async e => {
  const filePath = path.join(libraryPath, 'data.json');
  return await fs.readFile(filePath, 'utf-8');
});

handle(Channel.writeLibrary, async (e, content: string) => {
  const filePath = path.join(libraryPath, 'data.json');
  await fs.mkdir(libraryPath, { recursive: true });
  return await fs.writeFile(filePath, content);
});

handle(Channel.copyFile, async (e, id: string, filePath: string) => {
  const ext = path.extname(filePath);
  await fs.mkdir(path.join(libraryPath, 'files'), { recursive: true });
  const destPath = path.join(libraryPath, 'files', id + ext);
  return await fs.copyFile(filePath, destPath);
});

async function findFile(id: string) {
  const files = await fs.readdir(path.join(libraryPath, 'files'));

  for (const file of files) {
    if (file.startsWith(id)) {
      return path.join(path.join(libraryPath, 'files'), file);
    }
  }

  throw new Error('Not found');
}

handle(Channel.readFile, async (e, id: string) => {
  const found = await findFile(id);
  return await fs.readFile(found);
});

handle(Channel.readTextFile, async (e, id: string) => {
  const found = await findFile(id);
  return await fs.readFile(found, 'utf-8');
});

handle(Channel.removeFile, async (e, id: string) => {
  const found = await findFile(id);
  return await fs.rm(found);
});

handle(Channel.basename, (e, filePath: string) => {
  return path.basename(filePath);
});

handle(Channel.getMTime, async (e, filePath: string) => {
  const stat = await fs.stat(filePath, { bigint: true });
  return stat.mtimeNs;
});

handle(Channel.now, (e) => {
  return now();
});

handle(Channel.fetchMeta, async (e, url: string) => {
  return await fetchMeta(url);
});

handle(Channel.fetchFile, async (e, url: string) => {
  return await fetchFile(url);
});

handle(Channel.writeFile, async (e, id: string, data: Uint8Array, type: string) => {
  const ext = mime.getExtension(type);
  await fs.mkdir(path.join(libraryPath, 'files'), { recursive: true });
  const destPath = path.join(libraryPath, 'files', id + '.' + ext);
  return await fs.writeFile(destPath, data);
});

handle(Channel.writeTextFile, async (e, id: string, data: string, type: string) => {
  const ext = mime.getExtension(type);
  await fs.mkdir(path.join(libraryPath, 'files'), { recursive: true });
  const destPath = path.join(libraryPath, 'files', id + '.' + ext);
  return await fs.writeFile(destPath, data);
});

handle(Channel.openFile, async (e, fileKind: FileKind) => {
  if (fileKind == FileKind.Text) {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths;
  }

  if (fileKind == FileKind.Image) {
    const result = await dialog.showOpenDialog({
      title: 'Open image file',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
      ]
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths;
  }

  return null;
});

handle(Channel.setEdited, (e, edited: boolean) => {
  mainWindow?.setDocumentEdited(edited);
});

handle(Channel.shouldUseDarkColors, (e) => {
  return nativeTheme.shouldUseDarkColors;
});

nativeTheme.on('updated', () => {
  mainWindow?.webContents.send(Channel.nativeThemeUpdate);
});

handle(Channel.showTagMenu, (e) => {
  return new Promise<TagMenu | null>((resolve, reject) => {
    const tagMenu = Menu.buildFromTemplate([{
      label: 'Edit Tag', click: () => {
        resolve(TagMenu.editTag);
      }
    }, {
      label: 'Delete Tag', click: () => {
        resolve(TagMenu.deleteTag);
      }
    }]);
    tagMenu.popup({
      window: BrowserWindow.fromWebContents(e.sender) ?? undefined,
      callback() {
        resolve(null);
      },
    });
  });
});

handle(Channel.showNodeMenu, (e) => {
  return new Promise<NodeMenu | null>((resolve, reject) => {
    const nodeMenu = Menu.buildFromTemplate([{
      label: 'Edit Tag', click: () => {
        resolve(NodeMenu.editTags);
      }
    }, {
      label: 'Show Info', click: () => {
        resolve(NodeMenu.showInfo);
      }
    }, {
      label: 'Delete Node', click: () => {
        resolve(NodeMenu.deleteNode);
      }
    }]);
    nodeMenu.popup({
      window: BrowserWindow.fromWebContents(e.sender) ?? undefined,
      callback() {
        resolve(null);
      },
    });
  });
});

handle(Channel.getInstanceID, (e) => {
  return deviceID;
});

handle(Channel.getHostname, (e) => {
  return os.hostname();
});

handle(Channel.getUsername, (e) => {
  return os.userInfo().username;
});