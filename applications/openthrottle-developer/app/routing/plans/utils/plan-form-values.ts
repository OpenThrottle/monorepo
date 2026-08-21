import type {
  PlanFormField,
  PlanFormValues,
} from '~/routing/plans/data/plan-form-action-data';

const readString = (formData: FormData, key: string): string => {
  const value = formData.get(key);

  return typeof value === 'string' ? value : '';
};

/**
 * @description Reads every {@link PlanFormValues} field off a submitted plan
 * form. The result is echoed back to the form on a failed submit so no typed
 * input is lost, and is the single source the actions validate against.
 * @public
 */
export const readPlanFormValues = (formData: FormData): PlanFormValues => {
  return {
    assignee: readString(formData, 'assignee'),
    author: readString(formData, 'author'),
    category: readString(formData, 'category'),
    description: readString(formData, 'description'),
    project: readString(formData, 'project'),
    projectId: readString(formData, 'projectId'),
    status: readString(formData, 'status'),
    summary: readString(formData, 'summary'),
    title: readString(formData, 'title'),
  };
};

/**
 * @description Maps a server-side plan mutation error onto the form field it
 * belongs to, so messages such as "author is required when GITHUB_USER is not
 * set." render against the Author input rather than only as a form banner.
 * @public
 */
export const resolvePlanFormErrorField = (
  message: string,
): PlanFormField | undefined => {
  const normalized = message.toLowerCase();

  if (normalized.includes('author')) {
    return 'author';
  }

  if (normalized.includes('categor')) {
    return 'category';
  }

  if (normalized.includes('title')) {
    return 'title';
  }

  return undefined;
};
