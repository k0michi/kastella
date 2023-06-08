// Modules to control application life and create native browser window

import { app, BrowserWindow, dialog, Event, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { now } from '@k0michi/now';
import { fetchFile, fetchMeta } from './fetch.js';
import * as mime from 'mime';
import { FileType } from '../common/fetch.js';

// Paths
const devURL = `http://localhost:5173/`;
const configFileName = 'config.json';
const userDataPath = app.getPath('userData');
let defaultLibraryPath = path.join(userDataPath, 'library');

// Variables
let mainWindow: BrowserWindow | undefined;
let config: Config;
let libraryPath: string;

interface Config {
  libraryPath?: string;
}

function getConfigPath() {
  return path.join(userDataPath, configFileName);
}

async function loadConfig() {
  const configPath = getConfigPath();
  let configContent: string;
  
  try {
    configContent = await fs.readFile(configPath, 'utf-8');
  } catch (error) {
    // Does not exist
    configContent = `{}`;
    await fs.writeFile(configPath, configContent);
  }

  config = JSON.parse(configContent);
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
      preload: path.join(__dirname, 'preload.js')
    },
    vibrancy: 'sidebar'
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
  libraryPath = getLibraryPath();

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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

ipcMain.handle('read-library', async e => {
  const filePath = path.join(libraryPath, 'data.json');
  return fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('write-library', async (e, content: string) => {
  const filePath = path.join(libraryPath, 'data.json');
  await fs.mkdir(libraryPath, { recursive: true });
  return await fs.writeFile(filePath, content);
});

ipcMain.handle('copy-file', async (e, id: string, filePath: string) => {
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

ipcMain.handle('read-file', async (e, id: string) => {
  const found = await findFile(id);
  return await fs.readFile(found);
});

ipcMain.handle('read-text-file', async (e, id: string) => {
  const found = await findFile(id);
  return await fs.readFile(found, 'utf-8');
});

ipcMain.handle('remove-file', async (e, id: string) => {
  const found = await findFile(id);
  return await fs.rm(found);
});

ipcMain.handle('basename', (e, filePath: string) => {
  return path.basename(filePath);
});

ipcMain.handle('get-mtime', async (e, filePath: string) => {
  const stat = await fs.stat(filePath, { bigint: true });
  return stat.mtimeNs;
});

ipcMain.handle('now', (e) => {
  return now();
});

ipcMain.handle('fetch-meta', async (e, url: string) => {
  return await fetchMeta(url);
});

ipcMain.handle('fetch-file', async (e, url: string) => {
  return await fetchFile(url);
});

ipcMain.handle('write-file', async (e, id: string, data: Uint8Array, type: string) => {
  const ext = mime.getExtension(type)
  await fs.mkdir(path.join(libraryPath, 'files'), { recursive: true });
  const destPath = path.join(libraryPath, 'files', id + '.' + ext);
  return await fs.writeFile(destPath, data);
});

ipcMain.handle('open-file', async (e, fileType: FileType) => {
  if (fileType == FileType.Text) {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths;
  }

  if (fileType == FileType.Image) {
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

ipcMain.handle('set-edited', async (e, edited: boolean) => {
  mainWindow?.setDocumentEdited(edited);
});