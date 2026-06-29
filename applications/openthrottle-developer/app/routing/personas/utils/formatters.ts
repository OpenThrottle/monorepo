import { format } from 'date-fns';

/**
 * A example formatter...
 * Build what we need and add them in here as simple testable functions.
 */
export const formatPersonasDate = (date: string): string => {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
};
