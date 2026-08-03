/**
 * @description Format a nullable ISO timestamp for the schedule tables. Renders an em dash
 * when the value is absent so empty cells stay aligned; otherwise uses the viewer's locale string.
 */
export const formatWhen = (value?: string | null): string =>
  value ? new Date(value).toLocaleString() : '—';
