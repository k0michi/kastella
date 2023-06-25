import * as React from 'react';
import styled from "styled-components";
import Dialog from "./dialog";

export const CommonDialog = styled(Dialog)`
  padding: 24px;
  border: none;
  border-radius: 8px;
  max-width: 100vw;
  filter: drop-shadow(0 0 12px #00000042);

  &::backdrop {
    background-color: #5a5a5a63;
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
  user-select: none;
  background-color: ${props => props.disabled ? props.theme.colorButtonDisabledBack : (props.$highlighted ? props.theme.colorButton1Back : props.theme.colorButton0Back)};
  color: ${props => props.disabled ? props.theme.colorButtonDisabledFore : (props.$highlighted ? props.theme.colorButton1Fore : props.theme.colorButton0Fore)};

  &:active:hover {
    background-color: ${props => props.disabled ? props.theme.colorButtonDisabledBack : (props.$highlighted ? props.theme.colorButton1BackActive : props.theme.colorButton0BackActive)};
  }
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