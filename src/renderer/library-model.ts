import { Observable } from "kyoka";
import { v4 as uuidv4 } from 'uuid';
import Timestamp from "./timestamp";
import { arrayInsertBefore, arrayRemove, round } from "./utils";
import { Version10, Version11, Version14, Version15, Version16, Version5, Version9 } from "./compat";
import { visit } from "./tree";
import { AnchorNode, DirectoryNode, File, ImageNode, ItemStyle as ListStyle, MathNode, Node, NodeType, ReservedID, Tag, CodeNode, TextNode, CanvasNode, InlineNode, Instance } from "./node";
import EventHandler from "./event-handler";
import chroma from "chroma-js";

export const LIBRARY_VERSION = 17;

export interface Library {
  nodes: Node;
  files: File[];
  tags: Tag[];
  instances: Instance[];
  version: number;
}

export default class LibraryModel {
  nodes = new Observable<Node>(LibraryModel.blankTree()); // mutable
  files = new Observable<File[]>([]); // mutable
  tags = new Observable<Tag[]>([]); // mutable
  instances = new Observable<Instance[]>([]); // mutable
  nodeMap = new Map<string, Node>();
  saveHandler = new EventHandler();
  updateHandler = new EventHandler();

  constructor() {
    this.initialize({
      nodes: LibraryModel.blankTree(),
      files: [],
      tags: [],
      instances: [],
      version: LIBRARY_VERSION
    });
  }

  migrateLibrary(data: any) {
    if (data.version <= 5) {
      console.log(`Migrating from version 5...`);
      data = Version5.convert(data);
    }

    if (data.version <= 9) {
      console.log(`Migrating from version 9...`);
      data = Version9.convert(data);
    }

    if (data.version <= 10) {
      console.log(`Migrating from version 10...`);
      data = Version10.convert(data);
    }

    if (data.version <= 11) {
      console.log(`Migrating from version 11...`);
      data = Version11.convert(data);
    }

    if (data.version <= 14) {
      console.log(`Migrating from version 14...`);
      data = Version14.convert(data);
    }

    if (data.version <= 15) {
      console.log(`Migrating from version 15...`);
      data = Version15.convert(data);
    }

    if (data.version <= 16) {
      console.log(`Migrating from version 16...`);
      data = Version16.convert(data);
    }

    if (data.version > LIBRARY_VERSION) {
      throw new Error(`Library version ${data.version} is not compatible with application version`);
    }

    return data as Library;
  }

  initializeFromJSON(json: string) {
    let data = JSON.parse(json, (key, value) => {
      if (key == 'created' || key == 'modified' || key == 'accessed' || key == 'contentModified' || key == 'contentAccessed') {
        return new Timestamp(value);
      }

      return value;
    });

    // validateLibrary(data);

    // Migrate older format
    data = this.migrateLibrary(data);

    this.initialize(data);
  }

  toJSON() {
    const data = {
      nodes: this.nodes.get(),
      files: this.files.get(),
      tags: this.tags.get(),
      instances: this.instances.get(),
      version: LIBRARY_VERSION
    };

    return JSON.stringify(data, (key, value) => {
      if (key == 'index' || key == 'parent' || key == 'depth') {
        return undefined;
      }

      return value;
    });
  }

  async initialize(data: Library) {
    // Initialize parent
    LibraryModel.assignParent(data.nodes);

    // Initialize nodeMap
    this.initializeNodeMap(data.nodes);

    // Initialize index
    let index = 0;

    index = LibraryModel.assignIndex(data.nodes, index);

    // Initialize depth
    LibraryModel.assignDepth(data.nodes);

    // Set members
    this.nodes.set(data.nodes);
    this.files.set(data.files);
    this.tags.set(data.tags);
    this.instances.set(data.instances);

    // FIXME: These functions may be called even after another library is loaded. This should be canceled.
    await this.registerInstanceIfNeeded();
    await this.updateInstanceInfo();
    this.update();
  }


  // Handler

  save() {
    this.saveHandler.emit();
    this.update();
  }

  update() {
    this.updateHandler.emit();
  }


  // Nodes

  static blankTree() {
    return {
      type: NodeType.Directory,
      id: ReservedID.Root,
      children:
        [
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
        ] as Node[]
    }
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

  async addTextNode(text: string, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4();
    const instanceID = await this.getThisInstanceID();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: TextNode = {
      type: NodeType.Text,
      content: [text],
      tags,
      created: timeStamp,
      modified: timeStamp,
      createdBy: instanceID,
      modifiedBy: instanceID,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  async addTextNodeWithFormat(text: InlineNode | (InlineNode | string)[], timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    if (!Array.isArray(text)) {
      text = [text];
    }

    const id = uuidv4();
    const instanceID = await this.getThisInstanceID();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: TextNode = {
      type: NodeType.Text,
      content: text,
      tags,
      created: timeStamp,
      modified: timeStamp,
      createdBy: instanceID,
      modifiedBy: instanceID,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  async addImageNode(file: File, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4();
    const instanceID = await this.getThisInstanceID();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: ImageNode = {
      type: NodeType.Image,
      fileID: file.id,
      tags,
      created: timeStamp,
      modified: timeStamp,
      createdBy: instanceID,
      modifiedBy: instanceID,
      id,
      children: []
    };

    this.addFile(file);
    this.addNode(parent, node);
    return node;
  }

  async addCodeNode(file: File, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4();
    const instanceID = await this.getThisInstanceID();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: CodeNode = {
      type: NodeType.Code,
      fileID: file.id,
      tags,
      created: timeStamp,
      modified: timeStamp,
      createdBy: instanceID,
      modifiedBy: instanceID,
      id,
      children: []
    };

    this.addFile(file);
    this.addNode(parent, node);
    return node;
  }

  async addDirectoryNode(name: string, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4();
    const instanceID = await this.getThisInstanceID();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: DirectoryNode = {
      type: NodeType.Directory,
      name: name,
      tags,
      created: timeStamp,
      modified: timeStamp,
      createdBy: instanceID,
      modifiedBy: instanceID,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  async addAnchorNode(anchor: {
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
    const instanceID = await this.getThisInstanceID();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: AnchorNode = {
      type: NodeType.Anchor,
      ...anchor,
      created: timeStamp,
      modified: timeStamp,
      createdBy: instanceID,
      modifiedBy: instanceID,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  async addMathNode(exp: string, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4();
    const instanceID = await this.getThisInstanceID();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: MathNode = {
      type: NodeType.Math,
      expression: exp,
      tags,
      created: timeStamp,
      modified: timeStamp,
      createdBy: instanceID,
      modifiedBy: instanceID,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  async addCanvasNode(fileID: string, previewFileID: string, timeStamp: Timestamp, parent: Node | string, tags?: string[]) {
    const id = uuidv4();
    const instanceID = await this.getThisInstanceID();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const node: CanvasNode = {
      type: NodeType.Canvas,
      fileID,
      previewFileID,
      tags,
      created: timeStamp,
      modified: timeStamp,
      createdBy: instanceID,
      modifiedBy: instanceID,
      id,
      children: []
    };

    this.addNode(parent, node);
    return node;
  }

  moveNodeBefore(node: string | Node, parent: string | Node, reference: string | Node | undefined = undefined) {
    console.log(`moveNodeBefore(${node},${parent},${reference})`);
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

    console.log('updated nodeIndex', nodeIndex);

    // Set depth
    this.updateDepth(node, parent.depth! + 1);

    this.nodes.set(this.nodes.get());
    this.save();
  }

  // node: Node or node id
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

  // Returns the node under n with maximum index
  getLastNode(n: Node) {
    let m: Node | undefined = n;

    while (m?.children.at(-1) != null) {
      m = m.children.at(-1);
    }

    return m;
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

  isCode(node: Node | string) {
    node = this.getNodeIfNeeded(node);
    return node.type == NodeType.Code;
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

  createTag(name: string, color?: string) {
    if (this.findTag(name) != null) {
      throw new Error(`Tag '${name}' already exists`);
    }

    const id = uuidv4();

    this.tags.get().push({ id, name, color: color ?? chroma.random().hex() });

    this.tags.set(this.tags.get());
    this.save();
    return id;
  }

  setTagName(id: string, name: string) {
    const tag = this.getTag(id);

    if (tag == null) {
      throw new Error('Tag not found');
    }

    tag.name = name;
    this.tags.set(this.tags.get());
    this.save();
  }

  setTagColor(id: string, color: string) {
    const tag = this.getTag(id);

    if (tag == null) {
      throw new Error('Tag not found');
    }

    tag.color = color;
    this.tags.set(this.tags.get());
    this.save();
  }

  findTag(name: string) {
    return this.tags.get().find(t => compareTag(t.name, name) == 0);
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

  // Remove all tag reference and the tag
  removeTag(id: string) {
    for (const n of visit(this.nodes.get())) {
      if (n.tags != null) {
        const found = n.tags.findIndex(t => t == id);
        arrayRemove(n.tags, found);
      }
    }

    const found = this.tags.get().findIndex(t => t.id == id);
    arrayRemove(this.tags.get(), found);
    this.tags.set(this.tags.get());
    this.nodes.set(this.nodes.get());
    this.save();
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
        parentID = (await this.addDirectoryNode(dir, Timestamp.fromNs(await bridge.now()), this.getNode(parentID) as DirectoryNode)).id;
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


  // Instances

  async getThisInstanceID() {
    return await bridge.getInstanceID();
  }

  async registerInstanceIfNeeded() {
    const id = await this.getThisInstanceID();
    const hostname = await bridge.getHostname();
    const username = await bridge.getUsername();
    const now = await Timestamp.now();

    if (this.getInstance(id) == undefined) {
      this.instances.get().push({
        id,
        hostname: hostname,
        username: username,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async updateInstanceInfo() {
    const instance = this.getInstance(await this.getThisInstanceID());

    if (instance == undefined) {
      throw new Error('Instance not found');
    }

    instance.hostname = await bridge.getHostname();
    instance.username = await bridge.getUsername();
    instance.updatedAt = await Timestamp.now();
    this.instances.set(this.instances.get());
  }

  getInstance(id: string) {
    return this.instances.get().find(d => d.id == id);
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

  initializeNodeMap(nodes: Node) {
    this.nodeMap.clear();

    for (const n of visit(nodes)) {
      this.nodeMap.set(n.id, n);
    }
  }
}

function compareTag(tag1: string, tag2: string) {
  return tag1.localeCompare(tag2, undefined, { sensitivity: 'accent' });
}