import { IconGripVertical } from '@tabler/icons';
import * as React from 'react';
import { useModel, useObservable } from 'kyoka';
import Model from '../model';
import styled from 'styled-components';

const Td = styled.td`
  padding: 0;
  vertical-align: top;
`;

const TdGrip = styled(Td)`
  color: ${props => props.theme.colorEditorIndex};
  position: relative;
  width: 16px;
  min-width: 16px;

  svg {
    position: absolute;
    cursor: grab;
  }
`;

const TdIndex = styled(Td) <{ $empty?: boolean }>`
  color: ${props => props.$empty ? props.theme.colorEditorIndexEmpty : props.theme.colorEditorIndex};
  padding-right: 4px;
  text-align: right;
  white-space: nowrap;
  font-family: monospace;
  user-select: none;
  width: 0px;
`;

export interface RowProps {
  id: string | null;
  index: number;
  pseudoIndex: number;
  depth: number;
  itemStyle?: string;
  listStyleType?: string;
  empty?: boolean;
  disallowDrag?: boolean;
  children: any;
}

export default function Row(props: RowProps) {
  const model = useModel<Model>();
  const hovered = useObservable(model.hovered);
  const lineNumberVisibility = useObservable(model.lineNumberVisibility);

  return <tr data-type="node" data-id={props.id} data-index={props.pseudoIndex}>
    <TdGrip>{props.disallowDrag != true && props.id == hovered ?
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
      : null}
    </TdGrip>
    {lineNumberVisibility ? <TdIndex $empty={props.empty}>{props.index!}</TdIndex> : null}
    <td className='node-wrapper' style={{
      marginLeft: `${(props.depth) * 16}px`,
      display: props.itemStyle == undefined ? 'block' : 'list-item',
      listStyleType: props.listStyleType != undefined ? `'${props.listStyleType}'` : 'initial'
    }}>
      {props.children}
    </td>
  </tr>;
}