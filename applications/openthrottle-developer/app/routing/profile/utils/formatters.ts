/**
 * @description And example formatter...
 * Build what we need and add them in here as simple testable functions.
 */
export const formatSkillsDate = (date: string) => {
  return format(date, 'MMM d, yyyy h:mm a');
};
