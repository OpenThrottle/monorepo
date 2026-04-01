/**
 * @description Formats a prompt type for display (AGENTS -> Agents).
 */
export function formatPromptType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

/**
 * @description Formats a date for display.
 */
export function formatPromptDate(dateString: string): string {
  const date = new Date(dateString);

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
