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
  const [writeOnly, setWriteOnly] = React.useState<boolean>(true);
  const composing = React.useRef<boolean>(false);

  React.useEffect(() => {
    console.log(localStorage.getItem('notes'))
    if (localStorage.getItem('notes') != null) {
      const notes = JSON.parse(localStorage.getItem('notes')!) as Note[];
      setNotes(notes);
    }
  }, []);

  const notesReversed = [...notes];
  notesReversed.reverse();

  function confirm() {
    const newNotes = [...notes];
    const now = new Date();
    newNotes.push({ content: input, created: now, modified: now, id: uuidv4() });
    setNotes(newNotes);
    localStorage.setItem('notes', JSON.stringify(newNotes));
    setInput('');
  }

  return <>
    <div className='input'>
      <textarea onChange={e => setInput(e.target.value)} onKeyDown={e => {
        if (e.key == 'Enter' && !composing.current) {
          confirm();
        }
      }} onCompositionStart={e=>{
        composing.current = true;
      }} onCompositionEnd={e=>{
        composing.current = false;
      }} value={input} />
      <button onClick={e => confirm()}>Confirm</button>
      <input checked={writeOnly} type="checkbox" id="write-only" onChange={e => {
        setWriteOnly(e.target.checked);
      }} />
      <label htmlFor="write-only">Write-only</label>
    </div>
    {writeOnly ? null : <table>
      <tbody>
        {notesReversed.map(n => {
          const id = n.id;

          return <tr key={id}><td>{n.content}</td><td><button onClick={e => {
            const newNotes = [...notes];
            newNotes.splice(newNotes.findIndex(n => n.id == id), 1);
            setNotes(newNotes);
            localStorage.setItem('notes', JSON.stringify(newNotes));
          }}>x</button></td></tr>;
        })}
      </tbody>
    </table>}
  </>;
}