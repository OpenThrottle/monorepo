import { format } from 'date-fns';

/**
 * @description And example formatter...
 * Build what we need and add them in here as simple testable functions.
 */
export const formatSettingsDate = (date: string) => {
  return format(date, 'MMM d, yyyy h:mm a');
};
