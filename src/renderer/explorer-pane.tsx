import * as React from 'react';
import { useModel, useObservable } from 'kyoka';
import { formatISO } from 'date-fns';
import Model, { DateView, DirectoryNode, DirectoryView, Node, NodeType, TagView } from './model';
import { DateTimeFormatter } from '@js-joda/core';

interface TreeNode {
  name?: string;
  id?: string
  children: TreeNode[];
  depth: number;
}

export default function ExplorerPane() {
  const model = useModel<Model>();
  const nodes = useObservable(model.nodes);
  const tags = useObservable(model.tags);
  const view = useObservable(model.view);
  const modalRef = React.useRef<HTMLDialogElement>(null);
  const [directoryPath, setDirectoryPath] = React.useState<string>();
  const [validPath, setValidPath] = React.useState<boolean>(false);
  const [dates, setDates] = React.useState<string[]>([]);

  React.useEffect(() => {
    const dateSet = new Set<string>();

    for (const note of nodes) {
      const dateString = note.created.format(DateTimeFormatter.ISO_LOCAL_DATE);
      dateSet.add(dateString);
    }

    const dates = Array.from(dateSet);
    dates.sort((a, b) => b.localeCompare(a, undefined));
    setDates(dates);
  }, [nodes]);

  function createTree(parentID: string | undefined, depth = 0) {
    let name = null;

    if (parentID != null) {
      // FIXME: This might cause a problem when tree updated
      name = (model.getNode(parentID) as DirectoryNode).name;
    }

    const treeNode = { name, id: parentID, children: [], depth } as TreeNode;

    for (const child of model.getChildNodes(parentID)) {
      if (child.type == NodeType.Directory) {
        treeNode.children.push(createTree(child.id, depth + 1));
      }
    }

    return treeNode;
  }

  function mapToArray(node: TreeNode): any {
    return [node, node.children.map(n => mapToArray(n))];
  }

  const directories = mapToArray(createTree(undefined)).flat(Infinity) as TreeNode[];
  directories.push({ name: 'Trash', id: 'trash', depth: 0, children: [] });

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
              className={[view.type == 'directory' && (view as DirectoryView).parentID == d.id ? 'selected' : '', 'item'].join(' ')}
              onClick={e => model.changeView({ 'type': 'directory', parentID: d.id } as DirectoryView)}>
              <div style={{ paddingLeft: `${d.depth * 10}px` }}>
                {d.name ?? '/'}
              </div>
            </div>)}
          </div>
        </div>
        <div className="section">
          <div className="header">TAGS</div>
          <div className="container">
            {tags.map(t => <div
              key={t.id}
              className={[view.type == 'tag' && (view as TagView).tag == t.id ? 'selected' : '', 'item'].join(' ')}
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
              className={[view.type == 'date' && (view as DateView).date == d ? 'selected' : '', 'item'].join(' ')}
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