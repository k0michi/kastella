import { Observable } from "kyoka";
import produce from 'immer';
import { v4 as uuidv4 } from 'uuid';

export enum NodeType {
  Text = 'text',
  Image = 'image',
  Anchor = 'anchor',
  Directory = 'directory',
}

export interface Node {
  id: string;
  type?: NodeType;
  created: Date;
  modified: Date;
  tags?: string[];
  index: number;
  parentID?: string;
}

export interface TextNode extends Node {
  type?: NodeType.Text;
  content: string;
}

export interface ImageNode extends Node {
  type?: NodeType.Image;
  fileID: string;
  description: string;
}

export interface AnchorNode extends Node {
  type?: NodeType.Anchor;
  url: string;
  title?: string;
  imageFileID?: string;
  faviconFileID?: string;
  description?: string;
}

export interface DirectoryNode extends Node {
  type?: NodeType.Directory;
  name: string;
}

export interface File {
  id: string;
  type: string;
  name?: string;
  url?: string;
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
  search = new Observable<string>('');

  constructor() {
  }


  // Nodes

  addNode(node: Node) {
    const newNodes = produce(this.nodes.get(), n => {
      n.push(node);
    });

    this.nodes.set(newNodes);
  }

  addTextNode(text: string, parentID?: string, tags?: string[]) {
    const now = new Date();
    const id = uuidv4();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = { type: NodeType.Text, content: text, tags, created: now, modified: now, id, parentID, index: this.getNextIndex() } as TextNode;
    this.addNode(node);
    this.save();
    return node;
  }

  addImageNode(file: File, parentID?: string, tags?: string[]) {
    const now = new Date();
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = { type: NodeType.Image, fileID: file.id, tags, created: now, modified: now, id, parentID, index: this.getNextIndex() } as ImageNode;
    this.addFile(file);
    this.addNode(node);
    this.save();
    return node;
  }

  addDirectoryNode(name: string, parentID?: string, tags?: string[]) {
    const now = new Date();
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = { type: NodeType.Directory, name: name, tags, created: now, modified: now, id, parentID, index: this.getNextIndex() } as DirectoryNode;
    this.addNode(node);
    return node;
  }

  removeNode(id: string) {
    const foundIndex = this.nodes.get().findIndex(n => n.id == id);
    const found = this.nodes.get()[foundIndex];

    if (found.type == NodeType.Image) {
      this.removeFile((found as ImageNode).fileID);
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

  createDirectory(path: string) {
    const dirs = path.split('/').filter(d => d.length > 0);
    let parentID: string | undefined = undefined;

    for (const dir of dirs) {
      const found = this.findDirectory(parentID, dir);

      if (found == null) {
        parentID = this.addDirectoryNode(dir, parentID).id;
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


  // File System

  async loadLibrary() {
    const c = await bridge.readLibrary();

    const data = JSON.parse(c, (key, value) => {
      if (key == 'created' || key == 'modified') {
        return new Date(value);
      }

      return value;
    }) as Library;

    this.nodes.set(data.nodes ?? []);
    this.files.set(data.files ?? []);
    this.tags.set(data.tags ?? []);
  }

  async save() {
    if (this.saving.get()) {
      return;
    }

    this.saving.set(true);

    await bridge.writeLibrary(JSON.stringify({
      nodes: this.nodes.get(),
      files: this.files.get(),
      tags: this.tags.get()
    }));

    this.saving.set(false);
  }
}