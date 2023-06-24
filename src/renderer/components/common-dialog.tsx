import * as React from 'react';
import styled from "styled-components";
import Dialog from "./dialog";

export const CommonDialog = styled(Dialog)`
  padding: 24px;
  border: none;
  border-radius: 8px;
  max-width: 100vw;

  &::backdrop {
    backdrop-filter: blur(8px);
  }
`;

export const CommonDialogTitle = styled.div`
  margin-bottom: 24px;
  font-weight: bold;
`;

export const CommonDialogButtons = styled.div`
  margin-top: 24px;
  display: flex;
  flex-direction: row;
`;

export const CommonDialogButtonsLeft = styled.div`
  flex: 1 1 0;
`;

export const CommonDialogButtonsRight = styled.div`
`;

export const ButtonCommonDialogButton = styled.button<{ $disabled?: boolean, $highlighted?: boolean }>`
  padding: 5px 12px;
  border-radius: 4px;
  min-width: 80px;
  border: none;
  background-color: ${props => props.disabled ? 'gray' : (props.$highlighted ? props.theme.colorButton1Back : 'lightgray')};
  color: ${props => props.disabled ? 'unset' : (props.$highlighted ? props.theme.colorButton1Fore : 'unset')};
`;

export interface CommonDialogButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  highlighted?: boolean;
}

export function CommonDialogButton(props: CommonDialogButtonProps) {
  return <ButtonCommonDialogButton $disabled={props.disabled} $highlighted={props.highlighted} {...props} />
}

export const InputCommonDialogTextInput = styled.input<{ $invalid?: boolean }>`
  border: none;
  outline: none;
  border-bottom: 1px solid ${props => props.$invalid ? props.theme.colorError : props.theme.colorBorder};
  font-size: 16px;
  width: 256px;
`;

export interface CommonDialogTextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function CommonDialogTextInput(props: CommonDialogTextInputProps) {
  return <InputCommonDialogTextInput {...props} $invalid={props.invalid} type="text" />
}