import * as React from 'react';

interface DialogProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  open: boolean;
  onEscape?: (e: React.KeyboardEvent<HTMLDialogElement>) => void;
}

export default function Dialog(props: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    if (props.open) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [props.open]);

  const dialogProps = { ...props, open: undefined };
  return <dialog {...dialogProps} onKeyDown={e => {
    if (e.key == 'Escape') {
      e.preventDefault();

      if (props.onEscape) {
        props.onEscape(e);
      }
    }

    if (props.onChange) {
      props.onChange(e);
    }
  }} ref={ref}>{props.children}</dialog>
}