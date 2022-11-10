import * as React from 'react';
import { useModel, useObservable } from 'kyoka';
import Model from './model';

export default function StatusBar() {
  const model = useModel<Model>();
  const status = useObservable(model.status);

  return (
    <div id="status-bar">{status?.message}</div>
  );
}