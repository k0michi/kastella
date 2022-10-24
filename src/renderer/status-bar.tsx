import * as React from 'react';
import { useModel, useObservable } from 'kyoka';
import Model from './model';

export default function StatusBar() {
  const model = useModel<Model>();
  const saving = useObservable(model.saving);

  return (
    <div id="status-bar">{saving ? 'Saving...' : ''}</div>
  );
}