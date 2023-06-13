import { Observable } from "kyoka";
import { v4 as uuidv4 } from 'uuid';
import { findStringIgnoreCase, round } from "./utils";
import { AnchorNode, File, Node, NodeType, ReservedID, TextNode } from "./node";
import LibraryModel from "./library-model";
import mime from "mime";
import Timestamp from "./timestamp";
import { inlineNodeToString, visit } from "./tree";
import { DateTimeFormatter } from "@js-joda/core";
// import { validateLibrary } from "./validate";

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
  parentID: string;
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

export interface Chunk {
  nodes: Node[];
}

export interface Range {
  first: number;
  last: number;
}

export default class Model {
  library: LibraryModel;

  view = new Observable<View | undefined>(undefined);
  saving = new Observable<boolean>(false);
  writeOnly = new Observable<boolean>(true);
  lineNumberVisibility = new Observable<boolean>(true);
  dateVisibility = new Observable<boolean>(false);
  search = new Observable<string>('');
  savePromise: Promise<void> | null = null;
  status = new Observable<Status | undefined>(undefined);
  saveSchedule: number | undefined;
  selected = new Observable<string | undefined>(undefined);
  hovered = new Observable<string | undefined>(undefined);
  atBottom = new Observable<boolean>(true);
  input = new Observable<string>('');
  flattened = new Observable<Node[]>([]);
  // Nodes that are intersecting with the visible area
  range = new Observable<Range>({
    first: 0,
    last: 0
  });
  unsaved = new Observable<boolean>(false);

  constructor() {
    this.library = new LibraryModel();
    this.changeView({ type: ViewType.Directory, parentID: ReservedID.Master } as DirectoryView);

    this.saveLibrary = this.saveLibrary.bind(this);
    this.updateNodes = this.updateNodes.bind(this);
    this.library.saveHandler.on(this.saveLibrary);
    this.library.updateHandler.on(this.updateNodes);
  }

  destruct() {
    this.library.saveHandler.off(this.saveLibrary);
    this.library.updateHandler.off(this.updateNodes);
  }


  // Import

  async importImageFile(filePath: string) {
    const mimeType = mime.getType(filePath);
    const accessed = Timestamp.fromNs(await bridge.now());
    const modified = Timestamp.fromNs(await bridge.getMTime(filePath));
    const id = uuidv4();
    await bridge.copyFile(id, filePath);
    const basename = await bridge.basename(filePath);
    const image = {
      id,
      name: basename,
      type: mimeType,
      accessed,
      modified
    } as File;

    const parentID = this.getViewDirectory();
    const tagIDs = this.getViewTags();

    this.library.addImageNode(image, accessed, parentID, tagIDs);
  }

  async importTextFile(filePath: string) {
    const mimeType = mime.getType(filePath);
    const accessed = Timestamp.fromNs(await bridge.now());
    const modified = Timestamp.fromNs(await bridge.getMTime(filePath));
    const id = uuidv4();
    await bridge.copyFile(id, filePath);
    const basename = await bridge.basename(filePath);
    const image = {
      id,
      name: basename,
      type: mimeType,
      accessed,
      modified
    } as File;

    const parentID = this.getViewDirectory();
    const tagIDs = this.getViewTags();

    this.library.addCodeNode(image, accessed, parentID, tagIDs);
  }


  // Views

  changeView(view: View) {
    this.view.set(view);
    this.updateNodes();
  }

  setSearch(search: string) {
    this.search.set(search);
    this.updateNodes();
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

  setViewRange(range: Range) {
    this.range.set(range);
  }

  getViewDirectory() {
    const view = this.view.get();

    if (view != null && view.type == ViewType.Directory) {
      return (view as DirectoryView).parentID;
    }

    return ReservedID.Master;
  }

  getViewTags() {
    const view = this.view.get();

    if (view != null && view.type == ViewType.Tag) {
      return [(view as TagView).tag];
    }

    return [];
  }

  setSelected(id: string | undefined) {
    this.selected.set(id);
  }

  setHovered(id: string | undefined) {
    this.hovered.set(id);
  }

  setInput(string: string) {
    this.input.set(string);
  }

  setAtBottom(atBottom: boolean) {
    this.atBottom.set(atBottom);
  }

  updateNodes() {
    const view = this.view.get();
    const search = this.search.get();
    let filtered;

    if (view?.type == ViewType.Directory) {
      let parent = this.library.getNode((view as DirectoryView).parentID);
      filtered = parent?.children!;
    } else {
      filtered = this.library.getNode(ReservedID.Master)?.children!;
    }

    if (search.length > 0) {
      filtered = filtered.filter(n =>
        n.type == NodeType.Text && findStringIgnoreCase(inlineNodeToString((n as TextNode).content), search) ||
        (n.type == NodeType.Anchor &&
          findStringIgnoreCase((n as AnchorNode).contentTitle, search) ||
          findStringIgnoreCase((n as AnchorNode).contentDescription, search) ||
          findStringIgnoreCase((n as AnchorNode).contentURL, search)
        )
      );
    }

    if (view?.type == ViewType.Tag) {
      filtered = filtered.filter(n => n.tags?.includes((view as TagView).tag));
    }

    if (view?.type == ViewType.Date) {
      filtered = filtered.filter(n => n.created!.asZonedDateTime().format(DateTimeFormatter.ISO_LOCAL_DATE) == (view as DateView).date);
    }

    const flattened = [...visit(filtered)];
    this.flattened.set(flattened);
  }


  // File System

  async loadLibrary() {
    const json = await bridge.readLibrary();
    this.library.initializeFromJSON(json);
  }

  async saveLibrary() {
    const delay = 2 * 1000;
    this.saveSchedule = Date.now() + delay;
    bridge.setEdited(true);
    this.unsaved.set(true);

    const save = (() => {
      this.saving.set(true);
      this.setStatus('Saving...');

      const start = performance.now();
      const json = this.library.toJSON();

      this.savePromise = bridge.writeLibrary(json).then((() => {
        const end = performance.now();
        this.savePromise = null;
        this.saving.set(false);
        this.unsaved.set(false);

        const elapsed = end - start;
        this.setStatusFor(`Saved! (${round(elapsed, 2)} ms)`);
        bridge.setEdited(false);
      }).bind(this));
    }).bind(this);

    const timeout = (() => {
      const now = Date.now();

      if (this.saveSchedule == undefined) {
        return;
      }

      if (now >= this.saveSchedule) {
        save();
      }
    }).bind(this);

    setTimeout(timeout, delay);
  }


  // Status

  setStatus(message: string) {
    const id = uuidv4();
    this.status.set({ id, message });
    return id;
  }

  setStatusFor(message: string, duration: number = 5 * 1000) {
    const statusID = this.setStatus(message);

    setTimeout((() => {
      if (this.status.get()?.id == statusID) {
        this.clearStatus();
      }
    }).bind(this), duration);
  }

  clearStatus() {
    this.status.set(undefined);
  }
}