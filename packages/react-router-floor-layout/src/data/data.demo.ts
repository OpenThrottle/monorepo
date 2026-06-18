import type { FloorLayout } from '../types';
import { createFloorElement } from '../utils/elements';
import { addElement, createEmptyLayout } from '../utils/layout-operations';

/**
 * Setup — a small demo floor with a couple of tables and a zone.
 */
export function buildDemoLayout(): FloorLayout {
  let layout = createEmptyLayout({ id: 'floor-demo', name: 'Demo floor' });

  layout = addElement(
    layout,
    createFloorElement({
      center: { x: 96, y: 96 },
      id: 'round-1',
      type: 'table-round',
    }),
  );

  layout = addElement(
    layout,
    createFloorElement({
      center: { x: 240, y: 120 },
      id: 'square-1',
      type: 'table-square',
    }),
  );

  layout = addElement(
    layout,
    createFloorElement({
      center: { x: 200, y: 280 },
      id: 'zone-1',
      type: 'zone',
    }),
  );

  return layout;
}

export const DEMO_LAYOUT = buildDemoLayout();
