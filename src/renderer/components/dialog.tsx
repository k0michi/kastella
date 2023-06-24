import * as React from 'react';

interface DialogProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  open: boolean;
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
  return <dialog {...dialogProps} ref={ref}>{props.children}</dialog>
}