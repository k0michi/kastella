import { useModel, useObservable } from 'kyoka';
import * as React from 'react';
import Model, { DateView, DirectoryView, TagView, View } from './model';

export default function EditorBar() {
  const model = useModel<Model>();
  const writeOnly = useObservable(model.writeOnly);
  const search = useObservable(model.search);
  const view = useObservable(model.view);

  return <div id='editor-bar'>
    <div className='editor-bar-section'>
      {
        view.type == 'directory' ?
          `${model.getPath((view as DirectoryView).parentID!)}`
          : view.type == 'tag' ?
            `#${model.getTag((view as TagView).tag)?.name}`
            : view.type == 'date' ?
              `@${(view as DateView).date}`
              : null
      }
    </div>
    <div className='editor-bar-section'>
      <div className='checkbox'>
        <input checked={writeOnly} type="checkbox" id="write-only" onChange={e => {
          model.setWriteOnly(e.target.checked);
        }} />
        <label htmlFor="write-only">Write-only</label>
      </div>
      <textarea rows={1} onChange={e => model.setSearch(e.target.value)} value={search} />
    </div>
  </div>;
}