export interface TaskCardContext {
  readonly display: string;
  readonly title: string | undefined;
}

/**
 * @description Clamps card context text (description or summary) to `limit`
 * characters with an ellipsis. `title` carries the full text for a native
 * tooltip, and only when the text was actually clamped.
 */
export const getTaskCardContext = (
  text: string,
  limit: number,
): TaskCardContext => {
  if (text.length > limit) {
    return { display: `${text.slice(0, limit)}…`, title: text };
  }

  return { display: text, title: undefined };
};
