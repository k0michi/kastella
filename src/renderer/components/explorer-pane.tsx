import * as React from 'react';
import { useModel, useObservable } from 'kyoka';
import Model, { DateView, DirectoryView, TagView, ViewType } from '../model';
import { isDirectory, visit } from '../tree';
import { DirectoryNode } from '../node';
import { toDateString } from '../utils';
import styled from 'styled-components';
import Dialog from './dialog';
import { CommonDialog, CommonDialogButton, CommonDialogButtons, CommonDialogButtonsLeft, CommonDialogButtonsRight, CommonDialogTextInput, CommonDialogTitle } from './common-dialog';

const pathExp = /^\/(([^\/]+)\/)*([^\/]+)?$/;
const tagExp = /^\S+$/;

const DivExplorerPane = styled.div`
  flex: 0 0 200px;
  top: 0;
  padding: 12px;
  overflow-y: auto;
  background-color: ${props => props.theme.colorExplorer};
  border-right: solid 1px ${props => props.theme.colorBorder};
  user-select: none;
  font-size: 14px;
`;

const DivSection = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const DivSectionHeader = styled.div`
  color: ${props => props.theme.colorExplorerHeader};
  font-weight: lighter;
  display: flex;
  flex-direction: row;
`;

const DivSectionName = styled.div`
  flex: 1 1 0;
`;

const DivSectionMenu = styled.div`
  cursor: pointer;
`;

const DivItem = styled.div<{ $selected?: boolean, $dragged?: boolean }>`
  cursor: default;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid ${props => props.$dragged ? props.theme.colorExplorerSelected : 'transparent'};
  background-color: ${props => props.$selected ? props.theme.colorExplorerSelected : 'unset'};
`;

export default function ExplorerPane() {
  const model = useModel<Model>();
  const nodes = useObservable(model.library.nodes);
  const tags = useObservable(model.library.tags);
  const view = useObservable(model.view);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [directoryPath, setDirectoryPath] = React.useState<string>('');
  const [validPath, setValidPath] = React.useState<boolean>(false);

  const [tagModalOpen, setTagModalOpen] = React.useState(false);
  const [tagInput, setTagInput] = React.useState('');
  const [validTag, setValidTag] = React.useState<boolean>(false);

  const [dates, setDates] = React.useState<string[]>([]);
  const [draggedOver, setDraggedOver] = React.useState<string | undefined | boolean>(false);

  React.useEffect(() => {
    const dateSet = new Set<string>();

    for (const node of visit(nodes)) {
      if (node.created != undefined) {
        const dateString = toDateString(node.created.asDate());
        dateSet.add(dateString);
      }
    }

    const dates = Array.from(dateSet);
    dates.sort((a, b) => b.localeCompare(a, undefined));
    setDates(dates);
  }, [model.library.nodes.getSnapShot()]);

  const directories = React.useMemo(() => [...visit(nodes, isDirectory)] as DirectoryNode[], [model.library.nodes.getSnapShot()]);

  return (
    <>
      <DivExplorerPane>
        <DivSection>
          <DivSectionHeader>
            <DivSectionName>TREE</DivSectionName>
            <DivSectionMenu onClick={e => {
              setModalOpen(true);
            }}>+</DivSectionMenu>
          </DivSectionHeader>
          <div className="container">
            {directories.map(d => <DivItem
              key={d.id}
              $selected={ViewType.Directory && (view as DirectoryView).parentID == d.id}
              $dragged={draggedOver == d.id}
              onDragOver={e => {
                setDraggedOver(d.id);
              }}
              onDragLeave={e => {
                setDraggedOver(false);
              }}
              onDrop={e => {
                const id = e.dataTransfer.getData('text/plain');

                if (model.library.canMoveNode(id, d.id)) {
                  model.library.moveNodeBefore(id, d.id);
                }

                setDraggedOver(false);
              }}
              style={{ paddingLeft: `${d.depth! * 12 + 4}px` }}
              onClick={e => model.changeView({ 'type': ViewType.Directory, parentID: d.id } as DirectoryView)}
            >
              {d.name == undefined ? model.library.getReservedDirName(d.id) : d.name}
            </DivItem>)}
          </div>
        </DivSection>
        <DivSection>
          <DivSectionHeader>
            <DivSectionName>TAGS</DivSectionName>
            <DivSectionMenu onClick={e => {
              setTagModalOpen(true);
            }}>+</DivSectionMenu>
          </DivSectionHeader>
          <div className="container">
            {tags.map(t => <DivItem
              key={t.id}
              $selected={view?.type == 'tag' && (view as TagView).tag == t.id}
              $dragged={draggedOver == t.id}
              onDragOver={e => {
                setDraggedOver(t.id);
              }}
              onDragLeave={e => {
                setDraggedOver(false);
              }}
              onDrop={e => {
                const id = e.dataTransfer.getData('text/plain');
                model.library.appendTag(id, t.id);
                setDraggedOver(false);
              }}
              onClick={e => model.changeView({ 'type': 'tag', tag: t.id } as TagView)}>
              {t.name}
            </DivItem>)}
          </div>
        </DivSection>
        <DivSection>
          <DivSectionHeader><DivSectionName>DATES</DivSectionName></DivSectionHeader>
          <div className="container">
            {dates.map(d => <DivItem
              key={d}
              $selected={view?.type == 'date' && (view as DateView).date == d}
              onClick={e => model.changeView({ 'type': 'date', date: d } as DateView)}>{d}</DivItem>)}
          </div>
        </DivSection>
      </DivExplorerPane>
      <CommonDialog open={modalOpen}>
        <CommonDialogTitle>Create New Directory</CommonDialogTitle>
        Path <CommonDialogTextInput invalid={!validPath} placeholder='/.../...'
          onChange={e => {
            setValidPath(pathExp.test(e.target.value));
            setDirectoryPath(e.target.value);
          }}
          value={directoryPath} />
        <CommonDialogButtons>
          <CommonDialogButtonsLeft>
            <CommonDialogButton onClick={e => {
              setModalOpen(false);
              setDirectoryPath('');
            }}>Cancel</CommonDialogButton>
          </CommonDialogButtonsLeft>
          <CommonDialogButtonsRight>
            <CommonDialogButton highlighted onClick={e => {
              if (pathExp.test(directoryPath)) {
                model.library.createDirectory(directoryPath);
              }

              setDirectoryPath('');
              setModalOpen(false);
            }} disabled={!validPath}>OK</CommonDialogButton>
          </CommonDialogButtonsRight>
        </CommonDialogButtons>
      </CommonDialog>
      <CommonDialog open={tagModalOpen}>
        <CommonDialogTitle>Create New Tag</CommonDialogTitle>
        Tag name <CommonDialogTextInput invalid={!validTag} placeholder='tag'
          onChange={e => {
            setValidTag(tagExp.test(e.target.value));
            setTagInput(e.target.value);
          }}
          value={tagInput} />
        <CommonDialogButtons>
          <CommonDialogButtonsLeft>
            <CommonDialogButton onClick={e => {
              setTagInput('');
              setTagModalOpen(false)
            }}>Cancel</CommonDialogButton>
          </CommonDialogButtonsLeft>
          <CommonDialogButtonsRight>
            <CommonDialogButton highlighted onClick={e => {
              if (tagExp.test(tagInput)) {
                model.library.createTag(tagInput);
              }

              setTagInput('');
              setTagModalOpen(false);
            }} disabled={!validTag}>OK</CommonDialogButton>
          </CommonDialogButtonsRight>
        </CommonDialogButtons>
      </CommonDialog>
    </>
  );
}