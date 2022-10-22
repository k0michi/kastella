import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime';
import { dateToString } from './utils';
import { useModel, useObservable } from 'kyoka';
import Model, { Image, Type } from './model';
import produce from 'immer';

export default function ExplorerPane() {
  const model = useModel<Model>();
  const tags = useObservable(model.tags);

  return (<div id="explorer-pane">
    <div>
      Tree
    </div>
    <div>
      Tags
      {tags.map(t=><div>{t.name}</div>)}
    </div>
  </div>);
}