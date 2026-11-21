/** Resource route serving the live rule preview (a read-only GraphQL dry run). */
export const RULE_PREVIEW_PATH = '/resources/rule-preview';

/** Debounce between the last match-field change and hitting the resource route. */
export const RULE_PREVIEW_DEBOUNCE_MS = 400;

/** URL search param on the rule detail page naming the environment to preview in. */
export const RULE_PREVIEW_ENVIRONMENT_PARAM = 'previewEnvironment';
