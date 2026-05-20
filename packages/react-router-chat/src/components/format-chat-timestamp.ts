/**
 * @description Formats an ISO timestamp for display in the thread, or undefined when invalid.
 */
export const formatChatTimestamp = (iso: string): string | undefined => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};
