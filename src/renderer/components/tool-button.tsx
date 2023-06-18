import * as React from 'react';

export interface ToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {

}

export default function ToolButton(props: ToolButtonProps) {
  return <button className='tool' {...props} />;
}