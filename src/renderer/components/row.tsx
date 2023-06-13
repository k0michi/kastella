import { IconGripVertical } from '@tabler/icons';
import * as React from 'react';
import { useModel, useObservable } from 'kyoka';
import Model from '../model';

export interface RowProps {
  id: string | null;
  index: number;
  pseudoIndex: number;
  depth: number;
  itemStyle?: string;
  listStyleType?: string;
  empty?: boolean;
  children: any;
}

export default function Row(props: RowProps) {
  const model = useModel<Model>();
  const hovered = useObservable(model.hovered);
  const lineNumberVisibility = useObservable(model.lineNumberVisibility);

  return <tr data-type="node" data-id={props.id} data-index={props.pseudoIndex}>
    <td className='grip'>{props.id == hovered ?
      <div draggable
        onDragStart={e => {
          const parent = (e.target as HTMLElement).parentElement?.parentElement!;
          if (props.id != null) {
            e.dataTransfer.setDragImage(parent, 0, 0);
            e.dataTransfer.setData('text/plain', props.id);
            e.dataTransfer.effectAllowed = 'move';
          }
        }}>
        <IconGripVertical width={16} />
      </div>
      : null}</td>
    {lineNumberVisibility ? <td className={`index ${props.empty ? 'empty' : ''}`}>{props.index!}</td> : null}
    <td className='node-wrapper' style={{
      marginLeft: `${(props.depth) * 16}px`,
      display: props.itemStyle == undefined ? 'block' : 'list-item',
      listStyleType: props.listStyleType != undefined ? `'${props.listStyleType}'` : 'initial'
    }}>
      {props.children}
    </td>
  </tr>;;
}