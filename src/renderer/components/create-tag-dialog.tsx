import * as React from 'react';
import * as chroma from 'chroma-js';

import { CommonDialog, CommonDialogButton, CommonDialogButtons, CommonDialogButtonsLeft, CommonDialogButtonsRight, CommonDialogTextInput, CommonDialogTitle } from './common-dialog';
import { DivDialogRow } from './explorer-pane';
import { RegExpression } from '../reg-expression';
import { useModel } from 'kyoka';
import Model from '../model';

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
  const model = useModel<Model>();
  const [tagInput, setTagInput] = React.useState('');
  const [tagColor, setTagColor] = React.useState(chroma.random().hex());
  const [validTag, setValidTag] = React.useState<boolean>(false);

  return <CommonDialog open={props.open}>
    <CommonDialogTitle>Create New Tag</CommonDialogTitle>
    <DivDialogRow>
      <label>Tag name</label><CommonDialogTextInput invalid={!validTag} placeholder='tag'
        onChange={e => {
          let valid = RegExpression.tag.test(e.target.value);

          if (model.library.findTag(e.target.value) != null) {
            valid = false;
          }

          setValidTag(valid);
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