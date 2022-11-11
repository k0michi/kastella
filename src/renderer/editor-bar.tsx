import { useModel, useObservable } from 'kyoka';
import * as React from 'react';
import Model, { DateView, DirectoryView, TagView, View, ViewType } from './model';

export default function EditorBar() {
  const model = useModel<Model>();
  const writeOnly = useObservable(model.writeOnly);
  const lineNumberVisibility = useObservable(model.lineNumberVisibility);
  const dateVisibility = useObservable(model.dateVisibility);
  const search = useObservable(model.search);
  const view = useObservable(model.view);

  return <div id='editor-bar'>
    <div className='editor-bar-section'>
      {
        view.type == ViewType.Directory ?
          `${model.getPath((view as DirectoryView).parentID!)}`
          : view.type == ViewType.Tag ?
            `#${model.getTag((view as TagView).tag)?.name}`
            : view.type == ViewType.Date ?
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
      <div className='checkbox'>
        <input checked={lineNumberVisibility} type="checkbox" id="line-number-visibility" onChange={e => {
          model.setLineNumberVisibility(e.target.checked);
        }} />
        <label htmlFor="line-number">Line number</label>
      </div>
      <div className='checkbox'>
        <input checked={dateVisibility} type="checkbox" id="date-visibility" onChange={e => {
          model.setDateVisibility(e.target.checked);
        }} />
        <label htmlFor="date-visibility">Date</label>
      </div>
      <textarea rows={1} onChange={e => model.setSearch(e.target.value)} value={search} />
    </div>
  </div>;
}