import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FloorElementType, type FloorLayout } from '../../types';
import { createFloorElement } from '../../utils/elements';
import { addElement, createEmptyLayout } from '../../utils/layout-operations';
import { FloorLayoutEditor } from '../FloorLayoutEditor';

function fixture(): FloorLayout {
  const table = {
    ...createFloorElement({
      center: { x: 60, y: 60 },
      id: 't1',
      type: FloorElementType.TABLE_SQUARE,
    }),
    label: 'T1',
  };
  return addElement(createEmptyLayout({ id: 'layout-1' }), table);
}

describe('FloorLayoutEditor — SSR', () => {
  it('renders to a static HTML string without touching the DOM', () => {
    const html = renderToString(<FloorLayoutEditor defaultValue={fixture()} />);

    // A successful server render proves the editor and its hooks never reach
    // for window/document during the initial render (the package's SSR-safety
    // claim). Spot-check that real markup came back.
    expect(html).toContain('<svg');
    expect(html).toContain('T1');
  });

  it('renders an empty layout on the server', () => {
    expect(() => renderToString(<FloorLayoutEditor />)).not.toThrow();
  });
});
