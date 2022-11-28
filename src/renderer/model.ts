import { Observable } from "kyoka";
import produce from 'immer';
import { v4 as uuidv4 } from 'uuid';
import Timestamp from "./timestamp";
import { round } from "./utils";
import { validateLibrary } from "./validate";

const LIBRARY_VERSION = 5;

export interface Library {
  nodes: Node[];
  files: File[];
  tags: Tag[];
}

export enum NodeType {
  Text = 'text',
  Image = 'image',
  Anchor = 'anchor',
  Directory = 'directory',
  TextEmbed = 'text-embed',
  Math = 'math',
}

export interface Node {
  type: NodeType;
  id: string;
  created: Timestamp;
  modified: Timestamp;
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
  description?: string;
}

export interface AnchorNode extends Node {
  type: NodeType.Anchor;
  contentURL: string;
  contentType: string;
  contentTitle?: string;
  contentDescription?: string;
  contentImageFileID?: string;
  contentModified?: Timestamp;
  contentAccessed: Timestamp;
}

export interface DirectoryNode extends Node {
  type: NodeType.Directory;
  name: string;
}

export interface TextEmbedNode extends Node {
  type: NodeType.TextEmbed;
  fileID: string;
  description?: string;
}

export interface MathNode extends Node {
  type: NodeType.Math;
  expression: string;
}

export interface PseudoNode {
  type: NodeType;
  pseudo: true;
  id: string | undefined;
  tags?: string[];
  parentID?: string;
}

export interface PseudoDirectoryNode extends PseudoNode {
  type: NodeType.Directory;
  name: string;
}

export interface File {
  id: string;
  type: string;
  name?: string;
  url?: string;
  modified?: Timestamp;
  accessed: Timestamp;
}

export interface Tag {
  id: string;
  name: string;
}

export enum ViewType {
  Directory = 'directory',
  Tag = 'tag',
  Date = 'date'
}

export interface View {
  type: ViewType;
}

export interface DirectoryView extends View {
  type: ViewType.Directory;
  parentID?: string;
}

export interface TagView extends View {
  type: ViewType.Tag;
  tag: string;
}

export interface DateView extends View {
  type: ViewType.Date;
  date: string;
}

export interface Status {
  id: string;
  message: string;
}

export namespace ReservedID {
  export const Root = undefined;
  export const Trash = 'trash';
}

export default class Model {
  nodes = new Observable<Node[]>([]);
  files = new Observable<File[]>([]);
  tags = new Observable<Tag[]>([]);
  view = new Observable<View | undefined>(undefined);
  saving = new Observable<boolean>(false);
  writeOnly = new Observable<boolean>(true);
  lineNumberVisibility = new Observable<boolean>(true);
  dateVisibility = new Observable<boolean>(false);
  search = new Observable<string>('');
  savePromise: Promise<void> | null = null;
  status = new Observable<Status | undefined>(undefined);
  intersecting = new Observable<Set<string>>(new Set());

  constructor() {
    this.changeView({ type: ViewType.Directory });
  }


  // Nodes

  addNode(node: Node) {
    if (node.parentID == ReservedID.Root) {
      node.parentID = undefined;
    }

    const newNodes = produce(this.nodes.get(), n => {
      n.push(node);
    });

    this.nodes.set(newNodes);
    this.save();
  }

  addTextNode(text: string, timeStamp: Timestamp, parentID?: string, tags?: string[]) {
    const id = uuidv4();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = {
      type: NodeType.Text,
      content: text,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id, parentID,
      index: this.getNextIndex()
    } as TextNode;
    this.addNode(node);
    return node;
  }

  addImageNode(file: File, timeStamp: Timestamp, parentID?: string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = {
      type: NodeType.Image,
      fileID: file.id,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id,
      parentID,
      index: this.getNextIndex()
    } as ImageNode;
    this.addFile(file);
    this.addNode(node);
    return node;
  }

  addTextEmbedNode(file: File, timeStamp: Timestamp, parentID?: string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = {
      type: NodeType.TextEmbed,
      fileID: file.id,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id,
      parentID,
      index: this.getNextIndex()
    } as TextEmbedNode;
    this.addFile(file);
    this.addNode(node);
    return node;
  }

  addDirectoryNode(name: string, timeStamp: Timestamp, parentID?: string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = {
      type: NodeType.Directory,
      name: name,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id, parentID,
      index: this.getNextIndex()
    } as DirectoryNode;
    this.addNode(node);
    return node;
  }

  addAnchorNode(anchor: {
    contentURL: string,
    contentType: string,
    contentTitle?: string,
    contentDescription?: string,
    contentImageFileID?: string,
    contentModified?: Timestamp,
    contentAccessed: Timestamp
  },
    timeStamp: Timestamp,
    parentID?: string,
    tags?: string[]) {
    const id = uuidv4();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = {
      type: NodeType.Anchor,
      ...anchor,
      created: timeStamp,
      modified: timeStamp,
      id,
      parentID,
      index: this.getNextIndex()
    } as AnchorNode;
    this.addNode(node);
    return node;
  }

  addMathNode(exp: string, timeStamp: Timestamp, parentID?: string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node = {
      type: NodeType.Math,
      expression: exp,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id, parentID,
      index: this.getNextIndex()
    } as MathNode;
    this.addNode(node);
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

    const index = found.index;

    const newNodes = produce(this.nodes.get(), nodes => {
      nodes.splice(nodes.findIndex(n => n.id == id), 1);

      for (const n of nodes) {
        if (n.index > index) {
          n.index--;
        }
      }
    });

    this.nodes.set(newNodes);
    this.save();
  }

  getNode(id?: string) {
    if (id === undefined) {
      return {
        type: NodeType.Directory,
        pseudo: true,
        id: ReservedID.Root,
        name: '/'
      } as PseudoDirectoryNode;
    } else if (id === 'trash') {
      return {
        type: NodeType.Directory,
        pseudo: true,
        id: ReservedID.Trash,
        name: 'Trash'
      } as PseudoDirectoryNode;
    }

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

  setParent(id: string, parentID: string | undefined) {
    const foundIndex = this.nodes.get().findIndex(n => n.id == id);

    const newNodes = produce(this.nodes.get(), n => {
      n[foundIndex].parentID = parentID;
    });

    this.nodes.set(newNodes);
    this.save();
  }

  getPath(directoryID?: string): string {
    const nodes = this.nodes.get();
    let dirID: string | undefined = directoryID;

    if (directoryID == ReservedID.Root) {
      return '/';
    }

    if (directoryID == ReservedID.Trash) {
      return 'Trash';
    }

    const found = nodes.find(n => n.id == dirID);

    if (found == undefined) {
      throw new Error(`Node ${dirID} not found`);
    }

    return this.getPath(found.parentID) + (found as DirectoryNode).name + '/';
  }

  swapIndex(id1: string, id2: string) {
    this.nodes.set(produce(this.nodes.get(), nodes => {
      const n1 = nodes.find(n => n.id == id1)!;
      const n2 = nodes.find(n => n.id == id2)!;
      const temp = n1.index;
      n1.index = n2.index;
      n2.index = temp;
    }));
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

  getTag(id: string) {
    return this.tags.get().find(t => t.id == id);
  }

  appendTag(id: string, tagID: string) {
    const foundIndex = this.nodes.get().findIndex(n => n.id == id);

    const newNodes = produce(this.nodes.get(), n => {
      const node = n[foundIndex];

      if (node.tags == undefined) {
        node.tags = [tagID];
      } else {
        if (!node.tags.includes(tagID)) {
          node.tags.push(tagID);
        }
      }
    });

    this.nodes.set(newNodes);
    this.save();
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
        parentID = this.addDirectoryNode(dir, Timestamp.fromNs(await bridge.now()), parentID).id;
      } else {
        parentID = found.id;
      }
    }

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

  addIntersecting(id: string) {
    const newVisibleNodes = new Set(this.intersecting.get());
    newVisibleNodes.add(id);
    this.intersecting.set(newVisibleNodes);
  }

  removeIntersecting(id: string) {
    const newVisibleNodes = new Set(this.intersecting.get());
    newVisibleNodes.delete(id);
    this.intersecting.set(newVisibleNodes);
  }

  getViewDirectory() {
    const view = this.view.get();

    if (view != null && view.type == ViewType.Directory) {
      return (view as DirectoryView).parentID;
    }

    return undefined;
  }

  getViewTags() {
    const view = this.view.get();

    if (view != null && view.type == ViewType.Tag) {
      return [(view as TagView).tag];
    }

    return [];
  }


  // File System

  async loadLibrary() {
    const c = await bridge.readLibrary();

    const data = JSON.parse(c, (key, value) => {
      if (key == 'created' || key == 'modified' || key == 'accessed' || key == 'contentModified' || key == 'contentAccessed') {
        return new Timestamp(value);
      }

      return value;
    }) as Library;

    validateLibrary(data);

    this.nodes.set(data.nodes ?? []);
    this.files.set(data.files ?? []);
    this.tags.set(data.tags ?? []);
  }

  async save() {
    if (this.savePromise != null) {
      await this.savePromise;
    }

    this.saving.set(true);
    this.setStatus('Saving...');
    const start = performance.now();

    this.savePromise = bridge.writeLibrary(JSON.stringify({
      nodes: this.nodes.get(),
      files: this.files.get(),
      tags: this.tags.get(),
      version: LIBRARY_VERSION
    })).then((() => {
      this.savePromise = null;
      this.saving.set(false);
    }).bind(this));

    const end = performance.now();
    const elapsed = end - start;
    const statusID = this.setStatus(`Saved! (${round(elapsed, 2)} ms)`);

    setTimeout((() => {
      if (this.status.get()?.id == statusID) {
        this.clearStatus();
      }
    }).bind(this), 5 * 1000);
  }


  // Status

  setStatus(message: string) {
    const id = uuidv4();
    this.status.set({ id, message });
    return id;
  }

  clearStatus() {
    this.status.set(undefined)
  }
}