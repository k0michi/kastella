import { Observable } from "kyoka";
import produce from 'immer';
import { v4 as uuidv4 } from 'uuid';

export enum Type {
  Text = 'text',
  Image = 'image'
}

export interface Note {
  id: string;
  type?: string;
  content: string | Image;
  created: Date;
  modified: Date;
  tags?: string[];
}

export interface Image {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Data {
  notes: Note[];
  tags: Tag[];
}

export interface View {
  type: 'directory' | 'tag' | 'date';
}

export interface DirectoryView extends View {
  type: 'directory';
  path: string;
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
  notes = new Observable<Note[]>([]);
  tags = new Observable<Tag[]>([]);
  view = new Observable<View | undefined>(undefined);

  constructor() {
  }

  loadNotes() {
    bridge.readNote().then((c: string) => {
      const data = JSON.parse(c, (key, value) => {
        if (key == 'created' || key == 'modified') {
          return new Date(value);
        }

        return value;
      }) as Data;

      this.notes.set(data.notes ?? []);
      this.tags.set(data.tags ?? []);
    });
  }

  addNote(text: string, tags: string[] | undefined) {
    const now = new Date();
    const id = uuidv4();

    if (tags?.length == 0) {
      tags = undefined;
    }

    const newNotes = produce(this.notes.get(), n => {
      n.push({ content: text, tags, created: now, modified: now, id });
    });

    this.notes.set(newNotes);
    this.save();
  }

  addImageNote(image: Image) {
    const now = new Date();
    const id = uuidv4()

    const newNotes = produce(this.notes.get(), n => {
      n.push({ type: Type.Image, content: image, created: now, modified: now, id });
    });

    this.notes.set(newNotes);
    this.save();
  }

  removeNote(id: string) {
    const newNotes = produce(this.notes.get(), n => {
      n.splice(n.findIndex(n => n.id == id), 1);
    });

    this.notes.set(newNotes);
    this.save();
  }

  removeImageNote(id: string) {
    const found = this.notes.get().findIndex(n => n.id == id);
    bridge.removeFile((this.notes.get()[found].content as Image).id);

    const newNotes = produce(this.notes.get(), n => {
      n.splice(n.findIndex(n => n.id == id), 1);
    });

    this.notes.set(newNotes);
    this.save();
  }

  addTag(name: string) {
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

  async save() {
    await bridge.writeNote(JSON.stringify({
      notes: this.notes.get(),
      tags: this.tags.get()
    }));
  }

  changeView(view: View | undefined) {
    this.view.set(view);
  }

  createDirectory(path: string) {
    const dirs = path.split('/').filter(d => d.length > 0);
    // TODO

  }
}