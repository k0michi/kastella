import { useModel, useObservable } from 'kyoka';
import * as React from 'react';
import Model from './model';

export default function EditorBar() {
  const model = useModel<Model>();
  const writeOnly = useObservable(model.writeOnly);
  const search = useObservable(model.search);

  return <div id='editor-bar'>
    <div className='checkbox'>
      <input checked={writeOnly} type="checkbox" id="write-only" onChange={e => {
        model.setWriteOnly(e.target.checked);
      }} />
      <label htmlFor="write-only">Write-only</label>
    </div>
    <textarea rows={1} onChange={e => model.setSearch(e.target.value)} value={search} />
  </div>;
}