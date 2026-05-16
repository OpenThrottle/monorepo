import { format } from 'date-fns';

/**
 * @description And example formatter...
 * Build what we need and add them in here as simple testable functions.
 */
export const formatSkillsDate = (date: string): string => {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
};
