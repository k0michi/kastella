import * as React from 'react';
import Katex from 'katex';
import { useModel, useObservable } from 'kyoka';
import Model, { DirectoryView, TagView, ViewType } from './model';
import Timestamp from './timestamp';

export default function ToolBar() {
  const model = useModel<Model>();
  const mathModalRef = React.useRef<HTMLDialogElement>(null);
  const [exp, setExp] = React.useState<string>('');

  const rendered = React.useMemo(() => {
    let result;

    try {
      result = Katex.renderToString(exp, {
        displayMode: true
      });
    } catch (e) {
      return e as Error;
    }

    return result;
  }, [exp]);

  return (
    <>
      <div id="tool-bar">
        <button className='tool' onClick={e => {
          mathModalRef.current?.showModal();
        }}>Math</button>
      </div>
      <dialog ref={mathModalRef}>
        <div className='dialog-container'>
          <div className='dialog-title'>Insert Math Block</div>
          <textarea
            rows={2}
            className='exp-input'
            placeholder='f(x)'
            onChange={e => {
              setExp(e.target.value);
            }}
            value={exp} />
          <div className={['math-preview', rendered instanceof Error ? 'error' : ''].join(' ')} dangerouslySetInnerHTML={
            {
              __html: rendered instanceof Error ? (rendered.message) : rendered
            }
          }></div>
          <div className='dialog-buttons'>
            <div className='left'><button onClick={e => mathModalRef.current?.close()}>Cancel</button></div>
            <div className='right'><button className='highlighted' onClick={async e => {
              if (!(rendered instanceof Error)) {
                const now = Timestamp.fromNs(await bridge.now());
                let tagIDs: string[] = [];

                const parentID = model.getViewDirectory();
                tagIDs = tagIDs.concat(model.getViewTags());

                model.library.addMathNode(exp, now, parentID, tagIDs);
              }

              mathModalRef.current?.close();
            }}>OK</button></div>
          </div>
        </div>
      </dialog>
    </>
  );
}