import { Observable } from "kyoka";
import { v4 as uuidv4 } from 'uuid';
import { round } from "./utils";
import { ReservedID } from "./node";
import LibraryModel from "./library-model";
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
  intersecting = new Observable<Set<string>>(new Set());
  saveSchedule: number | undefined;

  constructor() {
    this.changeView({ type: ViewType.Directory, parentID: ReservedID.Master } as DirectoryView);
    this.library = new LibraryModel();

    this.saveLibrary = this.saveLibrary.bind(this);
    this.library.saveHandler.on(this.saveLibrary);
  }

  destruct() {
    this.library.saveHandler.off(this.saveLibrary);
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

    return ReservedID.Master;
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
    const json = await bridge.readLibrary();
    this.library.initializeFromJSON(json);
  }

  async saveLibrary() {
    const delay = 2 * 1000;
    this.saveSchedule = Date.now() + delay;

    const save = (() => {
      this.saving.set(true);
      this.setStatus('Saving...');

      const start = performance.now();
      const json = this.library.toJSON();

      this.savePromise = bridge.writeLibrary(json).then((() => {
        const end = performance.now();
        this.savePromise = null;
        this.saving.set(false);

        const elapsed = end - start;
        const statusID = this.setStatus(`Saved! (${round(elapsed, 2)} ms)`);
  
        setTimeout((() => {
          if (this.status.get()?.id == statusID) {
            this.clearStatus();
          }
        }).bind(this), 5 * 1000);
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

  clearStatus() {
    this.status.set(undefined);
  }
}