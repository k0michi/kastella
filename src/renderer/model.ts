import { Observable } from "kyoka";
import produce from 'immer';

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
}

export interface Image {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export default class Model {
  notes = new Observable<Note[]>([]);

  constructor() {

  }

  loadNotes() {
    bridge.readNote().then((c: string) => {
      const notes = JSON.parse(c, (key, value) => {
        if (key == 'created' || key == 'modified') {
          return new Date(value);
        }

        return value;
      }) as Note[];
      this.notes.set(notes);
    });
  }

  addNote(note: Note) {
    const newNotes = produce(this.notes.get(), n => {
      n.push(note);
    });

    this.notes.set(newNotes);
    bridge.writeNote(JSON.stringify(newNotes));
  }

  removeNote(id: string) {
    const newNotes = produce(this.notes.get(), n => {
      n.splice(n.findIndex(n => n.id == id), 1);
    });

    this.notes.set(newNotes);
    bridge.writeNote(JSON.stringify(newNotes));
  }
}