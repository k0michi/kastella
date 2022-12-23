import { Observable } from "kyoka";
import { v4 as uuidv4 } from 'uuid';
import Timestamp from "./timestamp";
import { arrayInsertBefore, arrayRemove, round } from "./utils";
import { Version5, Version9 } from "./compat";
import { visit } from "./tree";
import { AnchorNode, DirectoryNode, File, ImageNode, ItemStyle as ListStyle, MathNode, Node, NodeType, ReservedID, Tag, TextEmbedNode, TextNode } from "./node";
import EventHandler from "./event-handler";

export const LIBRARY_VERSION = 10;

export interface Library {
  nodes: Node[];
  files: File[];
  tags: Tag[];
  version: number;
}

export default class LibraryModel {
  nodes = new Observable<Node[]>([]); // mutable
  files = new Observable<File[]>([]); // mutable
  tags = new Observable<Tag[]>([]); // mutable
  nodeMap = new Map<string, Node>();
  saveHandler = new EventHandler();

  constructor() {
    this.initialize({
      nodes: LibraryModel.blankNodes(),
      files: [],
      tags: [],
      version: LIBRARY_VERSION
    });
  }

  initializeFromJSON(json: string) {
    let data = JSON.parse(json, (key, value) => {
      if (key == 'created' || key == 'modified' || key == 'accessed' || key == 'contentModified' || key == 'contentAccessed') {
        return new Timestamp(value);
      }

      return value;
    }) as Library;

    // validateLibrary(data);

    // Migrate older format
    if (data.version == 5) {
      data = Version5.convert(data);
    }

    if (data.version == 9) {
      data = Version9.convert(data);
    }

    this.initialize(data);
  }

  toJSON() {
    const data = {
      nodes: this.nodes.get(),
      files: this.files.get(),
      tags: this.tags.get(),
      version: LIBRARY_VERSION
    };

    return JSON.stringify(data, (key, value) => {
      if (key == 'index' || key == 'parent' || key == 'depth') {
        return undefined;
      }

      return value;
    });
  }

  initialize(data: Library) {
    // Initialize parent
    for (const n of data.nodes) {
      LibraryModel.assignParent(n);
    }

    // Initialize nodeMap
    this.initializeNodeMap(data.nodes);

    // Initialize index
    let index = 0;

    for (const n of data.nodes) {
      index = LibraryModel.assignIndex(n, index);
    }

    // Initialize depth
    for (const n of data.nodes) {
      LibraryModel.assignDepth(n);
    }

    // Set members
    this.nodes.set(data.nodes ?? []);
    this.files.set(data.files ?? []);
    this.tags.set(data.tags ?? []);
  }


  // Handler

  save() {
    this.saveHandler.emit();
  }


  // Nodes

  static blankNodes() {
    return [
      {
        type: NodeType.Directory,
        id: ReservedID.Master,
        children: [] as Node[]
      } as DirectoryNode,
      {
        type: NodeType.Directory,
        id: ReservedID.Trash,
        children: [] as Node[]
      } as DirectoryNode
    ];
  }

  addNode(parent: Node | string, node: Node) {
    parent = this.getNodeIfNeeded(parent);

    if (node.type == NodeType.Directory) {
      if (this.findDirectory(parent, (node as DirectoryNode).name!) != undefined) {
        throw new Error(`Directory ${(node as DirectoryNode).name} already exists`);
      }
    }

    parent.children.push(node);

    // Set parent
    this.updateParent(node, parent);

    // Set index
    const prev = this.prevIndexNode(node);
    this.updateIndex(node, undefined, prev?.index! + 1);

    // Set depth
    this.updateDepth(node, parent.depth! + 1);

    // Put on map
    this.nodeMap.set(node.id, node);

    this.nodes.set(this.nodes.get()); // Explicitly update
    this.save();
  }

  addTextNode(text: string, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: TextNode = {
      type: NodeType.Text,
      content: [text],
      tags,
      created: timeStamp,
      modified: timeStamp,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  addImageNode(file: File, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: ImageNode = {
      type: NodeType.Image,
      fileID: file.id,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id,
      children: []
    };

    this.addFile(file);
    this.addNode(parent, node);
    return node;
  }

  addTextEmbedNode(file: File, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: TextEmbedNode = {
      type: NodeType.TextEmbed,
      fileID: file.id,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id,
      children: []
    };

    this.addFile(file);
    this.addNode(parent, node);
    return node;
  }

  addDirectoryNode(name: string, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: DirectoryNode = {
      type: NodeType.Directory,
      name: name,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id,
      children: []
    };

    this.addNode(parent, node);
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
    parent: Node | string,
    tags?: string[]) {
    const id = uuidv4();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: AnchorNode = {
      type: NodeType.Anchor,
      ...anchor,
      created: timeStamp,
      modified: timeStamp,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  addMathNode(exp: string, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4()

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: MathNode = {
      type: NodeType.Math,
      expression: exp,
      tags,
      created: timeStamp,
      modified: timeStamp,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  moveNodeBefore(node: string | Node, parent: string | Node, reference: string | Node | undefined = undefined) {
    node = this.getNodeIfNeeded(node);
    parent = this.getNodeIfNeeded(parent);
    reference = reference != undefined ? this.getNodeIfNeeded(reference) : undefined;

    if (node == parent) {
      throw new Error("Node cannot be moved into itself");
    }

    if (this.isDescendantOf(parent.id, node.id)) {
      throw new Error("Node cannot be moved into it's descendant");
    }

    if (reference != undefined && reference.parent != parent) {
      throw new Error("Reference node is invalid");
    }

    if (node.type == NodeType.Directory) {
      if (this.findDirectory(parent, (node as DirectoryNode).name!) != undefined) {
        throw new Error(`Directory ${(node as DirectoryNode).name} already exists`);
      }
    }

    const nodeIndex = node.index!;
    const referenceIndex = reference?.index ?? LibraryModel.getLastNodeOf(parent).index! + 1;

    // [begin, end) These nodes' indices will be updated
    let begin, end;

    // nodeIndex == referenceIndex means only indentation will change
    if (nodeIndex <= referenceIndex) {
      begin = this.nextIndexNode(LibraryModel.getLastNodeOf(node));
      end = reference;
    } else {
      begin = node;
      end = this.nextIndexNode(LibraryModel.getLastNodeOf(node));
    }

    arrayRemove(node.parent!.children, node.parent!.children.indexOf(node));
    arrayInsertBefore(parent.children, node, reference != undefined ?
      parent.children.indexOf(reference) :
      -1
    );

    // Set parent
    this.updateParent(node, parent);

    // Set index
    // begin == undefined if the last node's indentation has changed
    if (begin != undefined) {
      const prev = this.prevIndexNode(begin);
      this.updateIndex(begin, end, prev!.index! + 1);
    }

    // Set depth
    this.updateDepth(node, parent.depth! + 1);

    this.nodes.set(this.nodes.get());

    this.save();
  }

  removeNode(node: Node | string) {
    if (typeof node == 'string') {
      const n = this.getNode(node);

      if (n == undefined) {
        throw new Error();
      }

      node = n;
    }

    if (node.type == NodeType.Image) {
      this.removeFile((node as ImageNode).fileID);
    }

    if (node.type == NodeType.Anchor) {
      const fileID = (node as AnchorNode).contentImageFileID;

      if (fileID != null) {
        this.removeFile(fileID);
      }
    }

    arrayRemove(node.parent!.children, node.parent!.children.indexOf(node));
    const size = this.getSubTreeSize(node);

    // Update index
    for (const n of visit(this.nodes.get())) {
      if (n.index! > node.index!) {
        n.index! -= size;
      }
    }

    // Delete from map
    this.nodeMap.delete(node.id);

    this.nodes.set(this.nodes.get());
    this.save();
  }

  getSubTreeSize(node: Node) {
    let size = 1;

    for (const c of node.children) {
      size += this.getSubTreeSize(c);
    }

    return size;
  }

  getNode(id: string) {
    const node = this.nodeMap.get(id);

    if (node == undefined) {
      throw new Error(`Node ${id} not found`);
    }

    return node;
  }

  getNodeIfNeeded(node: string | Node) {
    if (typeof node == 'string') {
      return this.getNode(node);
    }

    return node;
  }

  // Deprecated
  getChildNodes(parentID: string) {
    return this.nodeMap.get(parentID)?.children;
  }

  // Deprecated
  getChildDirectories(parentID: string) {
    return this.nodeMap.get(parentID)?.children.filter(n => n.type == NodeType.Directory);
  }

  canMoveNode(node: string | Node, parent: string | Node) {
    node = this.getNodeIfNeeded(node);
    parent = this.getNodeIfNeeded(parent);

    return node != parent && !this.isDescendantOf(parent, node);
  }

  getReservedDirName(id: string) {
    if (id == ReservedID.Master) {
      return '/';
    }

    if (id == ReservedID.Trash) {
      return 'Trash';
    }

    return undefined;
  }

  getPath(directoryID: string): string {
    const reservedDirName = this.getReservedDirName(directoryID);

    if (reservedDirName != undefined) {
      return reservedDirName;
    }
    const node = this.getNode(directoryID);
    return this.getPath(node.parent?.id!) + (node as DirectoryNode).name + '/';
  }

  swapIndex(node1: string | Node, node2: string | Node) {
    node1 = this.getNodeIfNeeded(node1);
    node2 = this.getNodeIfNeeded(node2);

    const node1Next = this.nextSiblingNode(node1);
    const node2Next = this.nextSiblingNode(node2);

    if (node1Next == node2) {
      this.moveNodeBefore(node2, node1.parent!, node1);
      return;
    }

    if (node2Next == node1) {
      this.moveNodeBefore(node1, node2.parent!, node2);
      return;
    }

    this.moveNodeBefore(node1, node2.parent!, node2);
    this.moveNodeBefore(node2, node1Next?.parent!, node1Next?.id!);
  }

  nextSiblingNode(id: string | Node) {
    const node = this.getNodeIfNeeded(id);

    if (node.parent == undefined) {
      return undefined;
    }

    const index = node.parent.children.indexOf(node);

    if (index == node.parent.children.length - 1) {
      return undefined;
    }

    return node.parent.children[index + 1];
  }

  prevSiblingNode(id: string | Node) {
    const node = this.getNodeIfNeeded(id);
    const index = node.parent!.children.indexOf(node);

    if (index == 0) {
      return undefined;
    }

    return node.parent!.children[index - 1];
  }

  nextIndexNode(node: string | Node) {
    node = this.getNodeIfNeeded(node);

    if (node.children[0] != undefined) {
      return node.children[0];
    }

    let n: Node | undefined = node;

    while (this.nextSiblingNode(n) == undefined) {
      n = n?.parent;

      if (n == undefined) {
        return undefined;
      }
    }

    return this.nextSiblingNode(n);
  }

  prevIndexNode(node: string | Node) {
    node = this.getNodeIfNeeded(node);
    const prevSibling = this.prevSiblingNode(node);

    if (prevSibling == undefined) {
      return node.parent;
    }

    return LibraryModel.getLastNodeOf(prevSibling);
  }

  updateParent(node: Node, parent: Node) {
    node.parent = parent;

    for (const c of node.children) {
      this.updateParent(c, node);
    }
  }

  updateDepth(node: Node, depth: number) {
    node.depth = depth;

    for (const c of node.children) {
      this.updateDepth(c, depth + 1);
    }
  }

  updateIndex(begin: Node, end: Node | undefined, base: number) {
    let n: Node | undefined = begin;

    while (n != end) {
      n!.index = base;
      base++;
      n = this.nextIndexNode(n!);
    }
  }

  static getLastNodeOf(node: Node): Node {
    if (node.children.length == 0) {
      return node;
    }

    return this.getLastNodeOf(node.children.at(-1)!);
  }

  async changeNodeType(node: Node | string, type: NodeType) {
    node = this.getNodeIfNeeded(node);

    if (node.type == NodeType.Text) {
      if (type == NodeType.Heading || type == NodeType.Quote) {
        node.type = type;
        await this.updateModified(node);
        this.nodes.set(this.nodes.get());
        this.save();
      }
    } else if (node.type == NodeType.Heading) {
      if (type == NodeType.Text || type == NodeType.Quote) {
        node.type = type;
        await this.updateModified(node);
        this.nodes.set(this.nodes.get());
        this.save();
      }
    } else if (node.type == NodeType.Quote) {
      if (type == NodeType.Text || type == NodeType.Heading) {
        node.type = type;
        await this.updateModified(node);
        this.nodes.set(this.nodes.get());
        this.save();
      }
    }
  }

  async updateModified(node: Node) {
    node.modified = Timestamp.fromNs(await bridge.now());
    this.nodes.set(this.nodes.get());
    this.save();
  }

  async setListStyle(node: Node | string, listStyle: ListStyle | undefined) {
    node = this.getNodeIfNeeded(node);
    node.list = listStyle;
    await this.updateModified(node);
    this.nodes.set(this.nodes.get());
    this.save();
  }

  getParentIndex(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.parent?.children.indexOf(node);
  }

  // Nodes / Types

  isText(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.Text;
  }

  isImage(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.Image;
  }

  isAnchor(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.Anchor;
  }

  isDirectory(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.Directory;
  }

  isTextEmbed(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.TextEmbed;
  }

  isMath(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.Math;
  }

  isHeading(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.Heading;
  }

  isQuote(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.Quote;
  }


  // Files

  addFile(file: File) {
    this.files.get().push(file);

    this.files.set(this.files.get());
    this.save();
  }

  removeFile(fileID: string) {
    const found = this.files.get().findIndex(f => f.id == fileID);
    bridge.removeFile(this.files.get()[found].id);

    const files = this.files.get();
    files.splice(files.findIndex(f => f.id == fileID), 1);

    this.files.set(this.files.get());
    this.save();
  }

  getFile(fileID: string) {
    const found = this.files.get().find(f => f.id == fileID);
    return found;
  }

  getHeadingDepth(node: Node | undefined): number {
    if (node == undefined) {
      return 0;
    }

    if (this.isHeading(node)) {
      return this.getHeadingDepth(node.parent) + 1;
    }

    return this.getHeadingDepth(node.parent);
  }


  // Tags

  createTag(name: string) {
    const id = uuidv4();

    this.tags.get().push({ id, name });

    this.tags.set(this.tags.get());
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
    const node = this.getNode(id);

    if (node.tags == undefined) {
      node.tags = [tagID];
    } else {
      if (!node.tags.includes(tagID)) {
        node.tags.push(tagID);
      }
    }

    this.nodes.set(this.nodes.get());
    this.save();
  }

  removeTag(id: string) {
    // TODO
  }


  // Directories

  findDirectory(parent: string | Node, name: string) {
    return this.getNodeIfNeeded(parent).children.find(n =>
      n.type == NodeType.Directory &&
      (n as DirectoryNode).name?.localeCompare(name, undefined, { sensitivity: 'accent' }) == 0
    );
  }

  async createDirectory(path: string) {
    const dirs = path.split('/').filter(d => d.length > 0);
    let parentID: string = ReservedID.Master;

    for (const dir of dirs) {
      const found = this.findDirectory(parentID, dir);

      if (found == null) {
        parentID = this.addDirectoryNode(dir, Timestamp.fromNs(await bridge.now()), this.getNode(parentID) as DirectoryNode).id;
      } else {
        parentID = found.id;
      }
    }

    return parentID;
  }

  // Returns true if target is a descendant of parent
  isDescendantOf(target: string | Node, parent: string | Node) {
    target = this.getNodeIfNeeded(target);
    parent = this.getNodeIfNeeded(parent);

    let d: Node | undefined = this.getNodeIfNeeded(target);

    while (d != undefined) {
      d = d.parent;

      if (d == parent) {
        return true;
      }
    }

    return false;
  }


  // Memoization

  static assignIndex(node: Node, base = 0) {
    node.index = base;
    base++;

    for (const child of node.children) {
      base = LibraryModel.assignIndex(child, base);
    }

    return base;
  }

  static assignDepth(node: Node, depth = 0) {
    node.depth = depth;

    for (const child of node.children) {
      LibraryModel.assignDepth(child, depth + 1);
    }
  }

  static assignParent(node: Node) {
    for (const child of node.children) {
      child.parent = node;
      LibraryModel.assignParent(child);
    }
  }

  initializeNodeMap(nodes: Node[]) {
    this.nodeMap.clear();

    for (const n of visit(nodes)) {
      this.nodeMap.set(n.id, n);
    }
  }
}