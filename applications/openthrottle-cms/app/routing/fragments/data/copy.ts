/**
 * @description Single-sourced user-facing copy for the fragment detail route.
 */
export const FRAGMENT_DETAIL_COPY = {
  editorHeading: 'Properties',
  fallbackName: 'Fragment',
} as const;

/**
 * @description Why the editor cannot open, keyed by `CmsFragmentEditorFailure`.
 */
export const FRAGMENT_EDITOR_UNAVAILABLE_COPY = {
  'invalid-json': `This fragment's stored data is not valid JSON, so it cannot be edited here.`,
  'missing-schema': `The schema this fragment is pinned to no longer exists, so it cannot be edited here.`,
  'not-a-schema': `The schema this fragment is pinned to is not a JSON schema object.`,
  'not-an-object': `This fragment's stored data is not a JSON object, so it cannot be edited here.`,
  title: 'Editor unavailable',
} as const;

/**
 * @description Copy for the fragment editor's form and the outcome of its action.
 */
export const FRAGMENT_EDITOR_COPY = {
  addChild: 'Add child',
  addChildHeading: 'Add a child fragment',
  addChildPlaceholder: 'Choose a fragment',
  allTypenames: 'All types',
  createChild: 'Create child',
  createChildHeading: 'Create a new child fragment',
  createChildNameLabel: 'Name',
  createChildTypenamePlaceholder: 'Choose a type',
  filterChildrenLabel: 'Fragment type',
  forbidden: `You do not have permission to edit CMS content.`,
  invalid: `The fragment was not saved: some values do not match its schema.`,
  invalidForm: `The form was missing a field. Reload the page and try again.`,
  issuesTitle: 'Not saved',
  nameLabel: 'Name',
  nextPage: 'Next',
  pageLabel: 'Page',
  previousPage: 'Previous',
  rootPath: 'fragment',
  savedByIntent: {
    addChild: 'Child added.',
    createChild: 'Child created and added.',
    removeChild: 'Child removed.',
    reorderChildren: 'Order saved.',
    updateFragment: 'Saved.',
  },
  signIn: 'Sign in',
  unauthenticated: `Sign in to save changes.`,
  unknownIntent: `That action is not supported on this page.`,
} as const;

/**
 * @description Copy for the fragment preview pane.
 */
export const FRAGMENT_PREVIEW_COPY = {
  desktop: 'Desktop',
  deviceToggle: 'Preview device',
  heading: 'Preview',
  mobile: 'Mobile',
  tablet: 'Tablet',
} as const;
