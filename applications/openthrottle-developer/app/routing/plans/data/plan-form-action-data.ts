/**
 * @description Field names the plan form can anchor a validation error to.
 * Errors returned by the plan create/edit actions carry one of these so the
 * message renders next to the control that caused it instead of disappearing.
 */
export type PlanFormField = 'author' | 'category' | 'title';

/**
 * @description Raw submitted values echoed back on a failed submit so the form
 * re-renders with the user's input instead of empty defaults.
 */
export interface PlanFormValues {
  assignee?: string;
  author?: string;
  category?: string;
  description?: string;
  project?: string;
  projectId?: string;
  status?: string;
  summary?: string;
  title?: string;
}

/**
 * @description Shape returned by the plan create and plan edit route actions
 * when a submit fails validation (client-side or server-side).
 */
export interface PlanFormActionData {
  error?: string;
  field?: PlanFormField;
  values?: PlanFormValues;
}
