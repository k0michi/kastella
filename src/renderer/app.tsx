import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

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
  const [search, setSearch] = React.useState<string>('');

  React.useEffect(() => {
    bridge.readNote().then((c: string) => {
      const notes = JSON.parse(c, (key, value)=>{
        if (key == 'created' || key == 'modified') {
          return new Date(value);
        }

        return value;
      }) as Note[];
      setNotes(notes);
    }).catch(e => {
      setNotes([]);
    });
  }, []);

  const notesReversed = [...notes];
  notesReversed.reverse();

  function confirm() {
    const newNotes = [...notes];
    const now = new Date();
    newNotes.push({ content: input, created: now, modified: now, id: uuidv4() });
    setNotes(newNotes);
    setInput('');
    bridge.writeNote(JSON.stringify(newNotes));
  }

  return <>
    <div id='input'>
      <textarea onChange={e => setInput(e.target.value)} onKeyDown={e => {
        if (e.key == 'Enter' && !composing.current) {
          e.preventDefault();
          confirm();
        }
      }} onCompositionStart={e => {
        composing.current = true;
      }} onCompositionEnd={e => {
        composing.current = false;
      }} value={input} />
      <button onClick={e => confirm()}>Confirm</button>
      <input checked={writeOnly} type="checkbox" id="write-only" onChange={e => {
        setWriteOnly(e.target.checked);
      }} />
      <label htmlFor="write-only">Write-only</label>
    </div>
    <div>
      <textarea onChange={e => setSearch(e.target.value)} value={search} />
    </div>
    {writeOnly ? null : <div id="notes">
        {notesReversed.filter(n => search.length > 0 ? n.content.includes(search) : true).map(n => {
          const id = n.id;

          return <div key={id}>
            <span>{n.content}</span>{' '}
            <span className='date'>{dateToString(n.created)}</span>{' '}
            <button onClick={e => {
            const newNotes = [...notes];
            newNotes.splice(newNotes.findIndex(n => n.id == id), 1);
            setNotes(newNotes);
            bridge.writeNote(JSON.stringify(newNotes));
          }}>x</button></div>;
        })}
    </div>}
  </>;
}

function dateToString(date: Date) {
  return format(date, 'yyyy/MM/dd HH:mm:ss');
}