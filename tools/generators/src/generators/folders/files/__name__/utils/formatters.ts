import { format } from 'date-fns';

/**
 * A example formatter...
 * Build what we need and add them in here as simple testable functions.
 */
export const format<%= namePascal %>Date = (date: string): string => {
  return format(date, 'MMM d, yyyy h:mm a');
};
