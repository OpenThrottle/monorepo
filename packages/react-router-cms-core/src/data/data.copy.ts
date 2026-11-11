/**
 * @description Copy for {@link ReorderHandle}.
 * @public
 */
export const REORDER_HANDLE_COPY = {
  label: 'Drag to reorder',
} as const;

/**
 * @description Copy for {@link LogicCookies} when it has nothing to render.
 * @public
 */
export const LOGIC_COOKIES_COPY = {
  emptyDescription: 'Add child components to show them when the cookies match.',
  emptyTitle: 'Logic Cookies',
} as const;

/**
 * @description Copy shared by the CMS form fields.
 * @public
 */
export const FORM_FIELD_COPY = {
  anyOfUnsupported: `Choosing between these options is not supported yet:`,
  arrayAdd: 'Add item',
  arrayEmpty: 'No items yet.',
  arrayRemove: 'Remove item',
  objectInvalid: 'Not valid JSON — the last valid value is kept.',
  requiredMark: '*',
  selectPlaceholder: 'Select an option',
} as const;

/**
 * @description Copy for {@link FormChildren}.
 * @public
 */
export const FORM_CHILDREN_COPY = {
  add: 'Add children',
  edit: 'Edit',
  empty: 'No children yet.',
  remove: 'Remove',
} as const;

/**
 * @description Copy for {@link CoreFormRenderer}.
 * @public
 */
export const CORE_FORM_COPY = {
  save: 'Save',
} as const;

/**
 * @description Copy for the CMS preview surfaces.
 * @public
 */
export const PREVIEW_COPY = {
  editFragment: 'Edit',
  iframeTitle: 'Page preview',
} as const;
