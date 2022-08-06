import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Note {
  id: string;
  content: string;
  created: Date;
  modified: Date;
}

export default function App() {
  const [input, setInput] = React.useState<string>('');
  const [notes, setNotes] = React.useState<Note[]>([]);

  React.useEffect(() => {
    console.log(localStorage.getItem('notes'))
    if (localStorage.getItem('notes') != null) {
      const notes = JSON.parse(localStorage.getItem('notes')!) as Note[];
      setNotes(notes);
    }
  }, []);

  const notesReversed = [...notes];
  notesReversed.reverse();

  return <>
    <div className='input'>
      <textarea onChange={e => setInput(e.target.value)} value={input} />
      <button onClick={e => {
        const newNotes = [...notes];
        const now = new Date();
        newNotes.push({ content: input, created: now, modified: now, id: uuidv4() });
        setNotes(newNotes);
        localStorage.setItem('notes', JSON.stringify(newNotes));
        setInput('');
      }}>Confirm</button>
    </div>
    <table>
      <tbody>
        {notesReversed.map(n => {
          const id = n.id;

          return <tr key={id}><td>{n.content}</td><td><button onClick={e => {
            const newNotes = [...notes];
            newNotes.splice(newNotes.findIndex(n=>n.id == id), 1);
            setNotes(newNotes);
            localStorage.setItem('notes', JSON.stringify(newNotes));
          }}>x</button></td></tr>;
        })}
      </tbody>
    </table>
  </>;
}