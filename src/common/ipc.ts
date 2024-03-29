import { IpcMainInvokeEvent } from "electron";
import { FetchedFile, FetchedMeta } from "./fetch";
import { NodeMenu, TagMenu } from "./menu";
import { FileKind } from "./file-type";

export interface ChannelType {
  readLibrary: () => Promise<string>;
  writeLibrary: (content: string) => Promise<void>;
  copyFile: (id: string, filePath: string) => Promise<void>;
  readFile: (id: string) => Promise<Uint8Array>;
  readTextFile: (id: string) => Promise<string>;
  removeFile: (id: string) => Promise<void>;
  basename: (filePath: string) => string;
  getMTime: (filePath: string) => Promise<bigint>;
  now: () => bigint;
  fetchMeta: (url: string) => Promise<FetchedMeta>;
  fetchFile: (url: string) => Promise<FetchedFile>;
  writeFile: (id: string, data: Uint8Array, type: string) => Promise<void>;
  writeTextFile: (id: string, data: string, type: string) => Promise<void>;
  openFile: (fileType: FileKind) => Promise<string[] | null>;
  setEdited: (edited: boolean) => void;
  showTagMenu: () => Promise<TagMenu | null>;
  showNodeMenu: () => Promise<NodeMenu | null>;
  shouldUseDarkColors: () => boolean;
  getInstanceID: () => string;
  getHostname: () => string;
  getUsername: () => string;
}

export enum Channel {
  readLibrary = 'readLibrary',
  writeLibrary = 'writeLibrary',
  copyFile = 'copyFile',
  readFile = 'readFile',
  readTextFile = 'readTextFile',
  removeFile = 'removeFile',
  basename = 'basename',
  getMTime = 'getMTime',
  now = 'now',
  fetchMeta = 'fetchMeta',
  fetchFile = 'fetchFile',
  writeFile = 'writeFile',
  writeTextFile = 'writeTextFile',
  openFile = 'openFile',
  setEdited = 'setEdited',
  shouldUseDarkColors = 'shouldUseDarkColors',
  showTagMenu = 'showTagMenu',
  showNodeMenu = 'showNodeMenu',
  getInstanceID = 'getInstanceID',
  getHostname = 'getHostname',
  getUsername = 'getUsername',

  nativeThemeUpdate = 'nativeThemeUpdate',
}

type Params<F> = F extends (...args: infer A) => any ? A : never;

type Return<F> = F extends (...args: any[]) => infer R ? R : never;

type Promised<T> = T extends Promise<any> ? T : Promise<T>;

export type Invoke<F> = (...args: Params<F>) => Promised<Return<F>>;

export type Handler<F> = (e: IpcMainInvokeEvent, ...args: Params<F>) => Return<F>;