/**
 * A example formatter...
 * Build what we need and add them in here as simple testable functions.
 */
export const formatDemosDate = (date: string) => {
  return format(date, 'MMM d, yyyy h:mm a');
};
