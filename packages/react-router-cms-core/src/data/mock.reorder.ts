/**
 * @description A row in {@link MOCK_REORDER_ITEMS}.
 */
export interface MockReorderItem {
  readonly id: string;
  readonly text: string;
}

/**
 * @description Sample rows for ReorderGroup stories and specs (upstream's default list).
 */
export const MOCK_REORDER_ITEMS: readonly MockReorderItem[] = [
  { id: '1', text: 'Write a cool JS library' },
  { id: '2', text: 'Make it generic enough' },
  { id: '3', text: 'Write README' },
  { id: '4', text: 'Create some examples' },
  {
    id: '5',
    text: `Spam in Twitter and IRC to promote it (note that this element is taller than the others)`,
  },
  { id: '6', text: '???' },
  { id: '7', text: 'PROFIT' },
];
