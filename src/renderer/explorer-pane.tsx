import * as React from 'react';
import { useModel, useObservable } from 'kyoka';
import Model, { DateView, DirectoryNode, DirectoryView, Node, NodeType, PseudoDirectoryNode, PseudoNode, ReservedID, TagView, ViewType } from './model';
import { DateTimeFormatter, ZonedDateTime } from '@js-joda/core';
import { createTree, Depth, flatten } from './tree';

export default function ExplorerPane() {
  const model = useModel<Model>();
  const nodes = useObservable(model.nodes);
  const tags = useObservable(model.tags);
  const view = useObservable(model.view);
  const modalRef = React.useRef<HTMLDialogElement>(null);
  const [directoryPath, setDirectoryPath] = React.useState<string>();
  const [validPath, setValidPath] = React.useState<boolean>(false);
  const [dates, setDates] = React.useState<string[]>([]);
  const [draggedOver, setDraggedOver] = React.useState<string | undefined | boolean>(false);

  React.useEffect(() => {
    const dateSet = new Set<string>();

    for (const note of nodes) {
      const dateString = note.created.asZonedDateTime().format(DateTimeFormatter.ISO_LOCAL_DATE);
      dateSet.add(dateString);
    }

    const dates = Array.from(dateSet);
    dates.sort((a, b) => b.localeCompare(a, undefined));
    setDates(dates);
  }, [nodes]);

  // Temporal fix for "Type instantiation is excessively deep and possibly infinite."
  const directories = flatten(createTree(model, undefined));
  directories.push({ depth: 0, ...model.getNode('trash')! });

  return (
    <>
      <div id="explorer-pane">
        <div className="section">
          <div className="header"><div className="name">TREE</div><div className="menu" onClick={e => {
            setDirectoryPath(undefined);
            modalRef.current?.showModal();
          }}>+</div></div>
          <div className="container">
            {directories.map(d => <div
              key={d.id}
              className={[
                view?.type == ViewType.Directory && (view as DirectoryView).parentID == d.id ? 'selected' : '',
                draggedOver == d.id ? 'dragged' : '',
                'item'
              ].join(' ')}
              onDragOver={e => {
                setDraggedOver(d.id);
              }}
              onDragLeave={e => {
                setDraggedOver(false);
              }}
              onDrop={e => {
                const id = e.dataTransfer.getData('text/plain');
                model.setParent(id, d.id);
                setDraggedOver(false);
              }}
              style={{ paddingLeft: `${d.depth * 10}px` }}
              onClick={e => model.changeView({ 'type': ViewType.Directory, parentID: d.id } as DirectoryView)}
            >
              {(d as ((DirectoryNode | PseudoDirectoryNode) & Depth)).name}
            </div>)}
          </div>
        </div>
        <div className="section">
          <div className="header">TAGS</div>
          <div className="container">
            {tags.map(t => <div
              key={t.id}
              className={[
                view?.type == 'tag' && (view as TagView).tag == t.id ? 'selected' : '',
                draggedOver == t.id ? 'dragged' : '',
                'item'
              ].join(' ')}
              onDragOver={e => {
                setDraggedOver(t.id);
              }}
              onDragLeave={e => {
                setDraggedOver(false);
              }}
              onDrop={e => {
                const id = e.dataTransfer.getData('text/plain');
                model.appendTag(id, t.id);
                setDraggedOver(false);
              }}
              onClick={e => model.changeView({ 'type': 'tag', tag: t.id } as TagView)}>
              {t.name}
            </div>)}
          </div>
        </div>
        <div className="section">
          <div className="header">DATES</div>
          <div className="container">
            {dates.map(d => <div
              key={d}
              className={[view?.type == 'date' && (view as DateView).date == d ? 'selected' : '', 'item'].join(' ')}
              onClick={e => model.changeView({ 'type': 'date', date: d } as DateView)}>{d}</div>)}
          </div>
        </div>
      </div>
      <dialog ref={modalRef}>
        <div className='dialog-container'>
          <div className='dialog-title'>Create New Directory</div>
          Path <input type="text"
            className={validPath != null ? validPath ? 'valid' : 'invalid' : ''} placeholder='/.../...'
            onChange={e => {
              const pathExp = /^\/(([^\/]+)\/)*([^\/]+)?$/;
              setValidPath(pathExp.test(e.target.value));
              setDirectoryPath(e.target.value);
            }}
            value={directoryPath} />
          <div className='dialog-buttons'>
            <div className='left'><button onClick={e => modalRef.current?.close()}>Cancel</button></div>
            <div className='right'><button className='highlighted' onClick={e => {
              if (directoryPath != null) {
                model.createDirectory(directoryPath);
              }

              modalRef.current?.close();
            }}>OK</button></div>
          </div>
        </div>
      </dialog>
    </>
  );
}