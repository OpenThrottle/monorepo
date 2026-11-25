/**
 * @description `date` as `YYYY-MM-DD` on the calendar of `timeZone` (the `en-CA` locale formats
 * dates that way). The poster compares this with a task's `postOn`.
 * @public
 */
export const getDateInTimeZone = (date: Date, timeZone: string): string => {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).format(date);
};
