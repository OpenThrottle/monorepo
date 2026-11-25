/**
 * @description Single-sourced user-facing copy for the component detail route.
 */
export const COMPONENT_DETAIL_COPY = {
  fallbackLabel: 'Component',
  libraryHeading: 'Library',
} as const;

/**
 * @description Copy for the component edit form and the outcome of its action.
 */
export const COMPONENT_EDITOR_COPY = {
  codeLabel: 'Code',
  forbidden: `You do not have permission to edit CMS content.`,
  heading: 'Edit',
  invalid: `The component was not saved: its props schema is not a valid JSON Schema.`,
  invalidForm: `Name, typename, code and props schema are all required. Use {} for a component without props.`,
  issuesTitle: 'Not saved',
  nameLabel: 'Name',
  propsSchemaLabel: 'Props schema (JSON Schema)',
  rootPath: 'propsSchema',
  save: 'Save',
  saved: 'Saved.',
  signIn: 'Sign in',
  statusLabel: 'Status',
  typenameLabel: 'Typename',
  unauthenticated: `Sign in to save changes.`,
} as const;

/**
 * @description Copy for the props-schema preview; the failure keys match `CmsRecordFailure`.
 */
export const COMPONENT_PREVIEW_COPY = {
  description: `The property form a fragment of this typename would get from the schema above. Updates as you type; nothing here is saved.`,
  empty: `This schema declares no properties, so the form has no fields.`,
  heading: 'Form preview',
  'invalid-json': `The props schema is not valid JSON yet, so there is no form to preview.`,
  'not-a-schema': `The props schema is not a JSON Schema object: "properties" and "definitions" must be objects.`,
  'not-an-object': `The props schema must be a JSON object, not an array or a single value.`,
  unavailableTitle: 'No preview',
} as const;
