import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime';
import { dateToString } from './utils';
import { useModel, useObservable } from 'kyoka';
import Model, { Image, TagView, Type } from './model';
import produce from 'immer';

export default function ExplorerPane() {
  const model = useModel<Model>();
  const tags = useObservable(model.tags);
  const modalRef = React.useRef<HTMLDialogElement>(null);
  const [directoryPath, setDirectoryPath] = React.useState<string>();
  const [validPath, setValidPath] = React.useState<boolean>(false);

  return (
    <>
      <div id="explorer-pane">
        <div className="section">
          <div className="header"><div className="name">TREE</div><div className="menu" onClick={e => {
            modalRef.current?.showModal();
          }}>+</div></div>
          <div className="container">
            <div onClick={e => model.changeView(undefined)}>/</div>
          </div>
        </div>
        <div className="section">
          <div className="header">TAGS</div>
          <div className="container">
            {tags.map(t => <div onClick={e => model.changeView({ 'type': 'tag', tag: t.id } as TagView)}>{t.name}</div>)}
          </div>
        </div>
      </div>
      <dialog ref={modalRef} onClick={e => {

      }}>
        <div className='dialog-container' onClick={e => e.stopPropagation()}>
          <div className='dialog-title'>Create New Directory</div>
          Path <input type="text" className={validPath != null ? validPath ? 'valid' : 'invalid' : ''} placeholder='/.../...' onChange={e => {
            const pathExp = /^\/(([^\/]+)\/)*([^\/]+)?$/;
            setValidPath(pathExp.test(e.target.value));
            setDirectoryPath(e.target.value);
          }} />
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