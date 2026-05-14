/**
 * @description And example formatter...
 * Build what we need and add them in here as simple testable functions.
 */
export const formatPullRequestsDate = (date: string) => {
  return format(date, 'MMM d, yyyy h:mm a');
};
