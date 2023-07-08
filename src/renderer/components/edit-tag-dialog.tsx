import * as React from 'react';
import * as chroma from 'chroma-js';

import { CommonDialog, CommonDialogButton, CommonDialogButtons, CommonDialogButtonsLeft, CommonDialogButtonsRight, CommonDialogTextInput, CommonDialogTitle } from './common-dialog';
import { DivDialogRow } from './explorer-pane';
import { RegExpression } from '../reg-expression';
import { useModel } from 'kyoka';
import Model from '../model';

export interface EditTagDialogOKEvent {
  tagName: string;
  tagColor: string;
}

export interface EditTagDialogProps {
  open: boolean;
  tagID: string;
  onOK: (e: EditTagDialogOKEvent) => void;
  onCancel: () => void;
}

export default function EditTagDialog(props: EditTagDialogProps) {
  const model = useModel<Model>();
  const [tagInput, setTagInput] = React.useState('');
  const [tagColor, setTagColor] = React.useState('');
  const [validTag, setValidTag] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (props.open) {
      setTagInput(model.library.getTag(props.tagID)?.name!);
      setTagColor(model.library.getTag(props.tagID)?.color!);
      setValidTag(true);
    }
  }, [props.open]);

  return <CommonDialog open={props.open}>
    <CommonDialogTitle>Edit Tag</CommonDialogTitle>
    <DivDialogRow>
      <label>Tag name</label><CommonDialogTextInput invalid={!validTag} placeholder='tag'
        onChange={e => {
          let valid = RegExpression.tag.test(e.target.value);
          const found = model.library.findTag(e.target.value);

          if (found != null && found.id != props.tagID) {
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