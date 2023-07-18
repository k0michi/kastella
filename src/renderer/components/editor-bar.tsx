import { useModel, useObservable } from 'kyoka';
import * as React from 'react';
import Model, { DateView, DirectoryView, TagView, ViewType } from '../model';
import styled from 'styled-components';

const TextAreaSearch = styled.textarea`
  resize: none;
  border: none;
  border-bottom: 1px solid ${props => props.theme.colorBorder};
  outline: none;
  background-color: inherit;
  color: inherit;
  flex: 1 1 0;

  &:focus {
    border-bottom: 1px solid rgb(125, 210, 255);
  }
`;

const DivEditorBarSection = styled.div`
  background-color: ${props => props.theme.colorEditorBar};
  border-bottom: 1px solid ${props => props.theme.colorBorder};
  padding: 6px;

  &:nth-child(2) {
    flex: 0 0 32px;
    display: flex;
    flex-direction: row;
    gap: 4px;
  }

  &:nth-child(2)>* {
    display: block;
    height: fit-content;
    margin-top: auto;
    margin-bottom: auto;
  }
`;

const DivUnselectable = styled.div`
  user-select: none;
`;

export default function EditorBar() {
  const model = useModel<Model>();
  const writeOnly = useObservable(model.writeOnly);
  const lineNumberVisibility = useObservable(model.lineNumberVisibility);
  const dateVisibility = useObservable(model.dateVisibility);
  const search = useObservable(model.search);
  const view = useObservable(model.view);

  return <div id='editor-bar'>
    <DivEditorBarSection>
      <DivUnselectable>
        {
          view?.type == ViewType.Directory ?
            `${model.library.getPath((view as DirectoryView).parentID!)}`
            : view?.type == ViewType.Tag ?
              `#${model.library.getTag((view as TagView).tag)?.name}`
              : view?.type == ViewType.Date ?
                `@${(view as DateView).date}`
                : null
        }
      </DivUnselectable>
    </DivEditorBarSection>
    <DivEditorBarSection>
      <DivUnselectable>
        <input checked={writeOnly} type="checkbox" id="write-only" onChange={e => {
          model.setWriteOnly(e.target.checked);
        }} />
        <label htmlFor="write-only">Write-only</label>
      </DivUnselectable>
      <DivUnselectable>
        <input checked={lineNumberVisibility} type="checkbox" id="line-number-visibility" onChange={e => {
          model.setLineNumberVisibility(e.target.checked);
        }} />
        <label htmlFor="line-number">Line number</label>
      </DivUnselectable>
      <DivUnselectable>
        <input checked={dateVisibility} type="checkbox" id="date-visibility" onChange={e => {
          model.setDateVisibility(e.target.checked);
        }} />
        <label htmlFor="date-visibility">Date</label>
      </DivUnselectable>
      <TextAreaSearch rows={1} onChange={e => model.setSearch(e.target.value)} value={search} />
    </DivEditorBarSection>
  </div>;
}