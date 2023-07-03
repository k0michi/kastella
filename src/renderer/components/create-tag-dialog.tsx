import * as React from 'react';
import { CommonDialog, CommonDialogButton, CommonDialogButtons, CommonDialogButtonsLeft, CommonDialogButtonsRight, CommonDialogTextInput, CommonDialogTitle } from './common-dialog';
import * as chroma from 'chroma-js';
import { DivDialogRow } from './explorer-pane';

export const tagExp = /^\S+$/;

export interface CreateTagDialogOKEvent {
  tagName: string;
  tagColor: string;
}

export interface CreateTagDialogProps {
  open: boolean;
  onOK: (e: CreateTagDialogOKEvent) => void;
  onCancel: () => void;
}

export default function CreateTagDialog(props: CreateTagDialogProps) {
  const [tagInput, setTagInput] = React.useState('');
  const [tagColor, setTagColor] = React.useState(chroma.random().hex());
  const [validTag, setValidTag] = React.useState<boolean>(false);

  return <CommonDialog open={props.open}>
    <CommonDialogTitle>Create New Tag</CommonDialogTitle>
    <DivDialogRow>
      <label>Tag name</label><CommonDialogTextInput invalid={!validTag} placeholder='tag'
        onChange={e => {
          setValidTag(tagExp.test(e.target.value));
          setTagInput(e.target.value);
        }}
        value={tagInput} />
    </DivDialogRow>
    <DivDialogRow>
      <label>Color</label>
      <input type="color" value={tagColor} onChange={e => {
        setTagColor(e.target.value);
      }} />
    </DivDialogRow>
    <CommonDialogButtons>
      <CommonDialogButtonsLeft>
        <CommonDialogButton onClick={e => {
          setTagInput('');
          setTagColor(chroma.random().hex());
          setValidTag(false);
          props.onCancel();
        }}>Cancel</CommonDialogButton>
      </CommonDialogButtonsLeft>
      <CommonDialogButtonsRight>
        <CommonDialogButton highlighted onClick={e => {
          setTagInput('');
          setTagColor(chroma.random().hex());
          setValidTag(false);
          props.onOK({ tagName: tagInput, tagColor });
        }} disabled={!validTag}>OK</CommonDialogButton>
      </CommonDialogButtonsRight>
    </CommonDialogButtons>
  </CommonDialog>;
}