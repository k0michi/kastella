import { Observable } from "kyoka";
import produce from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { now } from "./utils";
import { ZonedDateTime, DateTimeFormatter } from '@js-joda/core';

const LIBRARY_VERSION = 2;

export enum NodeType {
  Text = 'text',
  Image = 'image',
  Anchor = 'anchor',
  Directory = 'directory',
}

export interface Node {
  id: string;
  type: NodeType;
  created: ZonedDateTime;
  modified: ZonedDateTime;
  tags?: string[];
  index: number;
  parentID?: string;
}

export interface TextNode extends Node {
  type: NodeType.Text;
  content: string;
}

export interface ImageNode extends Node {
  type: NodeType.Image;
  fileID: string;
  description: string;
}

export interface AnchorNode extends Node {
  type: NodeType.Anchor;
  contentURL: string;
  contentType: string;
  contentTitle?: string;
  contentDescription?: string;
  contentImageFileID?: string;
  contentModified?: string;
}

export interface DirectoryNode extends Node {
  type: NodeType.Directory;
  name: string;
}

export interface File {
  id: string;
  type: string;
  name?: string;
  url?: string;
  modified?: ZonedDateTime;
  accessed: ZonedDateTime;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Library {
  nodes: Node[];
  files: File[];
  tags: Tag[];
}

export interface View {
  type: 'directory' | 'tag' | 'date';
}

export interface DirectoryView extends View {
  type: 'directory';
  parentID?: string;
}

export interface TagView extends View {
  type: 'tag';
  tag: string;
}

export interface DateView extends View {
  type: 'date';
  date: string;
}

export default class Model {
  nodes = new Observable<Node[]>([]);
  files = new Observable<File[]>([]);
  tags = new Observable<Tag[]>([]);
  view = new Observable<View>({ type: 'directory' });
  saving = new Observable<boolean>(false);
  writeOnly = new Observable<boolean>(true);
  lineNumberVisibility = new Observable<boolean>(true);
  dateVisibility = new Observable<boolean>(false);
  search = new Observable<string>('');
  savePromise: Promise<void> | null = null;

  constructor() {
  }


  // Nodes

  addNode(node: Node) {
    const newNodes = produce(this.nodes.get(), n => {
      n.push(node);
    });

    this.nodes.set(newNodes);
  }

  addTextNode(text: string, date: ZonedDateTime, parentID?: string, tags?: string[]) {
    const id = uuidv4();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = { type: NodeType.Text, content: text, tags, created: date, modified: date, id, parentID, index: this.getNextIndex() } as TextNode;
    this.addNode(node);
    this.save();
    return node;
  }

  addImageNode(file: File, date: ZonedDateTime, parentID?: string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = { type: NodeType.Image, fileID: file.id, tags, created: date, modified: date, id, parentID, index: this.getNextIndex() } as ImageNode;
    this.addFile(file);
    this.addNode(node);
    this.save();
    return node;
  }

  addDirectoryNode(name: string, date: ZonedDateTime, parentID?: string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = { type: NodeType.Directory, name: name, tags, created: date, modified: date, id, parentID, index: this.getNextIndex() } as DirectoryNode;
    this.addNode(node);
    return node;
  }

  addAnchorNode(anchor: {
    contentURL: string,
    contentType: string,
    contentTitle?: string,
    contentDescription?: string,
    contentImageFileID?: string,
    contentModified?: string
  },
    date: ZonedDateTime,
    parentID?: string,
    tags?: string[]) {
    const id = uuidv4();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = { type: NodeType.Anchor, ...anchor, created: date, modified: date, id, parentID, index: this.getNextIndex() } as AnchorNode;
    this.addNode(node);
    this.save();
    return node;
  }

  removeNode(id: string) {
    const foundIndex = this.nodes.get().findIndex(n => n.id == id);
    const found = this.nodes.get()[foundIndex];

    if (found.type == NodeType.Image) {
      this.removeFile((found as ImageNode).fileID);
    }

    if (found.type == NodeType.Anchor) {
      const fileID = (found as AnchorNode).contentImageFileID;

      if (fileID != null) {
        this.removeFile(fileID);
      }
    }

    const newNodes = produce(this.nodes.get(), n => {
      n.splice(n.findIndex(n => n.id == id), 1);
    });

    this.nodes.set(newNodes);
    this.save();
  }

  getNode(id: string) {
    return this.nodes.get().find(n => n.id == id);
  }

  getChildNodes(parentID: string | undefined) {
    return this.nodes.get().filter(n => n.parentID == parentID);
  }

  getChildDirectories(parentID: string | undefined) {
    return this.nodes.get().filter(n => n.type == NodeType.Directory && n.parentID == parentID);
  }

  getNextIndex() {
    return this.nodes.get().length;
  }

  setParent(id: string, parentID: string) {
    const foundIndex = this.nodes.get().findIndex(n => n.id == id);

    const newNodes = produce(this.nodes.get(), n => {
      n[foundIndex].parentID = parentID;
    });

    this.nodes.set(newNodes);
    this.save();
  }

  getPath(directoryID: string) {
    const nodes = this.nodes.get();
    let dirs = [];
    let dirID: string | undefined = directoryID;

    if (directoryID == 'trash') {
      return 'Trash';
    }

    while (dirID != undefined) {
      const found = nodes.find(n => n.id == dirID);

      if (found == undefined) {
        throw new Error();
      }

      dirs.unshift((found as DirectoryNode).name);
      dirID = found.parentID;
    }

    return '/' + dirs.join('/');
  }

  // Files

  addFile(file: File) {
    const newFiles = produce(this.files.get(), f => {
      f.push(file);
    });

    this.files.set(newFiles);
  }

  removeFile(fileID: string) {
    const found = this.files.get().findIndex(f => f.id == fileID);
    bridge.removeFile(this.files.get()[found].id);

    const newFiles = produce(this.files.get(), f => {
      f.splice(f.findIndex(f => f.id == fileID), 1);
    });

    this.files.set(newFiles);
    this.save();
  }

  getFile(fileID: string) {
    const found = this.files.get().find(f => f.id == fileID);
    return found;
  }


  // Tags

  createTag(name: string) {
    const id = uuidv4();

    const newTags = produce(this.tags.get(), t => {
      t.push({ id, name });
    });

    this.tags.set(newTags);
    this.save();
    return id;
  }

  findTag(name: string) {
    return this.tags.get().find(t => t.name.localeCompare(name, undefined, { sensitivity: 'accent' }) == 0);
  }

  getTag(id: string) {
    return this.tags.get().find(t => t.id == id);
  }

  removeTag(id: string) {
    // TODO
  }


  // Directories

  findDirectory(parentID: string | undefined, name: string) {
    return this.nodes.get().find(n =>
      n.type == NodeType.Directory &&
      n.parentID == parentID &&
      (n as DirectoryNode).name.localeCompare(name, undefined, { sensitivity: 'accent' }) == 0
    );
  }

  async createDirectory(path: string) {
    const dirs = path.split('/').filter(d => d.length > 0);
    let parentID: string | undefined = undefined;

    for (const dir of dirs) {
      const found = this.findDirectory(parentID, dir);

      if (found == null) {
        parentID = this.addDirectoryNode(dir, await now(), parentID).id;
      } else {
        parentID = found.id;
      }
    }

    this.save();
    return parentID;
  }


  // Views

  changeView(view: View) {
    this.view.set(view);
  }

  setSearch(search: string) {
    this.search.set(search);
  }

  setWriteOnly(writeOnly: boolean) {
    this.writeOnly.set(writeOnly);
  }

  setLineNumberVisibility(visibility: boolean) {
    this.lineNumberVisibility.set(visibility);
  }

  setDateVisibility(visibility: boolean) {
    this.dateVisibility.set(visibility);
  }


  // File System

  async loadLibrary() {
    const c = await bridge.readLibrary();

    const data = JSON.parse(c, (key, value) => {
      if (key == 'created' || key == 'modified' || key == 'accessed') {
        return ZonedDateTime.parse(value);
      }

      return value;
    }) as Library;

    this.nodes.set(data.nodes ?? []);
    this.files.set(data.files ?? []);
    this.tags.set(data.tags ?? []);
  }

  async save() {
    if (this.savePromise != null) {
      console.log('saving')
      await this.savePromise;
    }

    this.saving.set(true);

    this.savePromise = bridge.writeLibrary(JSON.stringify({
      nodes: this.nodes.get(),
      files: this.files.get(),
      tags: this.tags.get(),
      version: LIBRARY_VERSION
    }, (key, value) => {
      // Replacer is called after toJSON()
      if ((key == 'created' || key == 'modified' || key == 'accessed') && value != undefined) {
        const dateTime = value as string;
        return ZonedDateTime.parse(dateTime).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
      }

      return value;
    })).then((() => {
      this.savePromise = null;
      this.saving.set(false);
    }).bind(this));
  }
}